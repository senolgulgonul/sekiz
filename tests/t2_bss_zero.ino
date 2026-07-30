/* T2: .bss zeroing by crt (__do_clear_bss).
   Expect: "BSS-OK". Note avr8js zero-fills RAM, so a PASS is weaker evidence than a FAIL. */
#include <avr/io.h>
static uint8_t buf[64];
static void puts_(const char *s) {
  while (*s) { while (!(UCSR0A & (1 << UDRE0))); UDR0 = *s++; }
}
void setup() {
  UBRR0 = 103; UCSR0B = (1 << TXEN0);
  uint16_t sum = 0;
  for (uint8_t i = 0; i < 64; i++) sum += buf[i];
  puts_(sum == 0 ? "BSS-OK\n" : "BSS-FAIL\n");
}
void loop() {}
