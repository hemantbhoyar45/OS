# Operating Systems Course Project - Ultimate Study Guide

This guide is designed to prepare you for your demonstration, especially for answering conceptual questions and rewriting core algorithms from memory. 

---

## 1. The Big Picture: What is this project?
You are building a **simulated Operating System (OS)**. Real OSs (like Windows or Linux) sit between the user's programs and the computer's hardware. Your code does exactly this, but in a simplified environment.

Your OS reads "Jobs" (programs) from an input text file, loads them into its own simulated "Memory", executes their instructions step-by-step, and writes the output to another text file.

### The Job Format (input.txt)
Each job comes with a few control cards:
- `$AMJ` (Allocate Main Job): Tells your OS a new job is starting. It gives the Job ID, **Total Time Limit (TTL)**, and **Total Line Limit (TLL)**.
- **Instructions**: The actual code the job wants to run (e.g., `GD10`, `PD20`, `H`).
- `$DTA` (Data): Marks the end of instructions and the start of input data that the job might want to read.
- `Data Lines`: The actual input data.
- `$END`: Marks the end of the job.

---

## 2. The OS Hardware (Simulated)
Your OS needs "hardware" to run on. You simulated this using variables and arrays:

### Main Memory (`M`)
- **Phase 1**: A simple 100-row array (`M[100][4]`). 100 words, each word is 4 characters (bytes). Programs are loaded sequentially from the top.
- **Phase 2**: Expanded to 300 rows (`M[300][4]`). Divided into **30 blocks** (each block has 10 words). Programs are loaded into random blocks using **Paging**.

### Registers
Registers are super-fast, tiny memory locations used to execute instructions:
- **`IR` (Instruction Register, 4 chars)**: Holds the instruction currently being executed (e.g., `G`, `D`, `1`, `0`).
- **`R` (General Register, 4 chars)**: Used for data manipulation, comparing, and temporarily holding data.
- **`IC` (Instruction Counter, Integer)**: Keeps track of the address of the *next* instruction to be executed.
- **`C` (Toggle Flag, Boolean)**: True/False flag used for branching (like `if` statements). Set by the Compare (`CR`) instruction.
- **`PTR` (Page Table Register, Integer) [Phase 2]**: Points to the block in memory where the Page Table is stored.

### Interrupts
Interrupts are signals telling the OS "Hey, stop what you are doing, I need attention!"
- **`SI` (Supervisor Interrupt)**: Triggered when a program wants the OS to do something it can't do itself (like reading/writing files). 
    - 1 = Read Data (`GD`)
    - 2 = Write Data (`PD`)
    - 3 = Halt/Terminate (`H`)
- **`PI` (Program Interrupt) [Phase 2]**: Triggered by errors.
    - 1 = Opcode Error (Invalid instruction like `XX10`)
    - 2 = Operand Error (Invalid address like `GD999`)
    - 3 = Page Fault (Tried to access a page not loaded in memory)
- **`TI` (Timer Interrupt) [Phase 2]**: 
    - 2 = Time Limit Exceeded (Job ran too many instructions).

---

## 3. The Instruction Set (Assembly Language)
- **`GDXX` (Get Data)**: Reads a line from input data into memory starting at address `XX`.
- **`PDXX` (Put Data)**: Writes data from memory starting at address `XX` to the output file.
- **`H` (Halt)**: Program finished successfully.
- **`LRXX` (Load Register)**: Load data from memory `XX` into register `R`.
- **`SRXX` (Store Register)**: Store data from register `R` into memory `XX`.
- **`CRXX` (Compare Register)**: Compare data in `R` with memory `XX`. If equal, set `C = true`.
- **`BTXX` (Branch on True)**: If `C` is true, jump to instruction at address `XX` (set `IC = XX`).

---

## 4. Phase 1 vs Phase 2 (The Evolution)

**Phase 1 (Simple Batch OS)**
- No limits on execution time or output lines.
- No memory management. Jobs are loaded sequentially from address 0 to 99.
- Very basic error handling.

**Phase 2 (Multiprogramming & Paging)**
- Introduces **TTL** and **TLL**. OS prevents programs from running forever or printing infinite loops.
- Introduces **Paging**. Virtual addresses (0-99) used by the program are translated to Real addresses (0-299) in physical memory.
- Introduces **Page Faults** (Demand Paging). Memory is allocated *on-the-fly* when `GD` or `SR` instructions ask for it.

---

## 5. CORE ALGORITHMS (Memorize & Understand These for Rewriting)

