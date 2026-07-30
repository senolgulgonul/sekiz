/* T0: raw USART0 output channel. No Arduino core, no .data dependency beyond the string.
   Expect: "T0-UART-OK" in the serial monitor. */
#include <avr/io.h>
void setup() {
  UBRR0 = 103; UCSR0B = (1 << TXEN0);          /* 9600 baud @ 16 MHz */
  const char *s = "T0-UART-OK\n";
  while (*s) { while (!(UCSR0A & (1 << UDRE0))); UDR0 = *s++; }
}
void loop() {}
