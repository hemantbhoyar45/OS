import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Code2,
  Layers,
  Cpu,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const StudyGuideLab: React.FC = () => {
  const [openAlgorithm, setOpenAlgorithm] = useState<string | null>('addressmap');

  const algorithms = [
    {
      id: 'addressmap',
      title: 'A. Virtual Address Mapping Algorithm (ADDRESSMAP)',
      subtitle: 'Converts 2-digit Virtual Address (VA) into 3-digit Physical Address (RA)',
      steps: [
        '1. Check Virtual Address bounds: if (VA < 0 || VA >= 100) -> set PI = 2 (Operand Error) and return -1.',
        '2. Calculate Page Number: pageNum = VA / 10',
        '3. Calculate Word Offset: offset = VA % 10',
        '4. Lookup Page Table Entry (PTE) in memory at: PTR * 10 + pageNum',
        '5. Check for Page Fault: if (pte[0] == \'*\') -> set PI = 3 (Page Fault) and return -1.',
        '6. Extract allocated Frame: frame = (pte[2] - \'0\') * 10 + (pte[3] - \'0\')',
        '7. Compute Physical Real Address: RA = frame * 10 + offset'
      ],
      cppCode: `int ADDRESSMAP(int VA) {
    if (VA < 0 || VA >= 100) { 
        PI = 2; // Operand Error
        return -1; 
    }
    int pageNum = VA / 10;
    int offset  = VA % 10;
    
    char pte[4];
    M.read(PTR * 10 + pageNum, pte); // Read from Page Table
    
    if (pte[0] == '*') { 
        PI = 3; // Page Fault!
        return -1; 
    }
    
    int realBlock = (pte[2] - '0') * 10 + (pte[3] - '0');
    return (realBlock * 10) + offset;
}`
    },
    {
      id: 'mos',
      title: 'B. Master Operating Subroutine & Interrupt Handler (MOS)',
      subtitle: 'Evaluates Decision Table for SI, PI, and TI interrupts with Demand Paging',
      steps: [
        '1. If TI == 0 (Normal execution):',
        '   - SI == 1 -> READ() (get next data card)',
        '   - SI == 2 -> WRITE() (increment LLC; if LLC > TLL -> Terminate(2))',
        '   - SI == 3 -> TERMINATE(0) (Halt without error)',
        '   - PI == 1 -> TERMINATE(4) (Opcode Error)',
        '   - PI == 2 -> TERMINATE(5) (Operand Error)',
        '   - PI == 3 -> Demand Paging: if opcode is GD or SR -> allocate new frame, update Page Table, reset PI=0, rollback IC and TTC to re-execute! If opcode is other -> TERMINATE(6) [Invalid Page Fault].',
        '2. If TI == 2 (Time Limit Exceeded):',
        '   - Force job termination: Terminate(3), logging dual errors if combined with PI.'
      ],
      cppCode: `void MOS() {
    if (TI == 0) {
        if (SI == 1) { READ(); SI = 0; }
        else if (SI == 2) { WRITE(); SI = 0; }
        else if (SI == 3) { TERMINATE(0); SI = 0; }
        else if (PI == 1) { TERMINATE(4); PI = 0; }
        else if (PI == 2) { TERMINATE(5); PI = 0; }
        else if (PI == 3) {
            string op = ""; op += IR[0]; op += IR[1];
            if (op == "GD" || op == "SR") { // Valid Page Fault
                int va = getAddress();
                int pageNum = va / 10;
                int frame = ALLOCATE();
                char newPte[4] = {' ', ' ', (char)((frame/10)+'0'), (char)((frame%10)+'0')};
                M.write(PTR * 10 + pageNum, newPte);
                PI = 0;
                IC--;        // Rollback IC to re-execute instruction
                pcb.TTC -= 2;// Rollback TTC
            } else {
                TERMINATE(6); // Invalid Page Fault
                PI = 0;
            }
        }
    } else if (TI == 2) {
        if (SI == 1) TERMINATE(3);
        else if (SI == 2) { WRITE(); if (!terminateFlag) TERMINATE(3); }
        else if (SI == 3) TERMINATE(0);
        else if (PI == 1) TERMINATE(3, 4);
        else if (PI == 2) TERMINATE(3, 5);
        else if (PI == 3) TERMINATE(3);
        else TERMINATE(3);
        TI = 0;
    }
}`
    },
    {
      id: 'cycle',
      title: 'C. CPU Fetch-Decode-Execute Cycle (EXECUTEUSERPROGRAM)',
      subtitle: 'Simulates slave-mode instruction execution loop',
      steps: [
        '1. Translate IC to physical memory address via ADDRESSMAP(IC). If PI != 0 -> call MOS().',
        '2. Fetch 4-byte word from memory into Instruction Register (IR). Increment IC.',
        '3. Increment TTC (Time Counter). If TTC >= TTL -> set TI = 2.',
        '4. Decode opcode: if \'H\' -> set SI = 3. Check if valid in [LR, SR, CR, BT, GD, PD]. If not -> PI = 1.',
        '5. Decode operand address XX. Translate via ADDRESSMAP(XX).',
        '6. Execute specific instruction (load/store/compare/branch/I/O).',
        '7. If any interrupt pending (SI, PI, TI) -> call MOS().'
      ],
      cppCode: `void EXECUTEUSERPROGRAM() {
    while (!terminateFlag) {
        int ra = ADDRESSMAP(IC);
        if (PI != 0) { MOS(); continue; }

        M.read(ra, IR);
        IC++;
        pcb.TTC++;
        if (pcb.TTC >= pcb.TTL) TI = 2;

        if (IR[0] == 'H') { SI = 3; MOS(); continue; }

        string op = ""; op += IR[0]; op += IR[1];
        if (op != "LR" && op != "SR" && op != "CR" && op != "BT" && op != "GD" && op != "PD") {
            PI = 1; MOS(); continue;
        }

        int va = getAddress();
        if (PI != 0) { MOS(); continue; }
        int ra_op = ADDRESSMAP(va);
        if (PI != 0) { MOS(); continue; }

        // Execute opcode...
        if (TI != 0 && !terminateFlag) MOS();
    }
}`
    }
  ];

  const vivaQuestions = [
    {
      q: '1. What is the fundamental difference between Phase 1 and Phase 2?',
      a: 'Phase 1 is a simple sequential batch system: jobs are loaded directly into M[100][4] at fixed contiguous addresses with no time or line limits and only SI interrupts. Phase 2 introduces multiprogramming, random block allocation, virtual-to-physical paging with PTR, demand paging for valid page faults (GD/SR), line & time limit enforcement (TLL/TTL), and a full interrupt decision table (SI, PI, TI).'
    },
    {
      q: '2. Where is the Page Table stored in memory in Phase 2?',
      a: 'The Page Table is stored in one randomly allocated 10-word block (frame) in main memory. The starting block number is stored in the Page Table Register (PTR), so the page table words reside at memory indices: PTR * 10 through PTR * 10 + 9.'
    },
    {
      q: '3. What distinguishes a Valid Page Fault from an Invalid Page Fault?',
      a: 'When an instruction accesses an unallocated page (marked with \'*\' in the page table), a Page Fault (PI=3) occurs. If the instruction is GD (Get Data) or SR (Store Register), it is considered a VALID Page Fault: the OS allocates a new frame on-the-fly (demand paging), updates the PTE, and rolls back IC so the instruction re-executes. If any other instruction (like LR, CR, PD) accesses an unallocated page, it is an INVALID Page Fault, terminating the job with Error Code 6.'
    },
    {
      q: '4. How is the 2-digit Virtual Address (VA) converted into a Real Address (RA)?',
      a: 'The MMU computes pageNum = VA / 10 and offset = VA % 10. It reads the PTE at PTR*10 + pageNum. If valid, it extracts the 2-digit frame number. The final real address is: RA = (frame * 10) + offset.'
    },
    {
      q: '5. Why are IC and TTC decremented upon resolving a valid page fault?',
      a: 'Because the CPU fetched the instruction and advanced IC before discovering the page was missing. To actually execute the instruction now that the page frame has been allocated, the OS must rollback IC (IC--) so the CPU re-fetches it. TTC is also rolled back to prevent charging the user program double time units for the fault resolution.'
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
              OS Course Project Study Guide & Viva Preparation Lab
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Study_Guide.md
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Master the core algorithms, rewrite logic from memory, and prepare for presentation/viva questioning.
          </p>
        </div>
      </div>

      {/* Core Algorithms Accordion */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Code2 className="w-4 h-4 text-cyan-400" />
          Core Algorithms to Memorize (Demonstration Prep)
        </h3>
        <p className="text-xs text-slate-400">
          If your professor asks you to rewrite an algorithm on the whiteboard or screen, it will be one of these:
        </p>

        <div className="space-y-3">
          {algorithms.map((algo) => {
            const isOpen = openAlgorithm === algo.id;
            return (
              <div
                key={algo.id}
                className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenAlgorithm(isOpen ? null : algo.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-900/50 transition-colors"
                >
                  <div>
                    <h4 className="text-sm font-bold text-white">{algo.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{algo.subtitle}</p>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {isOpen && (
                  <div className="p-4 border-t border-slate-800/80 space-y-4">
                    <div className="space-y-1.5 text-xs text-slate-300 font-mono">
                      <div className="text-[11px] font-sans font-semibold text-slate-400 uppercase tracking-wider">
                        Step-by-Step Logic:
                      </div>
                      {algo.steps.map((st, i) => (
                        <div key={i} className="pl-2 border-l-2 border-indigo-500/50">
                          {st}
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className="text-[11px] font-sans font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Clean C++ Implementation:
                      </div>
                      <pre className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto leading-relaxed">
                        {algo.cppCode}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Viva / Interview Questions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          High-Yield Viva / Oral Examination Questions
        </h3>

        <div className="space-y-3">
          {vivaQuestions.map((vq, idx) => (
            <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-white text-sm flex items-start gap-2">
                <span className="text-indigo-400 font-mono">Q:</span>
                <span>{vq.q}</span>
              </div>
              <div className="text-slate-300 pl-6 leading-relaxed">
                <strong className="text-emerald-400">Answer: </strong>
                {vq.a}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
