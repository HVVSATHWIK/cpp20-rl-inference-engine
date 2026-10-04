CXX ?= g++
BASE_CXXFLAGS = -std=c++20 -O3 -Wall -Wextra -Wpedantic -Iinclude -pthread

# Optional host optimization: invoke with `make MARCH_NATIVE=1`
ifeq ($(MARCH_NATIVE), 1)
    CXXFLAGS ?= $(BASE_CXXFLAGS) -march=native
else
    CXXFLAGS ?= $(BASE_CXXFLAGS)
endif

BENCHMARK_TARGET = hft_benchmark
TEST_TARGET = hft_test

HEADERS = include/types.hpp include/order_book.hpp include/neural_policy.hpp include/market_simulator.hpp

.PHONY: all test benchmark sanitize clean

all: $(BENCHMARK_TARGET) $(TEST_TARGET)

$(BENCHMARK_TARGET): src/main.cpp $(HEADERS)
	$(CXX) $(CXXFLAGS) -o $(BENCHMARK_TARGET) src/main.cpp

$(TEST_TARGET): tests/test_engine.cpp $(HEADERS)
	$(CXX) $(CXXFLAGS) -o $(TEST_TARGET) tests/test_engine.cpp

test: $(TEST_TARGET)
	./$(TEST_TARGET)

benchmark: $(BENCHMARK_TARGET)
	./$(BENCHMARK_TARGET)

sanitize: CXXFLAGS = $(BASE_CXXFLAGS) -fsanitize=address,undefined -g
sanitize: clean $(TEST_TARGET)
	./$(TEST_TARGET)

clean:
	rm -f $(BENCHMARK_TARGET) $(TEST_TARGET)
