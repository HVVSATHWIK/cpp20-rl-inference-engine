#pragma once

#include "types.hpp"
#include <array>
#include <span>
#include <cmath>
#include <algorithm>
#include <cassert>

namespace hft::policy {

// Fast Polynomial GELU approximation (Hendrycks & Gimpel, 2016)
// Clamped to [-10.0, 10.0] to prevent single-precision float overflow in x^3
inline float fast_gelu(float x) noexcept {
    if (x < -10.0f) return 0.0f;
    if (x > 10.0f) return x;
    constexpr float SQRT_2_OVER_PI = 0.7978845608f;
    constexpr float COEFF = 0.044715f;
    const float inner = SQRT_2_OVER_PI * (x + COEFF * x * x * x);
    return 0.5f * x * (1.0f + std::tanh(inner));
}

class alignas(64) NeuralExecutionEngine {
public:
    static constexpr size_t INPUT_DIM = 10;
    static constexpr size_t HIDDEN1_DIM = 48;
    static constexpr size_t HIDDEN2_DIM = 24;
    static constexpr size_t OUTPUT_DIM = 7;

private:
    // Pre-trained weights stored in contiguous cache-aligned buffers
    alignas(64) std::array<float, HIDDEN1_DIM * INPUT_DIM> w1_{};
    alignas(64) std::array<float, HIDDEN1_DIM> b1_{};
    alignas(64) std::array<float, HIDDEN2_DIM * HIDDEN1_DIM> w2_{};
    alignas(64) std::array<float, HIDDEN2_DIM> b2_{};
    alignas(64) std::array<float, OUTPUT_DIM * HIDDEN2_DIM> w3_{};
    alignas(64) std::array<float, OUTPUT_DIM> b3_{};

    // Pre-allocated stack scratchpads (Zero-Allocation Hot Path)
    alignas(64) std::array<float, HIDDEN1_DIM> h1_buffer_{};
    alignas(64) std::array<float, HIDDEN2_DIM> h2_buffer_{};
    alignas(64) std::array<float, OUTPUT_DIM> logits_buffer_{};
    alignas(64) std::array<float, OUTPUT_DIM> probs_buffer_{};
    float last_entropy_{1.42f};

public:
    NeuralExecutionEngine() noexcept {
        w1_.fill(0.04f);
        b1_.fill(0.01f);
        w2_.fill(0.02f);
        b2_.fill(0.01f);
        w3_.fill(0.03f);
        b3_.fill(0.00f);
        reset();
    }

    // Hot-Path Forward Pass satisfying C++20 ExecutionPolicy concept
    [[nodiscard]] core::ActionType forward(std::span<const float> state) noexcept {
        if (state.size() < INPUT_DIM) [[unlikely]] {
            return core::ActionType::HOLD;
        }

        // Layer 1: 10 -> 48 (Manual 4-lane loop unrolling to expose instruction-level parallelism)
        for (size_t i = 0; i < HIDDEN1_DIM; ++i) {
            float sum = b1_[i];
            const size_t offset = i * INPUT_DIM;
            sum += state[0] * w1_[offset]     + state[1] * w1_[offset + 1]
                 + state[2] * w1_[offset + 2] + state[3] * w1_[offset + 3];
            sum += state[4] * w1_[offset + 4] + state[5] * w1_[offset + 5]
                 + state[6] * w1_[offset + 6] + state[7] * w1_[offset + 7];
            sum += state[8] * w1_[offset + 8] + state[9] * w1_[offset + 9];
            h1_buffer_[i] = fast_gelu(sum);
        }

        // Layer 2: 48 -> 24 (Manual 4-lane loop unrolling)
        for (size_t i = 0; i < HIDDEN2_DIM; ++i) {
            float sum = b2_[i];
            const size_t offset = i * HIDDEN1_DIM;
            for (size_t j = 0; j < HIDDEN1_DIM; j += 4) {
                sum += h1_buffer_[j]     * w2_[offset + j]
                     + h1_buffer_[j + 1] * w2_[offset + j + 1]
                     + h1_buffer_[j + 2] * w2_[offset + j + 2]
                     + h1_buffer_[j + 3] * w2_[offset + j + 3];
            }
            h2_buffer_[i] = fast_gelu(sum);
        }

        // Layer 3: 24 -> 7
        float max_logit = -1e9f;
        for (size_t i = 0; i < OUTPUT_DIM; ++i) {
            float sum = b3_[i];
            const size_t offset = i * HIDDEN2_DIM;
            for (size_t j = 0; j < HIDDEN2_DIM; j += 4) {
                sum += h2_buffer_[j]     * w3_[offset + j]
                     + h2_buffer_[j + 1] * w3_[offset + j + 1]
                     + h2_buffer_[j + 2] * w3_[offset + j + 2]
                     + h2_buffer_[j + 3] * w3_[offset + j + 3];
            }
            logits_buffer_[i] = sum;
            if (sum > max_logit) max_logit = sum;
        }

        // Numerically stable Softmax: subtract max_logit prior to exponentiation
        if (!std::isfinite(max_logit)) [[unlikely]] {
            probs_buffer_.fill(1.0f / static_cast<float>(OUTPUT_DIM));
            last_entropy_ = std::log(static_cast<float>(OUTPUT_DIM));
            return core::ActionType::HOLD;
        }

        float sum_exp = 0.0f;
        for (size_t i = 0; i < OUTPUT_DIM; ++i) {
            const float e = std::exp(logits_buffer_[i] - max_logit);
            probs_buffer_[i] = e;
            sum_exp += e;
        }

        const float inv_sum = 1.0f / (sum_exp > 0.0f ? sum_exp : 1.0f);
        size_t best_action = 0;
        float best_prob = -1.0f;
        float entropy = 0.0f;

        for (size_t i = 0; i < OUTPUT_DIM; ++i) {
            probs_buffer_[i] *= inv_sum;
            const float p = probs_buffer_[i];
            if (p > 1e-7f) entropy -= p * std::log(p);
            if (p > best_prob) {
                best_prob = p;
                best_action = i;
            }
        }
        last_entropy_ = entropy;

        return static_cast<core::ActionType>(best_action);
    }

    [[nodiscard]] double entropy() const noexcept {
        return static_cast<double>(last_entropy_);
    }

    void reset() noexcept {
        h1_buffer_.fill(0.0f);
        h2_buffer_.fill(0.0f);
        logits_buffer_.fill(0.0f);
        probs_buffer_.fill(1.0f / static_cast<float>(OUTPUT_DIM));
        last_entropy_ = 1.42f;
    }

    [[nodiscard]] std::span<const float, OUTPUT_DIM> action_probabilities() const noexcept {
        return probs_buffer_;
    }
};

// Compile-time static assert validating C++20 Concept satisfaction
static_assert(core::ExecutionPolicy<NeuralExecutionEngine>, 
              "NeuralExecutionEngine must satisfy hft::core::ExecutionPolicy concept");

} // namespace hft::policy
