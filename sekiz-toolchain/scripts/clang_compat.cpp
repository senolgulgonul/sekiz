/* clang/lld compatibility shims for the Arduino AVR core.
 * serialEvent: declared weak-undefined in HardwareSerial.cpp; GCC resolves
 * the reference to null, lld wants a definition. A weak empty body preserves
 * Arduino semantics (user definitions override it). */
void serialEvent() __attribute__((weak));
void serialEvent() {}
