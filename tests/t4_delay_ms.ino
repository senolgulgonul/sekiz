/* T4: avr-libc <util/delay.h> under clang. Requires -D__DELAY_BACKWARD_COMPATIBLE__
   (set in Sekiz's CFLAGS) because clang lacks __builtin_avr_delay_cycles.
   Expect: LED period ~1.003 s simulated (the classic delay path runs ~0.3% long). */
#include <avr/io.h>
#define F_CPU 16000000UL
#include <util/delay.h>
void setup() { DDRB |= (1 << PB5); }
void loop() {
  PORTB ^= (1 << PB5);
  _delay_ms(500);
}
