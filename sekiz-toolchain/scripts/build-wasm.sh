#!/bin/bash
# Stage 2: clang + lld compiled TO WebAssembly, AVR backend only.
set -e
NATIVE=$PWD/build-native
EMFLAGS="-sALLOW_MEMORY_GROWTH=1 -sMAXIMUM_MEMORY=4GB -sSTACK_SIZE=8MB \
 -sMODULARIZE=1 -sEXPORT_NAME=createModule -sINVOKE_RUN=0 -sEXIT_RUNTIME=1 \
 -sEXPORTED_RUNTIME_METHODS=FS,callMain -sENVIRONMENT=web,worker,node -sWASM_BIGINT"
emcmake cmake -G Ninja -S llvm/llvm -B build-wasm \
  -DCMAKE_BUILD_TYPE=MinSizeRel \
  -DLLVM_ENABLE_PROJECTS="clang;lld" \
  -DLLVM_TARGETS_TO_BUILD="AVR" \
  -DLLVM_DEFAULT_TARGET_TRIPLE=avr \
  -DLLVM_TABLEGEN=$NATIVE/bin/llvm-tblgen \
  -DCLANG_TABLEGEN=$NATIVE/bin/clang-tblgen \
  -DLLVM_ENABLE_THREADS=OFF -DLLVM_ENABLE_PIC=OFF \
  -DLLVM_ENABLE_ZLIB=OFF -DLLVM_ENABLE_ZSTD=OFF -DLLVM_ENABLE_LIBXML2=OFF \
  -DLLVM_ENABLE_TERMINFO=OFF -DLLVM_ENABLE_PLUGINS=OFF -DCLANG_PLUGIN_SUPPORT=OFF \
  -DLLVM_INCLUDE_TESTS=OFF -DLLVM_INCLUDE_EXAMPLES=OFF -DLLVM_INCLUDE_BENCHMARKS=OFF \
  -DLLVM_BUILD_LLVM_DYLIB=OFF -DLLVM_LINK_LLVM_DYLIB=OFF \
  -DCMAKE_EXE_LINKER_FLAGS="$EMFLAGS"
ninja -C build-wasm clang lld
mkdir -p dist
# emscripten emits clang-19.js/.wasm and lld.js/.wasm
cp build-wasm/bin/clang-19.js  dist/clang.js  2>/dev/null || cp build-wasm/bin/clang.js dist/clang.js
cp build-wasm/bin/clang-19.wasm dist/clang.wasm 2>/dev/null || cp build-wasm/bin/clang.wasm dist/clang.wasm
cp build-wasm/bin/lld.js dist/lld.js
cp build-wasm/bin/lld.wasm dist/lld.wasm
ls -la dist/
