#pragma once

#include <cstdint>
#include <cstddef>
#include <string_view>
#include <array>
#include <span>
#include <concepts>

namespace hft::core {

enum class Side : uint8_t {
    BUY = 0,
    SELL = 1
};

enum class ActionType : uint8_t {
    HOLD = 0,
    PASSIVE_POST_BEST = 1,
    JOIN_QUEUE_LEVEL1 = 2,
    JOIN_QUEUE_LEVEL2 = 3,
    AGGRESSIVE_CROSS = 4,
    TWAP_SCHEDULE_SLICE = 5,
    CANCEL_OPEN_ORDERS = 6
};

struct ExecutionReport {
    uint64_t order_id{0};
    uint64_t timestamp_ns{0};
    Side side{Side::BUY};
    double price{0.0};
    uint32_t quantity{0};
    bool is_rl_fill{false};
};

// C++20 Concept enforcing static polymorphism for RL policies
template <typename T>
concept ExecutionPolicy = requires(T policy, std::span<const float> state) {
    { policy.forward(state) } -> std::same_as<ActionType>;
    { policy.entropy() } -> std::floating_point;
    { policy.reset() } -> std::same_as<void>;
};

} // namespace hft::core
