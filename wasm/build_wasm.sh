#!/usr/bin/env bash
# Build WebAssembly module using Emscripten
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v emcc &> /dev/null; then
    echo "Warning: emcc (Emscripten) is not in PATH."
    echo "To compile C++ to WebAssembly, install EMSDK from https://emscripten.org/docs/getting_started/downloads.html"
    echo "Then run: source ./emsdk_env.sh in your terminal."
    exit 1
fi

echo "Compiling C++ MOS Engine to WebAssembly..."
mkdir -p ../public

emcc os_engine.cpp -o ../public/os_engine.js \
    -O3 \
    -s WASM=1 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME="createOSEngine" \
    -s ALLOW_MEMORY_GROWTH=1 \
    --bind

echo "WASM compilation successful! Output files in public/:"
ls -lh ../public/os_engine.*
