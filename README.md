# Sekiz

*Sekiz* is Turkish for *eight*. It is a single-file **Arduino toolchain and
8-bit AVR simulator** for the ATmega328P (the Arduino Uno's microcontroller),
built for teaching. Everything runs inside one HTML page: a real C/C++
compiler (clang + lld with the AVR backend, built to WebAssembly), the
assembler, the disassembler, the CPU and its peripherals. Type a sketch,
press Compile, watch pin 13 blink at exactly 1.000 s of simulated time — with
no compile server involved at any point. No account, no installation, no
build queue. After the one-time toolchain download (~28 MB, cached by the
browser), it works offline. Assembly mode needs no download at all: save the file, open
it on a bus, it works.

**Try it:** https://senolgulgonul.github.io/sekiz

![screenshot](screenshot.png)

## What it does

- **Write Arduino sketches and compile them in the tab:** real clang compiles
  your `.ino` against the unmodified official Arduino core and avr-libc, real
  lld links it through a custom lld-compatible linker script, and the result
  executes immediately. `digitalWrite`, `Serial`, `millis()`, PWM, the ADC,
  interrupts, `_delay_ms()`, raw register access and inline assembly all work.
- **Write AVR assembly** (GAS-flavored syntax) and run it instantly. The
  complete ATmega328P instruction set is supported, including all aliases
  (`tst`, `clr`, `lsl`, `rol`, `sbr`, `cbr`, flag set/clear shorthands).
- **Watch the machine, not a cartoon of it:** registers R0-R31 with change
  highlighting, SREG as datasheet-style bit boxes, PC, SP, a cycle counter and
  simulated time at 16 MHz, and a machine-code listing the program counter
  walks through as you single-step. Compiled sketches are disassembled into
  the same listing, so C and its generated code are two views of one machine.
- **Board with a live LED:** pin 13 / PB5 drives the "L" LED; the red button
  performs a real reset. A serial monitor shows USART0 transmissions and
  sends bytes to RX.
- **Load pre-built binaries:** in the Arduino IDE choose *Sketch >
  Export Compiled Binary*, then *Load .hex* here. The canonical Blink runs at
  exactly 1.0000 s.
- **Built-in examples** in both modes: cycle-counted blink, serial "3+5=8"
  arithmetic, a hardware Timer0 polling delay, and a register tour for Step
  mode.

## Why it exists

Popular in-browser simulators either model the Arduino API rather than the
instruction set (one widely used tool silently drops `sbi`/`cbi` opcodes
written in inline assembly, while executing the same opcodes when the compiler
emits them), or execute faithfully but depend on cloud build servers that
queue or fail under load. Sekiz takes the opposite position: everything on the
client, at the instruction level, where `sbi 0x05, 5` means exactly what the
datasheet says — and now the compiler lives on the client too.

## How the .ino pipeline works

| Stage | Component |
|---|---|
| Compile | clang (AVR backend) built to WebAssembly, running in a Web Worker |
| Link | lld (GNU flavor) + custom avr5 linker script |
| Runtime | crt + unmodified Arduino core + avr-libc + libgcc, packed in a sysroot tarball |
| Load | ELF `PT_LOAD` segments parsed in JavaScript, written to flash words |
| Execute | AVR8js — cycle-accurate ATmega328P |

The toolchain is built by CI in the companion repository
[**sekiz-toolchain**](https://github.com/senolgulgonul/sekiz-toolchain); its
acceptance gate compiles Blink through the full browser pipeline and checks
that the LED period measures 1.0000 s of simulated time.

## Validation

Trust in a teaching tool must be earned, so both translators are validated
against the reference toolchain, reproducibly (harnesses included in `src/`):

- **Assembler vs avr-gcc:** 1050/1050 randomized encodings across the entire
  instruction set produce byte-identical machine code, plus byte-identical
  whole programs (labels, strings, `lo8`/`hi8`, data directives).
- **Disassembler vs avr-objdump:** 372/372 instructions of a real Arduino
  IDE-compiled sketch match (Sekiz prefers pedagogical aliases: `clr r1`
  where objdump prints `eor r1, r1`).
- **Execution:** delay-loop timing is cycle-exact (a 16000-cycle busy-wait
  measures 1.000125 ms; Arduino Blink toggles at 1.0000 s intervals).
- **Compiler pipeline:** an acceptance suite of `.ino` tests exercises
  `.data` copy and `.bss` clear at startup, 32-bit libgcc helpers
  (`__mulsi3`, `__udivmodsi4`), the interrupt vector table with a raw
  Timer1 ISR, inline-asm register constraints, avr-libc's delay loops, and
  the Arduino core (`Serial`, `millis()`) end to end.

## Differences from avr-gcc

Sekiz compiles with clang's AVR backend, not avr-gcc. For teaching-scale code
the two are interchangeable. Two differences will surface in real code; both
are properties of clang, documented here because search engines don't have
this in one place.

**`_delay_ms()` runs ~0.3% long.** avr-libc's `<util/delay.h>` prefers
`__builtin_avr_delay_cycles`, a GCC builtin that clang has never implemented.
Without intervention, linking fails with:

```
error: undefined symbol: __builtin_avr_delay_cycles(unsigned long)
```

Sekiz compiles every sketch with `-D__DELAY_BACKWARD_COMPATIBLE__`, selecting
avr-libc's classic pure-C delay path (`_delay_loop_2` busy loops). Delays work
in all sketches with no source changes; the cost is outer-loop overhead of
roughly 0.3% — `_delay_ms(500)` measures ≈ 501.5 ms. For cycle-exact timing,
call `_delay_loop_2(n)` directly (4 cycles per iteration) or write the delay
in assembly.

**No branch relaxation.** AVR's `rjmp`/`rcall` reach ±4 KB. avr-gcc's
assembler silently relaxes out-of-range short branches into 4-byte
`jmp`/`call`; clang's integrated assembler instead errors:

```
error: out of range branch target (expected an integer in the range -4096 to 4095)
```

You will hit this with very large loop bodies, heavy manual unrolling, or big
inline-asm blocks (e.g. `.rept 1600 / nop / .endr` inside a loop). Fix: move
the large block into a `__attribute__((noinline))` function — a `ret` is not
a branch, so nothing needs to span the block.

## Syntax notes

Labels are **byte addresses** (avr-gcc convention). Numbers: `123`, `0x7B`,
`0b1111011`, `$7B`, `'A'`. Functions: `lo8()`, `hi8()`. Directives: `.org`,
`.equ`, `.db`, `.dw`, `.ascii`, `.asciz`, comments with `;` or `//`. The AVR
gas quirk is honored: `.` in an operand refers to the address *after* the
opcode, so the canonical endless loop is `rjmp .-2`.

## Roadmap

Breakpoints on listing rows, sketch sharing by URL (as in VeriSim), more
peripherals (SPI, I2C displays), and multi-file sketches with libraries.

## Credits and license

CPU and peripheral engine: [AVR8js](https://github.com/wokwi/avr8js)
(c) Uri Shaked, MIT license, bundled unmodified. Compiler and linker: LLVM
project (clang, lld), Apache 2.0 with LLVM exceptions, built to WebAssembly
in [sekiz-toolchain](https://github.com/senolgulgonul/sekiz-toolchain).
Arduino core and avr-libc under their respective licenses. Assembler,
disassembler, board and interface (c) 2026 Senol Gulgonul, MIT license. Sekiz
is an independent educational project, not affiliated with or endorsed by
Microchip Technology or Arduino; AVR, ATmega and Arduino are trademarks of
their respective owners, used here to describe compatibility.

Part of a browser-based tool family for electronics education:
[LogicLab](https://senolgulgonul.github.io/logic) (gate level) ->
**Sekiz** (instruction level) ->
[VeriSim](https://senolgulgonul.github.io) (RTL level) ->
softFPGA (silicon level). Same student, same browser, four abstraction
layers, nothing to install.
