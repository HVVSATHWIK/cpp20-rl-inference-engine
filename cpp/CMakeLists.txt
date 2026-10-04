cmake_minimum_required(VERSION 3.20)
project(cpp20_rl_execution LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Build Options
option(ENABLE_NATIVE_OPT "Enable -march=native host CPU optimization" OFF)
option(ENABLE_SANITIZERS "Enable AddressSanitizer and UndefinedBehaviorSanitizer" OFF)

# Compiler Warnings and Flags
if (CMAKE_CXX_COMPILER_ID MATCHES "Clang|GNU")
    add_compile_options(
        -O3
        -Wall
        -Wextra
        -Wpedantic
        -Wconversion
        -Wno-unused-parameter
    )
    if (ENABLE_NATIVE_OPT)
        add_compile_options(-march=native)
    endif()
    if (ENABLE_SANITIZERS)
        add_compile_options(-fsanitize=address,undefined -fno-omit-frame-pointer -g)
        add_link_options(-fsanitize=address,undefined)
    endif()
endif()

include_directories(include)

# 1. Native High-Resolution Benchmark Executable
add_executable(hft_benchmark src/main.cpp)

# 2. Comprehensive Unit & Invariant Test Suite Executable
add_executable(hft_test tests/test_engine.cpp)
enable_testing()
add_test(NAME EngineUnitTests COMMAND hft_test)