If your professor erases code, it will almost certainly be one of these critical functions.

### A. The Address Map Algorithm (`ADDRESSMAP` in Phase 2)
**Goal:** Convert a 2-digit Virtual Address (VA) into a 3-digit Real Address (RA) using the Page Table.

**Logic to Memorize:**
1. Check if VA is valid (0 to 99). If not -> Set `PI = 2` (Operand error) and return -1.
2. Calculate Page Number: `pageNum = VA / 10`.
3. Calculate Offset: `offset = VA % 10`.
4. Read the Page Table Entry (PTE) from memory at `PTR * 10 + pageNum`.
5. Check if the PTE is empty (`*`). If yes -> Set `PI = 3` (Page Fault) and return -1.
6. If valid, convert the PTE block number into an integer, multiply by 10, add the offset, and return it.

**Mental Code:**
```cpp
int ADDRESSMAP(int VA) {
    if (VA < 0 || VA > 99) { PI = 2; return -1; }
    int pageNum = VA / 10;
    int offset = VA % 10;
    
    char pte[4];
    M.read(PTR * 10 + pageNum, pte); // Read from Page Table
    
    if (pte[0] == '*') { PI = 3; return -1; } // Page Fault!
    
    int realBlock = (pte[2] - '0') * 10 + (pte[3] - '0');
    return (realBlock * 10) + offset;
}
```

### B. Master Mode Subroutine / Interrupt Handler (`MOS` in Phase 2)
**Goal:** Handle System Calls (SI), Errors (PI), and Time Limits (TI). 

**Logic to Memorize:**
You use a **Decision Table**. Check `TI` first.
1. **If `TI == 0` (No Time Limit issues):**
   - Check `SI`: 1->READ(), 2->WRITE(), 3->TERMINATE(0)
   - Check `PI`: 1->TERMINATE(4), 2->TERMINATE(5)
   - If `PI == 3` (Page Fault): 
      - Check if the instruction was `GD` or `SR` (Valid Page Fault).
      - If valid: Allocate a new frame, update the Page Table, reset `PI=0`, decrement `IC` (to restart the instruction), and subtract 2 from `TTC`.
      - If not `GD/SR` (Invalid Page Fault): TERMINATE(6).

2. **If `TI == 2` (Time Limit Exceeded):**
   - Perform the requested `SI` action (READ, WRITE), but then IMMEDIATELY `TERMINATE(3)` because time is up! 
   - If there are `PI` errors alongside `TI==2`, terminate with two error codes.

### C. The Fetch-Decode-Execute Cycle (`EXECUTEUSERPROGRAM`)
**Goal:** The heart of the CPU. Continuously fetch instructions and run them.

**Logic to Memorize:**
1. Use `ADDRESSMAP` to translate `IC` to a real address.
2. Fetch the instruction from that memory address into `IR`.
3. Increment `IC` (point to the next instruction) and `TTC` (time counter).
4. Check Time Limit (`if TTC >= TTL then TI=2`).
5. **Decode:** Check if the instruction is valid (`LR`, `SR`, `CR`, `BT`, `GD`, `PD`, `H`). If not -> Set `PI=1`.
6. Get the operand (the `XX` part of `GDXX`). Use `ADDRESSMAP` to translate `XX` to a real address.
7. **Execute:** Perform the specific action for the instruction (e.g., `LR` reads memory into `R`).
8. Check if any interrupts happened. If `TI` or `PI` or `SI` is non-zero, call `MOS()`.

---

## 6. How to Handle the Demonstration
When your professor erases code and says "Rewrite it":
1. **Don't panic.** Take a deep breath.
2. **Identify the function:** Is it address mapping, memory allocation, execution loop, or interrupt handling?
3. **Say the logic out loud first.** "Okay, first I need to check if the virtual address is valid. Then I find the page number by dividing by 10..."
4. **Write the code exactly as you said it.** The logic is more important than perfect C++ syntax. If you explain *why* you are doing it, the professor will be impressed.

**Key things to remember for the demo:**
- **Page Table Location:** It is ALWAYS located at the block pointed to by `PTR`. Address is `PTR * 10`.
- **Demand Paging:** Memory isn't given to a program until it actually needs it (when `GD` or `SR` causes a valid page fault).
- **Time/Line Limits:** Make sure to increment `TTC` on every instruction, and `LLC` on every `PD` instruction, and trigger `TI=2` or Terminate(2) when they exceed `TTL` and `TLL`.
