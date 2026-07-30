# Sekiz .ino acceptance tests

Ten sketches, each isolating one link-time or runtime assumption of the
in-browser clang + lld + AVR8js pipeline. Paste into Sekiz's Arduino .ino
mode, press Compile, then Run. Run in order: T0 validates the serial monitor
that later tests use as their oracle, and T8 exercises everything at once, so
earlier tests localize any failure seen there. All timings refer to the
simulated-time panel, not wall-clock.

Full suite last passed 2026-07-30 on Sekiz v1.0.2.

| Test | File | Validates | Expected result |
|---|---|---|---|
| T0 | t0_uart.ino | USART0 output path | `T0-UART-OK` |
| T1 | t1_data_init.ino | .data flash-to-RAM copy at startup | `DATA-OK 12345` |
| T2 | t2_bss_zero.ino | .bss zeroing at startup | `BSS-OK` |
| T3 | t3_libgcc_32bit.ino | libgcc 32-bit helpers (`__mulsi3`, `__udivmodsi4`) | `97406784 7890` |
| T4 | t4_delay_ms.ino | avr-libc `_delay_ms` under clang | LED period ~1.003 s |
| T4b | t4b_delay_loop2.ino | cycle-exact `_delay_loop_2` | LED period ~1.001 s |
| T5 | t5_timer1_isr.ino | interrupt vector table, timer1 CTC | LED toggles every 1.000 s |
| T6 | t6_cycle_nops.ino | `.rept` directive, cycle exactness | high pulse 1609 cycles (100.56 us) |
| T7 | t7_asm_constraints.ino | inline-asm register constraints | `255` |
| T8 | t8_arduino_core.ino | Arduino core: Serial, millis, init | `CORE-OK`, then 1000, 2000, ... |

Two clang-vs-avr-gcc behaviors these tests document (details in the main
README's "Differences from avr-gcc" section):

- T4 only works because Sekiz compiles with `-D__DELAY_BACKWARD_COMPATIBLE__`;
  clang lacks `__builtin_avr_delay_cycles`, and the classic delay path it
  selects runs ~0.3% long by design.
- T6 keeps its nop block inside a `noinline` function because clang's
  integrated assembler does not relax out-of-range `rjmp` (avr-gcc does,
  silently).
