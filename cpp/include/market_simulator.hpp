#pragma once

#include "order_book.hpp"
#include "types.hpp"
#include <random>
#include <cmath>
#include <vector>

namespace hft::sim {

struct MarketMetrics {
    uint64_t tick_count{0};
    double mid_price{150.0};
    double vwap{150.0};
    double cumulative_volume{0.0};
    double arrival_price_s0{150.0};
    double implementation_shortfall{0.0};
    double slippage_bps{0.0};
    double twap_advantage_bps{0.0};
    uint32_t filled_shares{0};
    uint32_t target_shares{100};
};

class alignas(64) MarketSimulator {
private:
    double current_price_{150.0};
    double arrival_price_{150.0};
    uint64_t tick_{0};
    double total_cost_{0.0};
    double twap_price_sum_{0.0};
    uint32_t filled_shares_{0};
    uint32_t target_shares_{100};
    core::Side execution_side_{core::Side::BUY};

    // Merton Jump-Diffusion parameters
    double drift_{0.0001};
    double volatility_{0.015};
    double jump_intensity_{0.05};
    double jump_mean_{0.0};
    double jump_std_{0.02};

    // Deterministic Mersenne Twister engine
    uint64_t initial_seed_{42};
    std::mt19937_64 rng_{42};
    std::normal_distribution<double> norm_dist_{0.0, 1.0};
    std::uniform_real_distribution<double> uniform_dist_{0.0, 1.0};
    std::poisson_distribution<uint32_t> poisson_qty_{15};

public:
    MarketSimulator(double initial_price = 150.0, uint64_t seed = 42, 
                    core::Side side = core::Side::BUY, uint32_t target_qty = 100) noexcept
        : current_price_(initial_price), 
          arrival_price_(initial_price), 
          target_shares_(target_qty),
          execution_side_(side),
          initial_seed_(seed),
          rng_(seed) {}

    void reset(double initial_price = 150.0, uint64_t seed = 42) noexcept {
        current_price_ = initial_price;
        arrival_price_ = initial_price;
        tick_ = 0;
        total_cost_ = 0.0;
        twap_price_sum_ = 0.0;
        filled_shares_ = 0;
        initial_seed_ = seed;
        rng_.seed(seed);
    }

    // Step Merton Jump-Diffusion stochastic price process (dt discrete increment)
    double step_merton_jump_diffusion(double dt = 0.001) noexcept {
        tick_++;
        const double dW = std::sqrt(dt) * norm_dist_(rng_);
        double jump = 0.0;
        if (uniform_dist_(rng_) < jump_intensity_ * dt) {
            jump = jump_mean_ + jump_std_ * norm_dist_(rng_);
        }
        const double log_ret = (drift_ - 0.5 * volatility_ * volatility_) * dt 
                             + volatility_ * dW 
                             + jump;
        current_price_ *= std::exp(log_ret);
        twap_price_sum_ += current_price_;
        return current_price_;
    }

    // Replenish Poisson L2 liquidity around current price into the OrderBook
    template <size_t P, size_t L>
    void replenish_book(microstructure::OrderBook<P, L>& book, double tick_size = 0.05) noexcept {
        const double rounded_mid = std::round(current_price_ / tick_size) * tick_size;
        
        // Add 5 bid levels below mid
        for (int i = 1; i <= 5; ++i) {
            const double price = rounded_mid - i * tick_size;
            const uint32_t qty = std::max(5u, poisson_qty_(rng_));
            const uint64_t oid = tick_ * 1000 + i;
            book.add_limit_order(oid, core::Side::BUY, price, qty);
        }

        // Add 5 ask levels above mid
        for (int i = 1; i <= 5; ++i) {
            const double price = rounded_mid + i * tick_size;
            const uint32_t qty = std::max(5u, poisson_qty_(rng_));
            const uint64_t oid = tick_ * 1000 + 10 + i;
            book.add_limit_order(oid, core::Side::SELL, price, qty);
        }
    }

    void record_execution(double price, uint32_t qty) noexcept {
        total_cost_ += price * qty;
        filled_shares_ += qty;
    }

    // Perold (1988) Implementation Shortfall (IS)
    // For BUY:  IS = Total Actual Cost - Arrival Benchmark (S0 * Q)
    //           IS < 0 implies Execution Savings (Favorable Alpha)
    //           IS > 0 implies Slippage (Adverse Execution Cost)
    // For SELL: IS = Arrival Benchmark (S0 * Q) - Total Actual Proceeds
    //           IS < 0 implies Execution Savings (Sold higher than S0)
    //           IS > 0 implies Slippage (Sold lower than S0)
    [[nodiscard]] double implementation_shortfall() const noexcept {
        if (filled_shares_ == 0) return 0.0;
        const double benchmark = arrival_price_ * filled_shares_;
        if (execution_side_ == core::Side::BUY) {
            return total_cost_ - benchmark;
        } else {
            return benchmark - total_cost_;
        }
    }

    // Slippage in Basis Points (bps) vs Arrival Price S0
    [[nodiscard]] double slippage_bps() const noexcept {
        if (filled_shares_ == 0 || arrival_price_ <= 0.0) return 0.0;
        const double is = implementation_shortfall();
        const double benchmark = arrival_price_ * filled_shares_;
        return (is / benchmark) * 10000.0;
    }

    // TWAP Benchmark Advantage in bps: (TWAP_Price - Avg_Exec_Price) / TWAP_Price * 10000 (for BUY)
    [[nodiscard]] double twap_advantage_bps() const noexcept {
        if (filled_shares_ == 0 || tick_ == 0) return 0.0;
        const double twap = twap_price_sum_ / static_cast<double>(tick_);
        const double avg_exec = total_cost_ / static_cast<double>(filled_shares_);
        if (execution_side_ == core::Side::BUY) {
            return ((twap - avg_exec) / twap) * 10000.0;
        } else {
            return ((avg_exec - twap) / twap) * 10000.0;
        }
    }

    [[nodiscard]] double current_price() const noexcept { return current_price_; }
    [[nodiscard]] double arrival_price() const noexcept { return arrival_price_; }
    [[nodiscard]] uint64_t tick() const noexcept { return tick_; }
    [[nodiscard]] uint32_t filled_shares() const noexcept { return filled_shares_; }
    [[nodiscard]] uint32_t target_shares() const noexcept { return target_shares_; }
};

} // namespace hft::sim
