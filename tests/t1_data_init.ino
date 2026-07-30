/* T1: .data initialization. crt must copy initialized globals from flash to RAM.
   Expect: "DATA-OK 12345". Garbage means .data LMA/VMA or __do_copy_data failure. */
#include <avr/io.h>
volatile int magic = 12345;
char tag[] = "DATA-OK";
static void puts_(const char *s) {
  while (*s) { while (!(UCSR0A & (1 << UDRE0))); UDR0 = *s++; }
}
static void putnum(long v) {
  char b[12]; int i = 0;
  if (v == 0) b[i++] = '0';
  while (v > 0) { b[i++] = '0' + v % 10; v /= 10; }
  while (i--) { while (!(UCSR0A & (1 << UDRE0))); UDR0 = b[i]; }
}
void setup() {
  UBRR0 = 103; UCSR0B = (1 << TXEN0);
  puts_(tag); puts_(" "); putnum(magic); puts_("\n");
}
void loop() {}
