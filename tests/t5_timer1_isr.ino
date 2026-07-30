/* T5: raw ISR + timer1 CTC. Validates vector table placement and interrupt dispatch.
   Expect: LED toggles at exactly 1.000 s simulated intervals. */
#include <avr/io.h>
#include <avr/interrupt.h>
ISR(TIMER1_COMPA_vect) { PORTB ^= (1 << PB5); }
void setup() {
  DDRB |= (1 << PB5);
  TCCR1A = 0;
  TCCR1B = (1 << WGM12) | (1 << CS12) | (1 << CS10);  /* CTC, /1024 */
  OCR1A = 15624;                                       /* 1 Hz */
  TIMSK1 = (1 << OCIE1A);
  sei();
}
void loop() {}
