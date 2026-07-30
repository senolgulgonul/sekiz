// test-node.mjs -- CI acceptance test for the WASM AVR toolchain.
// Compiles Blink.ino with clang.wasm, links with lld.wasm, converts to words,
// runs on AVR8js, and asserts a 1.000 s blink period. This is the same
// pipeline AVRLab's browser .ino mode will use, exercised end to end.
import { createRequire } from 'module';
import { execSync } from 'child_process';
import fs from 'fs';
const require = createRequire(import.meta.url);

// --- unpack sysroot into a plain directory for MEMFS mounting ---
execSync('rm -rf sr && mkdir sr && tar xzf dist/sysroot.tar.gz -C sr');
const SR = 'sr/sysroot';

const BLINK = `#include <Arduino.h>
void setup() { pinMode(LED_BUILTIN, OUTPUT); }
void loop()  { digitalWrite(LED_BUILTIN, HIGH); delay(1000);
               digitalWrite(LED_BUILTIN, LOW);  delay(1000); }
`;

function loadTree(FS, host, guest) {
  FS.mkdirTree(guest);
  for (const e of fs.readdirSync(host, { withFileTypes: true })) {
    if (e.isDirectory()) loadTree(FS, host + '/' + e.name, guest + '/' + e.name);
    else FS.writeFile(guest + '/' + e.name, fs.readFileSync(host + '/' + e.name));
  }
}

async function runTool(jsPath, args, files, wanted) {
  const createModule = require('./' + jsPath);
  let out = '', err = '';
  const mod = await createModule({
    print: (s) => { out += s + '\n'; },
    printErr: (s) => { err += s + '\n'; },
    noInitialRun: true,
  });
  loadTree(mod.FS, SR, '/sysroot');
  for (const [path, data] of Object.entries(files)) mod.FS.writeFile(path, data);
  let code = 0;
  try { code = mod.callMain(args); } catch (e) { if (e.status !== undefined) code = e.status; else throw e; }
  if (code !== 0) { console.error(err || out); throw new Error(jsPath + ' exited ' + code); }
  const results = {};
  for (const w of wanted) results[w] = mod.FS.readFile(w);
  return results;
}

const PROGMEM_FIX = '-D__progmem__=__section__(".progmem.data")';
const CFLAGS = ['--target=avr', '-mmcu=atmega328p', '-Os',
  '-DF_CPU=16000000L', '-DARDUINO=10819', '-DARDUINO_AVR_UNO', '-DARDUINO_ARCH_AVR',
  '-isystem', '/sysroot/include', '-I', '/sysroot/arduino',
  '-std=gnu++11', '-fno-exceptions', '-fno-rtti', '-Wno-everything', PROGMEM_FIX];

// 1) compile the sketch with clang.wasm (in-process cc1: no subprocesses in WASM)
const { '/sketch.o': sketchO } = await runTool('dist/clang.js',
  [...CFLAGS, '-c', '-x', 'c++', '/sketch.cpp', '-o', '/sketch.o'],
  { '/sketch.cpp': BLINK }, ['/sketch.o']);

// 2) link with lld.wasm (invoked as ld.lld via -flavor gnu)
const { '/sketch.elf': elf } = await runTool('dist/lld.js',
  ['-flavor', 'gnu', '-T', '/sysroot/avr5_lld.ld', '--gc-sections',
   '/sysroot/lib/crtatmega328p.o', '/sketch.o', '/sysroot/lib/core.a',
   '/sysroot/lib/libc.a', '/sysroot/lib/libm.a', '/sysroot/lib/libgcc.a',
   '-o', '/sketch.elf'],
  { '/sketch.o': sketchO }, ['/sketch.elf']);

// 3) minimal ELF -> flash words (read PT_LOAD segments with physaddr < 0x800000)
function elfToWords(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const phoff = dv.getUint32(28, true), phentsize = dv.getUint16(42, true), phnum = dv.getUint16(44, true);
  const flash = new Uint8Array(0x8000).fill(0xFF);
  let max = 0;
  for (let i = 0; i < phnum; i++) {
    const o = phoff + i * phentsize;
    const type = dv.getUint32(o, true);
    if (type !== 1) continue; // PT_LOAD
    const offset = dv.getUint32(o + 4, true);
    const paddr = dv.getUint32(o + 12, true);
    const filesz = dv.getUint32(o + 16, true);
    if (paddr >= 0x800000 || filesz === 0) continue;
    flash.set(buf.subarray(offset, offset + filesz), paddr);
    max = Math.max(max, paddr + filesz);
  }
  const words = new Uint16Array(Math.ceil(max / 2));
  for (let i = 0; i < words.length; i++) words[i] = flash[2 * i] | (flash[2 * i + 1] << 8);
  return words;
}
const words = elfToWords(elf);
console.log('flash image:', words.length * 2, 'bytes');

// 4) run on AVR8js, assert 1.000 s period
const AVR8 = require('avr8js');
const program = new Uint16Array(0x4000).fill(0xFFFF);
program.set(words.subarray(0, Math.min(words.length, program.length)));
const cpu = new AVR8.CPU(program);
const portB = new AVR8.AVRIOPort(cpu, AVR8.portBConfig);
new AVR8.AVRIOPort(cpu, AVR8.portCConfig); new AVR8.AVRIOPort(cpu, AVR8.portDConfig);
new AVR8.AVRTimer(cpu, AVR8.timer0Config); new AVR8.AVRTimer(cpu, AVR8.timer1Config);
new AVR8.AVRTimer(cpu, AVR8.timer2Config);
new AVR8.AVRUSART(cpu, AVR8.usart0Config, 16000000);
let prev = 0; const tog = [];
portB.addListener(v => { const b = (v >> 5) & 1; if (b !== prev) { tog.push(cpu.cycles); prev = b; } });
while (cpu.cycles < 50_000_000) { AVR8.avrInstruction(cpu); cpu.tick(); }
console.log('toggles at:', tog.slice(0, 5).map(c => (c / 16e6).toFixed(4) + 's').join(' '));
const period = tog.length >= 3 ? (tog[2] - tog[1]) / 16e6 : 0;
if (Math.abs(period - 1.0) > 0.01) { console.error('FAIL: period ' + period); process.exit(1); }
console.log('PASS: WASM toolchain Blink.ino at ' + period.toFixed(4) + ' s');
