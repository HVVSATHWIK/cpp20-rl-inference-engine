#pragma once

#include "types.hpp"
#include <array>
#include <vector>
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cassert>

namespace hft::microstructure {

struct OrderNode {
    uint64_t order_id{0};
    uint64_t timestamp_ns{0};
    double price{0.0};
    uint32_t quantity{0};
    core::Side side{core::Side::BUY};
    bool is_agent{false};
    OrderNode* prev{nullptr};
    OrderNode* next{nullptr};
};

// PriceLevel is explicitly aligned to a 64-byte boundary and padded to exactly 64 bytes
// to support cache-line-aware data layout and reduce the risk of false sharing when
// independently accessed objects are placed on separate cache lines.
struct alignas(64) PriceLevel {
    double price{0.0};              // 8 bytes
    uint32_t total_volume{0};       // 4 bytes
    uint32_t order_count{0};        // 4 bytes
    OrderNode* head{nullptr};       // 8 bytes
    OrderNode* tail{nullptr};       // 8 bytes
    uint8_t _padding[32]{};         // 32 bytes explicit padding -> exactly 64 bytes

    [[nodiscard]] bool empty() const noexcept {
        return order_count == 0 || head == nullptr;
    }

    void push_back(OrderNode* node) noexcept {
        node->next = nullptr;
        node->prev = tail;
        if (tail) {
            tail->next = node;
        } else {
            head = node;
        }
        tail = node;
        total_volume += node->quantity;
        order_count++;
    }

    void remove(OrderNode* node) noexcept {
        if (node->prev) node->prev->next = node->next;
        if (node->next) node->next->prev = node->prev;
        if (node == head) head = node->next;
        if (node == tail) tail = node->prev;
        total_volume = (total_volume >= node->quantity) ? total_volume - node->quantity : 0;
        order_count = (order_count > 0) ? order_count - 1 : 0;
        node->next = nullptr;
        node->prev = nullptr;
    }
};

static_assert(sizeof(PriceLevel) == 64, "PriceLevel must be exactly 64 bytes (1 cache line)");
static_assert(alignof(PriceLevel) == 64, "PriceLevel must be aligned to 64 bytes");

// Zero-allocation fixed pool arena for L2 orders and deterministic matching
template <size_t PoolSize = 4096, size_t MaxLevels = 16>
class alignas(64) OrderBook {
private:
    std::array<OrderNode, PoolSize> node_pool_{};
    std::array<uint32_t, PoolSize> free_list_{};
    size_t free_top_{PoolSize};

    std::array<PriceLevel, MaxLevels> bid_levels_{}; // Descending: bid_levels_[0] is best bid
    std::array<PriceLevel, MaxLevels> ask_levels_{}; // Ascending: ask_levels_[0] is best ask
    size_t num_bids_{0};
    size_t num_asks_{0};

public:
    OrderBook() noexcept {
        reset();
    }

    void reset() noexcept {
        free_top_ = PoolSize;
        for (size_t i = 0; i < PoolSize; ++i) {
            free_list_[i] = static_cast<uint32_t>(i);
        }
        num_bids_ = 0;
        num_asks_ = 0;
        for (size_t i = 0; i < MaxLevels; ++i) {
            bid_levels_[i] = PriceLevel{};
            ask_levels_[i] = PriceLevel{};
        }
    }

    [[nodiscard]] size_t available_nodes() const noexcept {
        return free_top_;
    }

    [[nodiscard]] OrderNode* allocate_node() noexcept {
        if (free_top_ == 0) return nullptr; // Fixed capacity pool exhausted
        return &node_pool_[free_list_[--free_top_]];
    }

    void deallocate_node(OrderNode* node) noexcept {
        if (!node) return;
        const auto idx = static_cast<uint32_t>(node - node_pool_.data());
        if (idx < PoolSize && free_top_ < PoolSize) {
            free_list_[free_top_++] = idx;
        }
    }

