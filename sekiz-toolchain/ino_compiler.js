/* ino_compiler.js -- DRAFT browser glue for Sekiz's .ino mode.
 * Lazy-loads clang.wasm/lld.wasm + sysroot, exposes: compileIno(source) -> Uint16Array (flash words).
 * Mirrors scripts/test-node.mjs, which is the CI-verified reference for this pipeline. */
"use strict";
const SekizInoCompiler = (() => {
  const BASE = './toolchain/';            /* clang.js, clang.wasm, lld.js, lld.wasm, sysroot files */
  let sysrootFiles = null;                /* {path: Uint8Array} fetched once from sysroot.tar.gz */

  async function fetchSysroot() {
    if (sysrootFiles) return sysrootFiles;
    const gz = await fetch(BASE + 'sysroot.tar.gz').then(r => r.arrayBuffer());
    const tar = await new Response(
      new Response(gz).body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    sysrootFiles = untar(new Uint8Array(tar));   /* untar(): ~30-line USTAR reader */
    return sysrootFiles;
  }

  async function runTool(scriptUrl, args, files, wanted) {
    const createModule = (await import(scriptUrl)).default || self.createModule;
    let err = '';
    const mod = await createModule({ printErr: s => { err += s + '\n'; }, noInitialRun: true });
    for (const [p, data] of Object.entries(await fetchSysroot())) {
      mod.FS.mkdirTree(p.slice(0, p.lastIndexOf('/')) || '/');
      mod.FS.writeFile(p, data);
    }
    for (const [p, data] of Object.entries(files)) mod.FS.writeFile(p, data);
    let code = 0;
    try { code = mod.callMain(args); } catch (e) { if (e.status !== undefined) code = e.status; else throw e; }
    if (code !== 0) throw new Error(err || (scriptUrl + ' exited ' + code));
    const out = {};
    for (const w of wanted) out[w] = mod.FS.readFile(w);
    return out;
  }

  const PROGMEM_FIX = '-D__progmem__=__section__(".progmem.data")';
  const CFLAGS = ['--target=avr', '-mmcu=atmega328p', '-Os',
    '-DF_CPU=16000000L', '-DARDUINO=10819', '-DARDUINO_AVR_UNO', '-DARDUINO_ARCH_AVR',
    '-isystem', '/sysroot/include', '-I', '/sysroot/arduino',
    '-std=gnu++11', '-fno-exceptions', '-fno-rtti', '-Wno-everything', PROGMEM_FIX];

  async function compileIno(source) {
    const sketch = '#include <Arduino.h>\n' + source;
    const { '/sketch.o': obj } = await runTool(BASE + 'clang.js',
      [...CFLAGS, '-c', '-x', 'c++', '/sketch.cpp', '-o', '/sketch.o'],
      { '/sketch.cpp': sketch }, ['/sketch.o']);
    const { '/sketch.elf': elf } = await runTool(BASE + 'lld.js',
      ['-flavor', 'gnu', '-T', '/sysroot/avr5_lld.ld', '--gc-sections',
       '/sysroot/lib/crtatmega328p.o', '/sketch.o', '/sysroot/lib/core.a',
       '/sysroot/lib/libc.a', '/sysroot/lib/libm.a', '/sysroot/lib/libgcc.a',
       '-o', '/sketch.elf'],
      { '/sketch.o': obj }, ['/sketch.elf']);
    return elfToWords(elf);                /* same PT_LOAD reader as test-node.mjs */
  }

  return { compileIno };
})();
