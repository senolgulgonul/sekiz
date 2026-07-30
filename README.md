# Sekiz

*Sekiz* is Turkish for *eight*. It is a single-file, offline-capable **8-bit AVR
assembly simulator** for the ATmega328P (the Arduino Uno's microcontroller),
built for teaching. Everything runs inside one HTML page: the assembler, the
disassembler, the CPU and its peripherals. No server, no account, no
installation, no build queue. Save the file, open it on a bus, it works.

**Try it:** https://senolgulgonul.github.io/sekiz

![screenshot](screenshot.png)

## What it does

- **Write AVR assembly** (GAS-flavored syntax) and run it instantly. The
  complete ATmega328P instruction set is supported, including all aliases
  (`tst`, `clr`, `lsl`, `rol`, `sbr`, `cbr`, flag set/clear shorthands).
- **Watch the machine, not a cartoon of it:** registers R0-R31 with change
  highlighting, SREG as datasheet-style bit boxes, PC, SP, a cycle counter and
  simulated time at 16 MHz, and a machine-code listing the program counter
  walks through as you single-step.
- **Board with a live LED:** pin 13 / PB5 drives the "L" LED; the red button
  performs a real reset. A serial monitor shows USART0 transmissions.
- **Run compiled Arduino sketches:** in the Arduino IDE choose *Sketch >
  Export Compiled Binary*, then *Load .hex* here. The machine code executes
  directly and its full disassembly appears in the listing. `delay()`,
  `millis()` and the Timer0 interrupt work; the canonical Blink runs at
  exactly 1.000 s.
- **Built-in examples:** cycle-counted blink, serial "3+5=8" arithmetic, a
  hardware Timer0 polling delay, and a register tour for Step mode.

## Why it exists

Popular in-browser simulators either model the Arduino API rather than the
instruction set (one widely used tool silently drops `sbi`/`cbi` opcodes
written in inline assembly, while executing the same opcodes when the compiler
emits them), or execute faithfully but depend on cloud build servers that
queue or fail under load. Sekiz takes the opposite position: everything on the
client, at the instruction level, where `sbi 0x05, 5` means exactly what the
datasheet says.

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

## Syntax notes

Labels are **byte addresses** (avr-gcc convention). Numbers: `123`, `0x7B`,
`0b1111011`, `$7B`, `'A'`. Functions: `lo8()`, `hi8()`. Directives: `.org`,
`.equ`, `.db`, `.dw`, `.ascii`, `.asciz`, comments with `;` or `//`. The AVR
gas quirk is honored: `.` in an operand refers to the address *after* the
opcode, so the canonical endless loop is `rjmp .-2`.

## Roadmap

Serial input (RX), breakpoints on listing rows, clickable input pins, and the
flagship: fully client-side `.ino` compilation via clang+lld built to
WebAssembly (AVR backend). The toolchain recipe is already proven natively,
with the unmodified official Arduino core compiled by clang 18, linked by
ld.lld through a custom lld-compatible linker script, and running Blink at
1.0000 s; see the companion repository **sekiz-toolchain** for the CI that
builds the browser compiler.

## Credits and license

CPU and peripheral engine: [AVR8js](https://github.com/wokwi/avr8js)
(c) Uri Shaked, MIT license, bundled unmodified. Assembler, disassembler,
board and interface (c) 2026 Senol Gulgonul, MIT license. Sekiz is an
independent educational project, not affiliated with or endorsed by
Microchip Technology or Arduino; AVR, ATmega and Arduino are trademarks of
their respective owners, used here to describe compatibility.

Part of a browser-based tool family for electronics education:
[LogicLab](https://senolgulgonul.github.io/logic) (gate level) ->
**Sekiz** (instruction level) ->
[VeriSim](https://senolgulgonul.github.io) (RTL level) ->
softFPGA (silicon level). Same student, same browser, four abstraction
layers, nothing to install.
