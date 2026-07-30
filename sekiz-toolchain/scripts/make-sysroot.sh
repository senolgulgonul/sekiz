#!/bin/bash
# Package everything the WASM toolchain needs at runtime, as plain files:
# avr-libc headers/libs/crt, Arduino core headers + precompiled core.a,
# the lld-compatible linker script, and the compat shim.
# core.a is compiled with HOST clang (same AVR target/ABI as the WASM clang).
set -e
mkdir -p sysroot dist
cp -r /usr/lib/avr/include sysroot/include
mkdir -p sysroot/lib
cp /usr/lib/avr/lib/avr5/crtatmega328p.o sysroot/lib/
cp /usr/lib/avr/lib/avr5/libc.a sysroot/lib/
cp /usr/lib/avr/lib/avr5/libm.a sysroot/lib/
cp /usr/lib/gcc/avr/*/avr5/libgcc.a sysroot/lib/
cp scripts/avr5_lld.ld sysroot/

git clone --depth 1 https://github.com/arduino/ArduinoCore-avr.git
CORE=ArduinoCore-avr/cores/arduino
VAR=ArduinoCore-avr/variants/standard
sudo apt-get install -y -qq clang lld
PROGMEM_FIX='-D__progmem__=__section__(".progmem.data")'
FLAGS="--target=avr -mmcu=atmega328p -Os -DF_CPU=16000000L -DARDUINO=10819 \
 -DARDUINO_AVR_UNO -DARDUINO_ARCH_AVR -I$CORE -I$VAR \
 -ffunction-sections -fdata-sections -Wno-everything $PROGMEM_FIX -isystem sysroot/include"
mkdir -p core_build
for f in $CORE/*.c;   do clang   $FLAGS -c "$f" -o core_build/$(basename "$f" .c).o; done
for f in $CORE/*.cpp; do [ "$(basename "$f")" = CDC.cpp ] && continue
                         clang++ $FLAGS -std=gnu++11 -fno-exceptions -fno-rtti -c "$f" -o core_build/$(basename "$f" .cpp).o; done
for f in $CORE/*.S;   do clang   $FLAGS -c "$f" -o core_build/$(basename "$f" .S)_S.o; done
clang++ $FLAGS -std=gnu++11 -fno-exceptions -fno-rtti -c scripts/clang_compat.cpp -o core_build/zz_compat.o
ar rcs sysroot/lib/core.a core_build/*.o
mkdir -p sysroot/arduino
cp $CORE/*.h sysroot/arduino/
cp $VAR/pins_arduino.h sysroot/arduino/
tar czf dist/sysroot.tar.gz sysroot
( echo "built: $(date -u)"; clang --version | head -1; echo "LLVM: release/19.x"; \
  echo "ArduinoCore-avr: $(git -C ArduinoCore-avr rev-parse --short HEAD)" ) > dist/MANIFEST.txt
