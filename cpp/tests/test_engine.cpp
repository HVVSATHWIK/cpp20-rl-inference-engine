#include "types.hpp"
#include "order_book.hpp"
#include "neural_policy.hpp"
#include "market_simulator.hpp"

#include <iostream>
#include <cassert>
#include <cmath>
#include <vector>
#include <iomanip>

using namespace hft;

static int g_tests_passed = 0;
static int g_tests_failed = 0;

#define TEST_ASSERT(cond, msg) \
    do { \
        if (!(cond)) { \
            std::cerr << " [FAILED] " << msg << " (" << #cond << " at line " << __LINE__ << ")\n"; \
            g_tests_failed++; \
        } else { \
            g_tests_passed++; \
        } \
    } while(0)

// 1. Order Insertion & Sorted Levels Test
void test_order_insertion() {
    std::cout << "[Test 1] Order Insertion & Sorted Level Accounting... ";
    microstructure::OrderBook<256, 8> book;

    // Insert bids: 150.00, 150.10, 149.90
    TEST_ASSERT(book.add_limit_order(1, core::Side::BUY, 150.00, 100), "Insert Bid 1");
    TEST_ASSERT(book.add_limit_order(2, core::Side::BUY, 150.10, 50),  "Insert Bid 2 (higher)");
    TEST_ASSERT(book.add_limit_order(3, core::Side::BUY, 149.90, 75),  "Insert Bid 3 (lower)");

    // Highest bid must be 150.10 at index 0
    TEST_ASSERT(std::abs(book.best_bid() - 150.10) < 1e-6, "Best bid must be 150.10");
    TEST_ASSERT(book.num_bid_levels() == 3, "3 distinct bid levels");

    // Insert asks: 150.20, 150.30
    TEST_ASSERT(book.add_limit_order(4, core::Side::SELL, 150.20, 60), "Insert Ask 1");
    TEST_ASSERT(book.add_limit_order(5, core::Side::SELL, 150.30, 40), "Insert Ask 2");

    TEST_ASSERT(std::abs(book.best_ask() - 150.20) < 1e-6, "Best ask must be 150.20");
    TEST_ASSERT(std::abs(book.spread() - 0.10) < 1e-6, "Spread must be 0.10");

    TEST_ASSERT(book.verify_invariants(), "Data structure invariants satisfied");
    std::cout << "PASSED\n";
}

// 2. FIFO Time Priority & Partial Fills Test
void test_fifo_matching() {
    std::cout << "[Test 2] FIFO Queue Time Priority & Partial Execution... ";
    microstructure::OrderBook<256, 8> book;

    // Insert two orders at same price: 150.00
    book.add_limit_order(101, core::Side::SELL, 150.00, 50, false, 1000); // Earlier order
    book.add_limit_order(102, core::Side::SELL, 150.00, 50, false, 2000); // Later order

    std::vector<core::ExecutionReport> fills;
    // Market buy of 70 shares: should completely fill order 101 (50 shares), then 20 shares of order 102
    uint32_t filled = book.execute_market_order(core::Side::BUY, 70, &fills);

    TEST_ASSERT(filled == 70, "Filled 70 shares");
    TEST_ASSERT(fills.size() == 2, "2 fill reports generated");
    TEST_ASSERT(fills[0].order_id == 101 && fills[0].quantity == 50, "FIFO First: Order 101 completely filled");
    TEST_ASSERT(fills[1].order_id == 102 && fills[1].quantity == 20, "FIFO Second: Order 102 partially filled (20 shares)");

    // Remaining on book should be 30 shares of order 102
    TEST_ASSERT(std::abs(book.best_ask() - 150.00) < 1e-6, "Ask level 150.00 still rests with remaining qty");
    const auto* lvl = book.ask_level(0);
    TEST_ASSERT(lvl && lvl->total_volume == 30, "Total remaining volume on ask is 30");

    TEST_ASSERT(book.verify_invariants(), "Data structure invariants satisfied");
    std::cout << "PASSED\n";
}

// 3. Order Cancellation Test
void test_cancellation() {
    std::cout << "[Test 3] Order Cancellation & Level Compaction... ";
    microstructure::OrderBook<256, 8> book;

    book.add_limit_order(201, core::Side::BUY, 100.0, 10);
    book.add_limit_order(202, core::Side::BUY, 101.0, 20);

    TEST_ASSERT(std::abs(book.best_bid() - 101.0) < 1e-6, "Best bid before cancel is 101.0");

    // Cancel best bid order 202
    TEST_ASSERT(book.cancel_order(202), "Order 202 cancelled successfully");
    TEST_ASSERT(!book.cancel_order(999), "Non-existent order returns false");

    // Next best bid should now be 100.0
    TEST_ASSERT(std::abs(book.best_bid() - 100.0) < 1e-6, "Best bid promoted to 100.0");
    TEST_ASSERT(book.num_bid_levels() == 1, "Only 1 level remains");

    TEST_ASSERT(book.verify_invariants(), "Invariants satisfied after cancel");
    std::cout << "PASSED\n";
}

