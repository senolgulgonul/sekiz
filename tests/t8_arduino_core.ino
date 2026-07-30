/* T8: Arduino core end to end: HardwareSerial (interrupt-driven TX), millis()
   (timer0 overflow ISR + .bss counters), core init(). Run last; it exercises
   everything at once, so earlier tests localize any failure seen here.
   Expect: "CORE-OK", then 1000, 2000, 3000... at 1 s simulated intervals. */
void setup() {
  Serial.begin(9600);
  Serial.println("CORE-OK");
}
void loop() {
  static unsigned long last = 0;
  if (millis() - last >= 1000) {
    last = millis();
    Serial.println(millis());
  }
}
