/* T4b: cycle-exact delay via <util/delay_basic.h>, pure inline asm, no builtin anywhere.
   Expect: LED period ~1.001 s simulated (500 x 1.000 ms + outer-loop overhead). */
#include <avr/io.h>
#include <util/delay_basic.h>
void setup() { DDRB |= (1 << PB5); }
void loop() {
  PORTB ^= (1 << PB5);
  for (uint16_t i = 0; i < 500; i++) _delay_loop_2(4000);  /* 4 cyc x 4000 = 1.000 ms */
}
