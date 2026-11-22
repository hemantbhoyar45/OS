@echo off
REM Windows batch script to compile C++ MOS Engine to WebAssembly using Emscripten
where emcc >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] emcc was not found in your PATH.
    echo Please install and activate Emscripten SDK:
    echo   git clone https://github.com/emscripten-core/emsdk.git
    echo   cd emsdk ^&^& emsdk install latest ^&^& emsdk activate latest
    echo   emsdk_env.bat
    exit /b 1
)

if not exist "..\public" mkdir "..\public"

echo Compiling C++ MOS Engine to WebAssembly...
emcc os_engine.cpp -o ..\public\os_engine.js -O3 -s WASM=1 -s MODULARIZE=1 -s EXPORT_NAME="createOSEngine" -s ALLOW_MEMORY_GROWTH=1 --bind

if %errorlevel% equ 0 (
    echo [SUCCESS] WebAssembly engine compiled to public\os_engine.js and public\os_engine.wasm
) else (
    echo [FAILURE] Compilation failed.
)
