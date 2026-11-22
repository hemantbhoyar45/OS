# Makefile for Emscripten WebAssembly Compilation of MOS Engine

EMCC = emcc
SRC = os_engine.cpp
OUT_DIR = ../public
TARGET_JS = $(OUT_DIR)/os_engine.js
TARGET_WASM = $(OUT_DIR)/os_engine.wasm

EMCC_FLAGS = -O3 \
             -s WASM=1 \
             -s MODULARIZE=1 \
             -s EXPORT_NAME="createOSEngine" \
             -s ALLOW_MEMORY_GROWTH=1 \
             -s NO_DISABLE_EXCEPTION_CATCHING \
             --bind

all: $(TARGET_JS)

$(TARGET_JS): $(SRC)
	@mkdir -p $(OUT_DIR)
	$(EMCC) $(SRC) -o $(TARGET_JS) $(EMCC_FLAGS)
	@echo "WebAssembly compilation completed: $(TARGET_JS) and $(TARGET_WASM)"

clean:
	rm -f $(TARGET_JS) $(TARGET_WASM)
