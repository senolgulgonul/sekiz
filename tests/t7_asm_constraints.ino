/* T7: GCC-style inline asm register constraints under clang.
   Expect: "255". Anything else means constraint miscompilation; check the disassembly. */
#include <avr/io.h>
static void putnum(unsigned v) {
  char b[8]; int i = 0;
  if (v == 0) b[i++] = '0';
  while (v > 0) { b[i++] = '0' + v % 10; v /= 10; }
  while (i--) { while (!(UCSR0A & (1 << UDRE0))); UDR0 = b[i]; }
}
volatile uint8_t xa = 200, xb = 55;
void setup() {
  UBRR0 = 103; UCSR0B = (1 << TXEN0);
  uint8_t a = xa, b = xb;
  asm volatile("add %0, %1" : "+r"(a) : "r"(b));
  putnum(a);
  while (!(UCSR0A & (1 << UDRE0))); UDR0 = '\n';
}
void loop() {}
