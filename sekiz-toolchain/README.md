# sekiz-toolchain

Builds **clang + lld as WebAssembly** (AVR backend only) so that Arduino
sketches can be compiled entirely in the browser — the missing piece for a
fully client-side Arduino simulator ([Sekiz](https://github.com/senolgulgonul)).

The toolchain recipe was proven natively on 2026-07-30: the **unmodified**
official ArduinoCore-avr, compiled by clang 18 and linked by ld.lld, runs the
canonical Blink.ino on AVR8js with delay()/millis()/Timer0-ISR at 1.0000 s.

## How to use
1. Push this repo to GitHub.
2. Actions tab -> "build-avr-llvm-wasm" -> Run workflow (or push a `v*` tag
   to also publish a Release with the artifacts).
3. ~2–4 h later, download: `clang.js/.wasm`, `lld.js/.wasm`, `sysroot.tar.gz`.

## What the workflow does
- Stage 1: native `llvm-tblgen`/`clang-tblgen` (cross-build prerequisite).
- Stage 2: Emscripten build of clang+lld, `LLVM_TARGETS_TO_BUILD=AVR`,
  MinSizeRel, no threads/zlib/plugins — the smallest useful compiler.
- Sysroot: avr-libc headers + `avr5` libs + crt (plain files), the
  lld-compatible linker script `avr5_lld.ld`, the `serialEvent` compat shim,
  and a **precompiled `core.a`** of the Arduino core (host clang, identical
  AVR target/ABI; cacheable and sketch-independent).
- Acceptance test **in CI**: compiles Blink.ino with the freshly built
  clang.wasm under node, links with lld.wasm, converts the ELF to a flash
  image in pure JS, runs it on AVR8js, and fails the build unless the LED
  period is 1.000 s. Green build = shippable artifacts, by construction.

## The three toolchain findings baked in
1. `avr5_lld.ld` — lld rejects GNU binutils' AVR linker scripts
   (`KEEP(SORT(*)(.ctors))` etc.); this is a from-scratch replacement.
2. `-D'__progmem__=__section__(".progmem.data")'` — clang (≤19) silently
   ignores `__attribute__((progmem))`; without this, PROGMEM tables land in
   RAM addresses, LPM reads flash garbage, pinMode writes to wrong registers
   and sketches hang in delay(). This define reroutes them to flash.
3. `clang_compat.cpp` — weak empty `serialEvent()` (GNU ld resolves the weak
   reference to null; lld wants a definition; user overrides still win).

## Expectations, honestly
This workflow encodes a cross-build that is well-trodden (llvm-box, Emception,
binji/wasm-clang all do variants of it) but has NOT yet run end-to-end in this
exact form; the first run may need small fixes (tool output names, an
Emscripten flag). The acceptance test is the contract: iterate until green.
Artifact sizes: expect roughly 25–60 MB of wasm — which is why Sekiz loads
this lazily as an optional ".ino mode", keeping the core simulator single-file.
