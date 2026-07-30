/* T3: 32-bit multiply and divide pull in libgcc helpers (__mulsi3, __udivmodsi4).
   Expect: "97406784 7890". Undefined-symbol link error means the sysroot lacks libgcc. */
#include <avr/io.h>
static void putnum(unsigned long v) {
  char b[12]; int i = 0;
  if (v == 0) b[i++] = '0';
  while (v > 0) { b[i++] = '0' + v % 10; v /= 10; }
  while (i--) { while (!(UCSR0A & (1 << UDRE0))); UDR0 = b[i]; }
}
volatile unsigned long a = 123456UL, b = 789UL;
void setup() {
  UBRR0 = 103; UCSR0B = (1 << TXEN0);
  unsigned long p = a * b, q = p / 12345UL;
  putnum(p);
  while (!(UCSR0A & (1 << UDRE0))); UDR0 = ' ';
  putnum(q);
  while (!(UCSR0A & (1 << UDRE0))); UDR0 = '\n';
}
void loop() {}
