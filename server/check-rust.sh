#!/bin/sh
# Build WASM if missing and toolchain available

if [ -f "@rust/pkg/easyeyes_wasm_bg.wasm" ]; then
  exit 0
fi

if command -v wasm-bindgen >/dev/null 2>&1; then
  npm run build:rust
else
  echo 'Error: WASM files missing. Install Rust and wasm-bindgen-cli, then run: npm run build:rust' >&2
  exit 1
fi
