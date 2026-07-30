/* T6: assembler directives (.rept) and cycle exactness against a hand-countable block.
   The nop block lives in a noinline function: clang's integrated assembler does not
   relax out-of-range rjmp, so no branch may span the block (a ret is not a branch).
   Expect: high pulse = rcall(3) + 1600 nops + ret(4) + cbi(2) = 1609 cycles = 100.56 us. */
#include <avr/io.h>
__attribute__((noinline)) static void nops1600() {
  asm volatile(".rept 1600\n\tnop\n\t.endr");
}
void setup() {
  DDRB |= (1 << PB5);
  for (;;) {
    PORTB |= (1 << PB5);
    nops1600();
    PORTB &= ~(1 << PB5);
    nops1600();
  }
}
void loop() {}