    // Place a passive limit order into the L2 order book
    bool add_limit_order(uint64_t id, core::Side side, double price, uint32_t qty, 
                         bool is_agent = false, uint64_t timestamp = 0) noexcept {
        if (qty == 0 || price <= 0.0) return false;

        OrderNode* node = allocate_node();
        if (!node) return false; // Pool exhausted

        node->order_id = id;
        node->price = price;
        node->quantity = qty;
        node->side = side;
        node->is_agent = is_agent;
        node->timestamp_ns = timestamp;
        node->prev = nullptr;
        node->next = nullptr;

        if (side == core::Side::BUY) {
            // Find or insert into bid levels (sorted descending)
            for (size_t i = 0; i < num_bids_; ++i) {
                if (std::abs(bid_levels_[i].price - price) < 1e-6) {
                    bid_levels_[i].push_back(node);
                    return true;
                }
                if (price > bid_levels_[i].price) {
                    // Shift lower levels right
                    if (num_bids_ >= MaxLevels) {
                        // Drop deepest level if full
                        deallocate_level_nodes(bid_levels_[MaxLevels - 1]);
                        num_bids_ = MaxLevels - 1;
                    }
                    for (size_t j = num_bids_; j > i; --j) {
                        bid_levels_[j] = bid_levels_[j - 1];
                    }
                    bid_levels_[i] = PriceLevel{};
                    bid_levels_[i].price = price;
                    bid_levels_[i].push_back(node);
                    num_bids_++;
                    return true;
                }
            }
            if (num_bids_ < MaxLevels) {
                bid_levels_[num_bids_] = PriceLevel{};
                bid_levels_[num_bids_].price = price;
                bid_levels_[num_bids_].push_back(node);
                num_bids_++;
                return true;
            }
        } else {
            // Find or insert into ask levels (sorted ascending)
            for (size_t i = 0; i < num_asks_; ++i) {
                if (std::abs(ask_levels_[i].price - price) < 1e-6) {
                    ask_levels_[i].push_back(node);
                    return true;
                }
                if (price < ask_levels_[i].price) {
                    // Shift higher levels right
                    if (num_asks_ >= MaxLevels) {
                        deallocate_level_nodes(ask_levels_[MaxLevels - 1]);
                        num_asks_ = MaxLevels - 1;
                    }
                    for (size_t j = num_asks_; j > i; --j) {
                        ask_levels_[j] = ask_levels_[j - 1];
                    }
                    ask_levels_[i] = PriceLevel{};
                    ask_levels_[i].price = price;
                    ask_levels_[i].push_back(node);
                    num_asks_++;
                    return true;
                }
            }
            if (num_asks_ < MaxLevels) {
                ask_levels_[num_asks_] = PriceLevel{};
                ask_levels_[num_asks_].price = price;
                ask_levels_[num_asks_].push_back(node);
                num_asks_++;
                return true;
            }
        }

        // Could not fit into MaxLevels
        deallocate_node(node);
        return false;
    }

    // Execute an aggressive market order against the top of the opposite book (FIFO priority)
    uint32_t execute_market_order(core::Side side, uint32_t target_qty, 
                                  std::vector<core::ExecutionReport>* fills = nullptr) noexcept {
        uint32_t filled_qty = 0;
        uint32_t remaining = target_qty;

        if (side == core::Side::BUY) {
            // Market BUY matches against Ask levels starting at ask_levels_[0]
            while (remaining > 0 && num_asks_ > 0) {
                PriceLevel& level = ask_levels_[0];
                while (remaining > 0 && level.head != nullptr) {
                    OrderNode* node = level.head;
                    const uint32_t fill = std::min(remaining, node->quantity);
                    remaining -= fill;
                    filled_qty += fill;

                    if (fills) {
                        fills->push_back(core::ExecutionReport{
                            .order_id = node->order_id,
                            .timestamp_ns = node->timestamp_ns,
                            .side = core::Side::BUY,
                            .price = level.price,
                            .quantity = fill,
                            .is_rl_fill = node->is_agent
                        });
                    }

                    if (fill == node->quantity) {
                        // Full fill
                        level.remove(node);
                        deallocate_node(node);
                    } else {
                        // Partial fill
                        node->quantity -= fill;
                        level.total_volume -= fill;
                    }
                }

                if (level.empty()) {
                    // Remove top ask level and shift remaining left
                    for (size_t i = 0; i < num_asks_ - 1; ++i) {
                        ask_levels_[i] = ask_levels_[i + 1];
                    }
                    ask_levels_[num_asks_ - 1] = PriceLevel{};
                    num_asks_--;
                }
            }
        } else {
            // Market SELL matches against Bid levels starting at bid_levels_[0]
            while (remaining > 0 && num_bids_ > 0) {
                PriceLevel& level = bid_levels_[0];
                while (remaining > 0 && level.head != nullptr) {
                    OrderNode* node = level.head;
                    const uint32_t fill = std::min(remaining, node->quantity);
                    remaining -= fill;
                    filled_qty += fill;

                    if (fills) {
                        fills->push_back(core::ExecutionReport{
                            .order_id = node->order_id,
                            .timestamp_ns = node->timestamp_ns,
                            .side = core::Side::SELL,
                            .price = level.price,
                            .quantity = fill,
                            .is_rl_fill = node->is_agent
                        });
                    }

                    if (fill == node->quantity) {
                        level.remove(node);
                        deallocate_node(node);
                    } else {
                        node->quantity -= fill;
                        level.total_volume -= fill;
                    }
                }

                if (level.empty()) {
                    for (size_t i = 0; i < num_bids_ - 1; ++i) {
                        bid_levels_[i] = bid_levels_[i + 1];
                    }
                    bid_levels_[num_bids_ - 1] = PriceLevel{};
                    num_bids_--;
                }
            }
        }

        return filled_qty;
    }

