# WebAssembly Engine for MOS Simulator

This directory contains the unified, production-ready C++ OS Engine that can be compiled to WebAssembly via **Emscripten** and integrated directly into the browser.

## Files
- `os_engine.cpp`: Unified C++ implementation of Phase 1 (Simple Batch OS) & Phase 2 (Multiprogramming, Paging, Virtual Address Translation, Decision Table Interrupt Handling, Demand Paging, Line/Time Limits) with `emscripten::bind` mappings.
- `Makefile`: Build rules using `emcc`.
- `build_wasm.sh`: Bash compilation script for Linux/macOS.
- `build_wasm.bat`: Batch script for Windows.

## Compiling with Emscripten
1. Install and activate EMSDK:
   ```bash
   git clone https://github.com/emscripten-core/emsdk.git
   cd emsdk
   ./emsdk install latest
   ./emsdk activate latest
   source ./emsdk_env.sh    # On Windows: emsdk_env.bat
   ```
2. Build the WebAssembly files:
   ```bash
   npm run build:wasm
   # Or directly:
   cd wasm && make
   ```
3. This creates:
   - `public/os_engine.wasm`
   - `public/os_engine.js`

## Native Verification
You can also compile `os_engine.cpp` natively with `g++` to verify algorithm correctness:
```bash
g++ wasm/os_engine.cpp -o wasm/test_engine.exe
./wasm/test_engine.exe
```
