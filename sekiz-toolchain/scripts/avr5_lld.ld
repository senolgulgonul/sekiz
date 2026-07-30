/* Minimal ATmega328P linker script, lld-compatible (no GNU-only constructs) */
MEMORY {
  text (rx)   : ORIGIN = 0x000000, LENGTH = 32K
  data (rw!x) : ORIGIN = 0x800100, LENGTH = 2K
}
SECTIONS {
  .text : {
    KEEP(*(.vectors))
    KEEP(*(.init0)) KEEP(*(.init1)) KEEP(*(.init2)) KEEP(*(.init3)) KEEP(*(.init4))
    KEEP(*(.init5)) KEEP(*(.init6)) KEEP(*(.init7)) KEEP(*(.init8)) KEEP(*(.init9))
    *(.progmem.gcc*) *(.progmem*)
    *(.text) *(.text.*)
    KEEP(*(.fini9)) KEEP(*(.fini8)) KEEP(*(.fini7)) KEEP(*(.fini6)) KEEP(*(.fini5))
    KEEP(*(.fini4)) KEEP(*(.fini3)) KEEP(*(.fini2)) KEEP(*(.fini1)) KEEP(*(.fini0))
  } > text
  .ctors : { __ctors_start = .; KEEP(*(.ctors)) __ctors_end = .; } > text
  .dtors : { __dtors_start = .; KEEP(*(.dtors)) __dtors_end = .; } > text
  .data : AT(LOADADDR(.ctors) + SIZEOF(.ctors) + SIZEOF(.dtors)) {
    __data_start = .;
    *(.data) *(.data*) *(.rodata) *(.rodata*)
    __data_end = .;
  } > data
  __data_load_start = LOADADDR(.data);
  __data_load_end = __data_load_start + SIZEOF(.data);
  .bss (NOLOAD) : { __bss_start = .; *(.bss) *(.bss*) *(COMMON) __bss_end = .; } > data
  __stack = 0x8008ff;
  _end = .;
}