    // Cancel order by ID
    bool cancel_order(uint64_t order_id) noexcept {
        // Search bids
        for (size_t i = 0; i < num_bids_; ++i) {
            OrderNode* curr = bid_levels_[i].head;
            while (curr) {
                if (curr->order_id == order_id) {
                    bid_levels_[i].remove(curr);
                    deallocate_node(curr);
                    if (bid_levels_[i].empty()) {
                        compact_bids(i);
                    }
                    return true;
                }
                curr = curr->next;
            }
        }
        // Search asks
        for (size_t i = 0; i < num_asks_; ++i) {
            OrderNode* curr = ask_levels_[i].head;
            while (curr) {
                if (curr->order_id == order_id) {
                    ask_levels_[i].remove(curr);
                    deallocate_node(curr);
                    if (ask_levels_[i].empty()) {
                        compact_asks(i);
                    }
                    return true;
                }
                curr = curr->next;
            }
        }
        return false;
    }

    [[nodiscard]] double best_bid() const noexcept {
        return (num_bids_ > 0) ? bid_levels_[0].price : 0.0;
    }

    [[nodiscard]] double best_ask() const noexcept {
        return (num_asks_ > 0) ? ask_levels_[0].price : 0.0;
    }

    [[nodiscard]] double mid_price() const noexcept {
        if (num_bids_ == 0 && num_asks_ == 0) return 0.0;
        if (num_bids_ == 0) return ask_levels_[0].price;
        if (num_asks_ == 0) return bid_levels_[0].price;
        return (bid_levels_[0].price + ask_levels_[0].price) * 0.5;
    }

    [[nodiscard]] double spread() const noexcept {
        if (num_bids_ == 0 || num_asks_ == 0) return 0.0;
        return ask_levels_[0].price - bid_levels_[0].price;
    }

    [[nodiscard]] double micro_price() const noexcept {
        if (num_bids_ == 0 || num_asks_ == 0) return mid_price();
        const double pb = bid_levels_[0].price;
        const double pa = ask_levels_[0].price;
        const double qb = static_cast<double>(bid_levels_[0].total_volume);
        const double qa = static_cast<double>(ask_levels_[0].total_volume);
        const double sum = qb + qa;
        if (sum <= 0.0) return (pb + pa) * 0.5;
        return (pb * qa + pa * qb) / sum;
    }

    [[nodiscard]] double order_flow_imbalance() const noexcept {
        if (num_bids_ == 0 || num_asks_ == 0) return 0.0;
        const double qb = static_cast<double>(bid_levels_[0].total_volume);
        const double qa = static_cast<double>(ask_levels_[0].total_volume);
        const double sum = qb + qa;
        return (sum > 0.0) ? (qb - qa) / sum : 0.0;
    }

    [[nodiscard]] size_t num_bid_levels() const noexcept { return num_bids_; }
    [[nodiscard]] size_t num_ask_levels() const noexcept { return num_asks_; }

    [[nodiscard]] const PriceLevel* bid_level(size_t index) const noexcept {
        return (index < num_bids_) ? &bid_levels_[index] : nullptr;
    }

    [[nodiscard]] const PriceLevel* ask_level(size_t index) const noexcept {
        return (index < num_asks_) ? &ask_levels_[index] : nullptr;
    }

    // Verify mathematical and structural data structure invariants
    [[nodiscard]] bool verify_invariants() const noexcept {
        // Verify bids
        for (size_t i = 0; i < num_bids_; ++i) {
            const auto& lvl = bid_levels_[i];
            if (i + 1 < num_bids_ && lvl.price <= bid_levels_[i + 1].price) return false; // Must be strictly descending
            uint32_t counted_vol = 0;
            uint32_t counted_orders = 0;
            OrderNode* curr = lvl.head;
            while (curr) {
                counted_vol += curr->quantity;
                counted_orders++;
                curr = curr->next;
            }
            if (counted_vol != lvl.total_volume || counted_orders != lvl.order_count) return false;
        }

        // Verify asks
        for (size_t i = 0; i < num_asks_; ++i) {
            const auto& lvl = ask_levels_[i];
            if (i + 1 < num_asks_ && lvl.price >= ask_levels_[i + 1].price) return false; // Must be strictly ascending
            uint32_t counted_vol = 0;
            uint32_t counted_orders = 0;
            OrderNode* curr = lvl.head;
            while (curr) {
                counted_vol += curr->quantity;
                counted_orders++;
                curr = curr->next;
            }
            if (counted_vol != lvl.total_volume || counted_orders != lvl.order_count) return false;
        }

        return true;
    }

private:
    void compact_bids(size_t empty_idx) noexcept {
        for (size_t i = empty_idx; i < num_bids_ - 1; ++i) {
            bid_levels_[i] = bid_levels_[i + 1];
        }
        bid_levels_[num_bids_ - 1] = PriceLevel{};
        num_bids_--;
    }

    void compact_asks(size_t empty_idx) noexcept {
        for (size_t i = empty_idx; i < num_asks_ - 1; ++i) {
            ask_levels_[i] = ask_levels_[i + 1];
        }
        ask_levels_[num_asks_ - 1] = PriceLevel{};
        num_asks_--;
    }

    void deallocate_level_nodes(PriceLevel& level) noexcept {
        OrderNode* curr = level.head;
        while (curr) {
            OrderNode* next = curr->next;
            deallocate_node(curr);
            curr = next;
        }
        level = PriceLevel{};
    }
};

} // namespace hft::microstructure
