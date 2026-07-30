#!/bin/bash
# Stage 1: native llvm-tblgen + clang-tblgen (needed to cross-build LLVM to WASM)
set -e
cmake -G Ninja -S llvm/llvm -B build-native \
  -DCMAKE_BUILD_TYPE=Release \
  -DLLVM_ENABLE_PROJECTS="clang" \
  -DLLVM_TARGETS_TO_BUILD="AVR" \
  -DLLVM_INCLUDE_TESTS=OFF -DLLVM_INCLUDE_EXAMPLES=OFF -DLLVM_INCLUDE_BENCHMARKS=OFF
ninja -C build-native llvm-tblgen clang-tblgen
