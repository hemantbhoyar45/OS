# Multiprogramming Operating System (MOS) - Interactive Simulation Platform

> An educational, interactive Operating System simulation platform implementing memory management, demand paging, process scheduling, master mode interrupts, and job processing. Powered by **React + TypeScript + Vite + Tailwind CSS** with a **C++ Engine compiled via Emscripten to WebAssembly**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript%20%2B%20Vite%20%2B%20Tailwind-61dafb.svg)](https://vitejs.dev/)
[![Engine](https://img.shields.io/badge/Engine-C%2B%2B%20%2F%20WebAssembly%20%28Emscripten%29-purple.svg)](https://emscripten.org/)

---

## 🌟 Overview & Architecture

This repository contains both the original low-level C++ simulation engines (Phase 1 and Phase 2) and an interactive web-based simulator platform with zero external server dependencies:

```
                            ┌────────────────────────────────────────┐
                            │    Interactive React/TS Web Platform   │
                            │  (Dashboard, MMU, Memory & IRQ Matrix) │
                            └───────────────────┬────────────────────┘
                                                │
                                    ┌───────────┴───────────┐
                                    ▼                       ▼
                         ┌────────────────────┐   ┌────────────────────┐
                         │ WebAssembly Engine │   │  High-Fidelity TS  │
                         │ (C++ via Embind)   │   │  Simulation Engine │
                         └────────────────────┘   └────────────────────┘
                                    │
                                    ▼
                         ┌────────────────────────────────────────┐
                         │ Native C++ Implementations (g++ Native) │
                         │   • phase1/os_phase1.cpp (Sequential)  │
                         │   • phase2/os_phase2.cpp (Paging/IRQ)  │
                         │   • wasm/os_engine.cpp   (Unified WASM)│
                         └────────────────────────────────────────┘
```

### Integrated Dashboard Modules

```text
React / TypeScript / Tailwind dashboard
├── System overview and module cards
├── CPU scheduling
├── Process lifecycle and PCB management
├── Memory allocation and page replacement
├── Banker's algorithm and deadlock detection
├── Disk scheduling and animated head movement
└── Phase 1/2 MOS jobs, paging, and interrupts
        │
        ├── TypeScript deterministic engines for instant playback
        └── Native C++ libraries compiled through Emscripten
                ├── cpp/deadlock_manager.cpp
                └── cpp/disk_scheduler.cpp
```

---

## 🚀 Key Modules & Interactive Features

1. **Process Management & Lifecycle Simulator (C++ & WebAssembly)**:
   - **5 Canonical Process States**: `NEW`, `READY`, `RUNNING`, `WAITING`, and `TERMINATED`.
   - **Interactive State Diagram**: Visualizes state transitions (`Admit`, `Dispatch`, `Preempt`, `I/O Wait`, `I/O Complete`, `Exit`) with live process counters.
   - **Process Control Blocks (PCB)**: Tracks PID, program counter (`PC`/`IC`), registers (`IR`, `R`, `C`, `PTR`), priority, accounting limits (`TTL`, `TLL`, `TTC`, `LLC`), and memory frames.
   - **Context Switching**: Simulates register saving/restoration with configurable context-switch overhead (ticks).
   - **Ready & Waiting Queues**: Dynamic FIFO/priority ready queue and I/O wait queue with real-time ticks countdown.
   - **CPU Scheduling Integration**: Dispatches processes using FCFS, Round Robin ($TQ$), Priority, or SJF policies.
   - **C++ Unit Tests**: Verified state transition validation and rejection via `npm run test:process`.

2. **CPU Scheduling Simulator (C++ & WebAssembly)**:
   - **6 Standard Algorithms**:
     - **FCFS**: First Come First Serve (Non-preemptive)
     - **SJF**: Shortest Job First (Non-preemptive)
     - **SRTF**: Shortest Remaining Time First (Preemptive SJF)
     - **RR**: Round Robin with customizable Time Quantum ($TQ$)
     - **Priority (Non-preemptive)**: Custom priority hierarchy
     - **Priority (Preemptive)**: Dynamic preemption on higher priority arrival
   - **Interactive Gantt Chart**: Color-coded processes with explicit `IDLE` interval visualization and live progress scrubber.
   - **Step-by-step Playback**: Play, Pause, Resume, Reset, and Seek with speed control.
   - **Real-Time Ready Queue**: Displays process state (Running, Ready, Not Arrived, Completed) and queue ordering.
   - **Multi-Algorithm Comparison Matrix**: Side-by-side benchmarking comparing Avg Turnaround Time ($TAT$), Avg Waiting Time ($WT$), Avg Response Time ($RT$), and CPU Utilization, highlighting the optimal algorithm.
   - **Edge Case Handling**: CPU idle gaps, simultaneous arrivals, and tie-breakers.
   - **C++ Unit Tests**: Integrated test runner via `npm run test:scheduler`.

3. **Memory Management & Paging Simulator (C++ & WebAssembly)**:
   - **Contiguous Allocation Algorithms**:
     - **First Fit**: Scans partitions sequentially and assigns the first hole $\ge \text{requested size}$.
     - **Best Fit**: Scans all holes to allocate the smallest hole $\ge \text{requested size}$, minimizing leftover hole size.
     - **Worst Fit**: Scans all holes to allocate the largest available hole, leaving behind larger usable partitions.
     - **Dynamic Block Coalescing**: Automatically merges adjacent free blocks on deallocation to counter external fragmentation.
     - **Fragmentation Tracking**: Calculates exact internal fragmentation, external fragmentation, and free memory remaining.
   - **Page Replacement Algorithms**:
     - **FIFO (First-In First-Out)**: Replaces the oldest page loaded into physical frames using a FIFO queue.
     - **LRU (Least Recently Used)**: Replaces the page that has not been accessed for the longest time period.
     - **Optimal (Bélády's MIN)**: Replaces the page that will not be used for the longest future duration (theoretical lower bound).
     - **Configurable Workloads**: 2 to 8 physical frames, custom reference strings, and classic presets (Silberschatz standard, Bélády's Anomaly, High Locality).
     - **Bélády's Anomaly Demonstration**: Interactive preset verifying FIFO fault count increasing from 9 to 10 when frames increase from 3 to 4, while stack algorithms (LRU, Optimal) remain strictly monotonic.
   - **Multi-Algorithm Comparison Matrix**:
     - Side-by-side replacement comparison (Faults, Hits, Hit Ratio %, Fault Ratio %, step-by-step frame matrix).
     - Side-by-side contiguous allocation comparison (Successful vs Failed requests, external fragmentation, final layout bars).
   - **Integration with Phase 2 MOS Hardware Paging**:
     - Preserves the 30-frame $\times$ 10-word physical memory grid (`M[300][4]`).
     - Live Page Table Register ($PTR$) and dynamic demand paging on Valid Page Faults.
   - **C++ Unit Tests**: Verified Galvin textbook benchmarks via `npm run test:memory`.

2. **System Overview Dashboard**:
   - Live hardware status, Job ID, and Process Control Block (PCB) tracking.
   - Real-time time limit (TTC/TTL) and line limit (LLC/TLL) progress gauges.
   - Memory occupancy metrics across 300 physical words.

2. **Live CPU Simulator**:
   - Step-by-step instruction cycle pipeline: Fetch ➔ Decode ➔ Translate ➔ Execute ➔ Interrupt Check.
   - Real-time register inspection for `IR` (Instruction Register), `R` (General Register), `IC` (Instruction Counter), `C` (Comparison Toggle), and `PTR` (Page Table Register).
   - Interrupt flags (`SI`, `PI`, `TI`) dynamically visualized with live execution event logs.

3. **Physical Memory Visualizer**:
   - Phase 1: 100 sequential words (`M[100][4]`).
   - Phase 2: 300 words organized into 30 blocks (frames) of 10 words each (`M[300][4]`).
   - Distinct color-coding for Page Table frames (`PTR`), Program Code, Data cards, and Free memory.
   - Interactive Word Inspector modal displaying physical address (RA), frame number, block offset, and raw 4-byte ASCII content.

4. **Interactive MMU & Address Translator**:
   - Step-by-step Virtual Address (VA) to Real Address (RA) hardware translation calculator:
     $$\text{pageNum} = \lfloor\text{VA} / 10\rfloor, \quad \text{offset} = \text{VA} \pmod{10}$$
     $$\text{PTE Address} = \text{PTR} \times 10 + \text{pageNum}$$
     $$\text{RA} = (\text{Allocated Frame} \times 10) + \text{offset}$$
   - Demonstrates **Demand Paging** upon Valid Page Faults (`GD`/`SR`) vs. **Invalid Page Faults** (`LR`/`CR`/`PD`).

5. **Master Operating Subroutine (MOS) Decision Table**:
   - Visual matrix resolving combinations of $TI \in \{0, 2\}$, $SI \in \{1, 2, 3\}$, and $PI \in \{1, 2, 3\}$.
   - Complete reference for MOS Error Codes:
     - `0`: NO ERROR (Normal Halt)
     - `1`: OUT OF DATA (Premature `$END` or missing card)
     - `2`: LINE LIMIT EXCEEDED (`LLC > TLL`)
     - `3`: TIME LIMIT EXCEEDED (`TTC >= TTL`)
     - `4`: OPERATION CODE ERROR (Invalid Opcode)
     - `5`: OPERAND ERROR (Invalid 2-digit address)
     - `6`: INVALID PAGE FAULT (Unmapped memory access)

6. **Job Editor & Output Console**:
   - Input editor with preset test suite (Valid jobs, Invalid Page Fault, Time Limit Exceeded, Line Limit Exceeded, Opcode Error, Operand Error).
   - Real-time simulation output formatted identically to `output.txt`.

7. **Viva & Oral Exam Study Guide**:
   - Directly integrated from `Study_Guide.md` with algorithm breakdowns and high-yield interview questions.

8. **WebAssembly & C++ Engine Diagnostics**:
   - Full Emscripten compilation parameters and verification details.

---

## 💿 Disk Scheduling Simulator

The disk scheduling dashboard includes FCFS, SSTF, SCAN, C-SCAN, LOOK, and C-LOOK.
It supports configurable request queues, head position, cylinder range, direction, comparison,
step playback, servicing order, total head movement, and average seek distance.

Run disk scheduler unit tests:

```bash
npm run test:disk
```

## 🔒 Deadlock Management Simulator

The Deadlock Management dashboard provides:

- Banker's Algorithm safety analysis with Need matrix and safe sequence
- Step-by-step `Available`, `Work`, and `Finish` traces
- Safe resource request evaluation and rollback on unsafe grants
- Separate deadlock detection from request and allocation matrices
- Clear SAFE/UNSAFE and confirmed-DEADLOCK/NO-DEADLOCK distinctions
- Native C++ implementation and C++/Emscripten WebAssembly bindings

Run deadlock unit tests:

```bash
npm run test:deadlock
```

## 💻 Quick Start & Running the Project

### 1. Interactive Web Platform

Requires Node.js (v18+ recommended):

```bash
# Clone the repository
git clone https://github.com/hemantbhoyar45/OS.git
cd OS

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to launch the platform.

To create an optimized production build:
```bash
npm run build
npm run preview
```

### Screenshots and Demonstration Views

The dashboard provides separate demonstration views for:

- System overview and live MOS hardware status
- CPU scheduling Gantt chart and ready queue
- Process state diagram and PCB inspector
- Contiguous allocation, page replacement, and memory grids
- Banker's safety iterations and confirmed deadlocks
- Animated disk head traversal and algorithm comparison
- Phase 1/2 job editor, output console, address translation, and interrupts

Start the app with `npm run dev`, open `http://localhost:3000`, and use the sidebar to capture each view.

---

### 2. Native C++ Executables

You can compile and run the original C++ implementations using `g++`:

#### Memory Management & Paging Simulator C++ Unit Tests
```bash
npm run test:memory
# Or manually:
g++ -std=c++11 cpp/memory_manager.cpp cpp/test_memory_manager.cpp -o cpp/test_memory_manager.exe
./cpp/test_memory_manager.exe
```

#### Run All Algorithm Tests
```bash
npm run test:all
```

#### Process Management Simulator C++ Unit Tests
```bash
npm run test:process
# Or manually:
g++ -std=c++11 cpp/process_manager.cpp cpp/test_process_manager.cpp -o cpp/test_process_manager.exe
./cpp/test_process_manager.exe
```

#### CPU Scheduling Simulator C++ Unit Tests
```bash
npm run test:scheduler
# Or manually:
g++ -std=c++11 cpp/cpu_scheduler.cpp cpp/test_scheduler.cpp -o cpp/test_scheduler.exe
./cpp/test_scheduler.exe
```

#### Phase 1: Sequential Batch OS
```bash
npm run build:phase1
# Or manually:
cd phase1
g++ os_phase1.cpp -o os_phase1.exe
./os_phase1.exe
```

#### Phase 2: Multiprogrammed Paging OS
```bash
npm run build:phase2
# Or manually:
cd phase2
g++ os_phase2.cpp -o os_phase2.exe
./os_phase2.exe
```

---

### 3. Compiling to WebAssembly (Emscripten)

The unified C++ engine in `wasm/os_engine.cpp` can be compiled to WebAssembly using Emscripten:

```bash
# Ensure emcc is active in your environment (via EMSDK)
npm run build:wasm

# Or on Linux / macOS:
cd wasm && ./build_wasm.sh

# Or on Windows:
cd wasm && build_wasm.bat
```

This generates `public/os_engine.js` and `public/os_engine.wasm` for zero-latency, in-browser C++ execution.

---

## 📂 Project Structure

```
OS_CourseProject/
├── cpp/                          # C++ Algorithms Engine & Test Suites
│   ├── cpu_scheduler.hpp / .cpp  # FCFS, SJF, SRTF, RR, Priority (Preemptive/Non-preemptive)
│   ├── test_scheduler.cpp        # C++ Scheduler unit test suite
│   ├── process_manager.hpp / .cpp# 5-state process lifecycle, PCB, context switching
│   ├── test_process_manager.cpp  # C++ Process manager unit test suite
│   ├── memory_manager.hpp / .cpp # Contiguous (First/Best/Worst Fit) & Page Replacement (FIFO/LRU/OPT)
│   └── test_memory_manager.cpp   # C++ Memory manager unit test suite
├── phase1/                       # Original Phase 1 C++ implementation
│   ├── os_phase1.cpp
│   ├── input.txt
│   └── output.txt
├── phase2/                       # Original Phase 2 C++ implementation
│   ├── os_phase2.cpp
│   ├── input.txt
│   └── output.txt
├── wasm/                         # Emscripten WebAssembly C++ engine
│   ├── os_engine.cpp             # Unified C++ engine with Embind
│   ├── scheduler_wasm.cpp        # CPU scheduler WASM bindings
│   ├── process_manager_wasm.cpp  # Process manager WASM bindings
│   ├── memory_manager_wasm.cpp   # Memory manager WASM bindings
│   ├── Makefile                  # Build rules for emcc
│   ├── build_wasm.sh             # Linux/macOS build script
│   ├── build_wasm.bat            # Windows build script
│   └── README.md
├── src/                          # Interactive React + TS Application
│   ├── components/               # Modular UI Components
│   │   ├── memory/               # Memory Management Modules
│   │   │   ├── MemoryManagerDashboard.tsx        # Unified memory hub tabs
│   │   │   ├── PageReplacementVisualizer.tsx     # FIFO, LRU, Optimal step simulation
│   │   │   ├── ContiguousAllocationVisualizer.tsx# First, Best, Worst Fit visualizer
│   │   │   └── MemoryComparisonMatrix.tsx        # Side-by-side comparison matrix
│   │   ├── process/              # Process Management Modules
│   │   ├── scheduler/            # CPU Scheduling Modules
│   │   ├── Navbar.tsx            # Controls, mode switcher, speed slider
│   │   ├── Sidebar.tsx           # Navigation and live metrics
│   │   ├── Overview.tsx          # System dashboard & KPIs
│   │   ├── InteractiveSimulator.tsx # Step-by-step CPU execution
│   │   ├── MemoryVisualizer.tsx  # Physical memory grid inspector
│   │   ├── PagingManager.tsx     # Page table & MMU address translator
│   │   ├── InterruptInspector.tsx# MOS interrupt decision table
│   │   ├── JobEditor.tsx         # Input card editor & output terminal
│   │   ├── StudyGuideLab.tsx     # Viva prep & study guide
│   │   └── WasmArchitecture.tsx  # Emscripten & WebAssembly diagnostics
│   ├── engine/                   # Core Simulation Logic
│   │   ├── memoryManagerTypes.ts # Memory data contracts & interfaces
│   │   ├── memoryPresets.ts      # Standard benchmarks & presets
│   │   ├── memoryManagerEngine.ts# High-fidelity memory parity engine
│   │   ├── types.ts              # System types, registers, PCB, memory
│   │   ├── presets.ts            # Test jobs & edge cases
│   │   ├── simulationEngine.ts   # 100% faithful TypeScript VM engine
│   │   └── cppWasmLoader.ts      # WebAssembly runtime loader
│   ├── App.tsx                   # Main application router & state
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Tailwind CSS styling
├── Study_Guide.md                # Comprehensive viva & algorithm guide
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## 📜 Input File Format (`input.txt`)

Each job card format consists of:
- `$AMJ` (Allocate Main Job): 4-digit Job ID + 4-digit TTL (Time Limit) + 4-digit TLL (Line Limit).
- Program Cards: 4-byte packed instructions (`GD`, `PD`, `LR`, `SR`, `CR`, `BT`, `H`).
- `$DTA`: Marks the start of data cards.
- Data Cards: 40-character maximum per line.
- `$END`: 4-digit Job ID confirming completion.

Example:
```text
$AMJ000200150003
GD10GD30GD40GD50LR20CR30BT09PD50HPD40
$DTA
VIT
VIIT
IS SAME
NOT SAME
$END0002
```

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.