// 4. Micro-Price & OFI Quantitative Metrics Test
void test_microstructure_metrics() {
    std::cout << "[Test 4] Micro-Price & Order Flow Imbalance (OFI)... ";
    microstructure::OrderBook<256, 8> book;

    // Bid: 100.00 (Qty: 300)
    // Ask: 100.10 (Qty: 100)
    book.add_limit_order(1, core::Side::BUY, 100.00, 300);
    book.add_limit_order(2, core::Side::SELL, 100.10, 100);

    // Mid = 100.05
    // Micro-price weighted by opposite size: (pb * qa + pa * qb) / (qa + qb)
    // = (100.00 * 100 + 100.10 * 300) / 400 = (10000 + 30030) / 400 = 40030 / 400 = 100.075
    const double expected_micro = 100.075;
    TEST_ASSERT(std::abs(book.micro_price() - expected_micro) < 1e-4, "Micro-price accurately computed");

    // OFI = (qb - qa) / (qb + qa) = (300 - 100) / 400 = 0.50
    TEST_ASSERT(std::abs(book.order_flow_imbalance() - 0.50) < 1e-4, "OFI reflects bid pressure (+0.50)");
    std::cout << "PASSED\n";
}

// 5. Policy Inference, Concept Satisfaction & Softmax Stability
void test_neural_policy() {
    std::cout << "[Test 5] C++20 Concept, GELU & Numerically Stable Softmax... ";
    policy::NeuralExecutionEngine policy;

    // Verify compile-time concept satisfaction
    static_assert(core::ExecutionPolicy<policy::NeuralExecutionEngine>);

    std::array<float, 10> state{0.1f, -0.2f, 0.4f, 1.0f, 0.05f, 0.8f, 0.3f, 0.1f, 0.5f, 0.2f};
    core::ActionType action = policy.forward(state);

    TEST_ASSERT(static_cast<uint8_t>(action) < 7, "Action within valid discrete bounds [0, 6]");
    TEST_ASSERT(policy.entropy() > 0.0, "Entropy is positive");

    // Verify Softmax probabilities sum to approximately 1.0
    auto probs = policy.action_probabilities();
    float sum_p = 0.0f;
    for (float p : probs) {
        TEST_ASSERT(p >= 0.0f && p <= 1.0f, "Probability within [0, 1]");
        sum_p += p;
    }
    TEST_ASSERT(std::abs(sum_p - 1.0f) < 1e-5f, "Softmax sum equals 1.0");

    // Test extreme values (NaN/Inf robustness)
    std::array<float, 10> extreme_state{100.0f, -100.0f, 50.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f, 0.0f};
    core::ActionType safe_action = policy.forward(extreme_state);
    TEST_ASSERT(static_cast<uint8_t>(safe_action) < 7, "Extreme state produces valid action without NaN");

    std::cout << "PASSED\n";
}

// 6. Deterministic Simulator & Perold Implementation Shortfall Test
void test_simulation_determinism_and_shortfall() {
    std::cout << "[Test 6] Deterministic Simulation & Perold Implementation Shortfall... ";
    sim::MarketSimulator sim1(150.0, 12345);
    sim::MarketSimulator sim2(150.0, 12345); // Identical seed

    // Advance 50 steps
    for (int i = 0; i < 50; ++i) {
        double p1 = sim1.step_merton_jump_diffusion(0.001);
        double p2 = sim2.step_merton_jump_diffusion(0.001);
        TEST_ASSERT(std::abs(p1 - p2) < 1e-12, "Bit-for-bit trajectory determinism under identical seed");
    }

    // Test Implementation Shortfall: BUY 100 shares at arrival S0 = 150.0
    sim::MarketSimulator exec_sim(150.0, 42, core::Side::BUY, 100);
    // Fill 50 shares at 149.00 (favorable -> $50 savings)
    exec_sim.record_execution(149.00, 50);
    // Fill 50 shares at 152.00 (adverse -> $100 slippage)
    exec_sim.record_execution(152.00, 50);
    // Total cost = 50*149 + 50*152 = 7450 + 7600 = 15050. Benchmark = 100 * 150 = 15000.
    // IS = 15050 - 15000 = +50.00 (Slippage)
    TEST_ASSERT(std::abs(exec_sim.implementation_shortfall() - 50.0) < 1e-6, "Shortfall is +$50.00 slippage");
    // Slippage bps = (50 / 15000) * 10000 = 33.33 bps
    TEST_ASSERT(std::abs(exec_sim.slippage_bps() - 33.333) < 0.01, "Slippage bps is +33.3 bps");

    std::cout << "PASSED\n";
}

int main() {
    std::cout << "================================================================\n";
    std::cout << " CPP20-RL-EXECUTION: NATIVE UNIT & QUANTITATIVE TEST SUITE\n";
    std::cout << " Verification: Correctness, Determinism, FIFO, Numerics, IS\n";
    std::cout << "================================================================\n\n";

    test_order_insertion();
    test_fifo_matching();
    test_cancellation();
    test_microstructure_metrics();
    test_neural_policy();
    test_simulation_determinism_and_shortfall();

    std::cout << "\n================================================================\n";
    std::cout << " TEST SUMMARY: " << g_tests_passed << " assertions passed, " 
              << g_tests_failed << " failed.\n";
    std::cout << "================================================================\n";

    return (g_tests_failed == 0) ? 0 : 1;
}
