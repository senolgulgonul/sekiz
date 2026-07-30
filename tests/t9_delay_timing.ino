/* t9_delay_timing.ino - delay(1000) measured two ways:
   timer1 at /1024 (independent hardware reference, 64 us/tick)
   and micros() (timer0 path, consistency check).
   Expect each line: "15625 1000000" (small +overhead tolerated:
   up to ~15626 and ~1000012). */
void setup() {
  Serial.begin(9600);
  TCCR1A = 0;
  TCCR1B = (1 << CS12) | (1 << CS10);   /* normal mode, /1024 */
}
void loop() {
  unsigned int t0 = TCNT1;
  unsigned long u0 = micros();
  delay(1000);
  unsigned int t1 = TCNT1;
  unsigned long u1 = micros();
  Serial.print(t1 - t0); Serial.print(' '); Serial.println(u1 - u0);
}
