import {
  PhaseMode,
  Registers,
  PCB,
  MemoryWord,
  PageTableEntry,
  AddressTranslationResult,
  LogEntry,
  SimulationSnapshot
} from './types';

export class SimulationEngine {
  private phaseMode: PhaseMode = 2;

  // Phase 1 Memory: 100 rows x 4 chars
  private M1: string[][] = Array.from({ length: 100 }, () => [' ', ' ', ' ', ' ']);

  // Phase 2 Memory: 300 rows x 4 chars (30 blocks of 10 words)
  private M2: string[][] = Array.from({ length: 300 }, () => [' ', ' ', ' ', ' ']);
  private blockUsed: boolean[] = Array(30).fill(false);

  // Registers
  private IR: string[] = [' ', ' ', ' ', ' '];
  private R: string[] = [' ', ' ', ' ', ' '];
  private IC: number = 0;
  private C: boolean = false;
  private SI: number = 0;
  private PI: number = 0;
  private TI: number = 0;
  private PTR: number = 0;
  private terminateFlag: boolean = false;

  // PCB
  private pcb: PCB = {
    jobID: 0,
    TTL: 0,
    TLL: 0,
    TTC: 0,
    LLC: 0
  };

  // I/O & Tracking
  private inputLines: string[] = [];
  private inputLineIdx: number = 0;
  private outputBuffer: string = '';
  private logs: LogEntry[] = [];
  private currentCycle: number = 0;
  private lastTranslation?: AddressTranslationResult;
  private lastDecodedOpcode?: string;
  private lastOperandVA?: number;
  private lastOperandRA?: number;
  private terminationReason?: string;

  constructor(mode: PhaseMode = 2) {
    this.phaseMode = mode;
    this.reset();
  }

  public setPhase(mode: PhaseMode) {
    this.phaseMode = mode;
    this.reset();
  }

  public getPhase(): PhaseMode {
    return this.phaseMode;
  }

  public reset() {
    this.M1 = Array.from({ length: 100 }, () => [' ', ' ', ' ', ' ']);
    this.M2 = Array.from({ length: 300 }, () => [' ', ' ', ' ', ' ']);
    this.blockUsed = Array(30).fill(false);

    this.IR = [' ', ' ', ' ', ' '];
    this.R = [' ', ' ', ' ', ' '];
    this.IC = 0;
    this.C = false;
    this.SI = 0;
    this.PI = 0;
    this.TI = 0;
    this.PTR = 0;
    this.terminateFlag = false;

    this.pcb = {
      jobID: 0,
      TTL: 0,
      TLL: 0,
      TTC: 0,
      LLC: 0
    };

    this.inputLines = [];
    this.inputLineIdx = 0;
    this.outputBuffer = '';
    this.logs = [];
    this.currentCycle = 0;
    this.lastTranslation = undefined;
    this.lastDecodedOpcode = undefined;
    this.lastOperandVA = undefined;
    this.lastOperandRA = undefined;
    this.terminationReason = undefined;

    this.addLog('SYSTEM', 'info', `OS Engine reset. Active Mode: Phase ${this.phaseMode}`);
  }

  private addLog(category: LogEntry['category'], level: LogEntry['level'], message: string) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      category,
      level,
      message
    };
    this.logs.push(entry);
    if (this.logs.length > 500) this.logs.shift();
  }

  public allocateBlock(): number {
    let block = 0;
    let attempts = 0;
    do {
      block = Math.floor(Math.random() * 30);
      attempts++;
      if (attempts > 500) {
        // Fallback to first available block
        for (let i = 0; i < 30; i++) {
          if (!this.blockUsed[i]) {
            block = i;
            break;
          }
        }
        break;
      }
    } while (this.blockUsed[block]);

    this.blockUsed[block] = true;
    return block;
  }

  public addressMap(va: number): AddressTranslationResult {
    const pageNum = Math.floor(va / 10);
    const offset = va % 10;
    const pteAddress = this.PTR * 10 + pageNum;

    const res: AddressTranslationResult = {
      va,
      pageNum,
      offset,
      pteAddress,
      frame: null,
      ra: null,
      pi: 0,
      isFault: false,
      reason: 'OK'
    };

    if (va < 0 || va >= 100) {
      res.pi = 2; // Operand Error
      res.reason = 'Operand Error: Virtual Address outside valid bounds (00 - 99)';
      return res;
    }

    const pte = this.M2[pteAddress];
    if (!pte || pte[0] === '*') {
      res.pi = 3; // Page Fault
      res.isFault = true;
      res.reason = `Page Fault: Page ${pageNum} is not yet mapped in Page Table (PTE marked '*').`;
      return res;
    }

    const d1 = parseInt(pte[2], 10);
    const d2 = parseInt(pte[3], 10);
    if (isNaN(d1) || isNaN(d2)) {
      res.pi = 2;
      res.reason = 'Corrupt Page Table Entry';
      return res;
    }

    const frame = d1 * 10 + d2;
    res.frame = frame;
    res.ra = frame * 10 + offset;
    return res;
  }

  public loadJob(rawCode: string): boolean {
    this.reset();
    const lines = rawCode
      .split('\n')
      .map(l => l.replace(/\r$/, '').trimEnd())
      .filter(l => l.trim().length > 0);

    if (lines.length === 0) {
      this.addLog('LOADER', 'error', 'No input provided.');
      return false;
    }

    this.inputLines = lines;
    this.inputLineIdx = 0;

    const firstCard = this.inputLines[this.inputLineIdx++];
    if (!firstCard.startsWith('$AMJ')) {
      this.addLog('LOADER', 'error', `First card must start with $AMJ. Found: ${firstCard}`);
      return false;
    }

    if (this.phaseMode === 1) {
      // Phase 1: Sequential Loading into M1
      this.addLog('LOADER', 'info', `[Phase 1] Loaded Control Card ${firstCard}. Initializing sequential memory.`);
      let m = 0;
      while (this.inputLineIdx < this.inputLines.length) {
        const line = this.inputLines[this.inputLineIdx++];
        if (line.startsWith('$DTA')) {
          this.addLog('LOADER', 'success', '[Phase 1] $DTA card found. Ready for execution.');
          break;
        }
        if (m >= 100) {
          this.addLog('LOADER', 'error', 'Memory capacity exceeded 100 words.');
          break;
        }
        let k = 0;
        for (let i = 0; i < 10 && k < line.length; i++) {
          for (let j = 0; j < 4 && k < line.length; j++) {
            this.M1[m + i][j] = line[k++];
          }
        }
        m += 10;
      }
      return true;
    } else {
      // Phase 2: Paging & PCB Setup
      try {
        this.pcb.jobID = parseInt(firstCard.substring(4, 8), 10) || 1;
        this.pcb.TTL = parseInt(firstCard.substring(8, 12), 10) || 15;
        this.pcb.TLL = parseInt(firstCard.substring(12, 16), 10) || 5;
      } catch {
        this.pcb.jobID = 1;
        this.pcb.TTL = 15;
        this.pcb.TLL = 5;
      }
      this.pcb.TTC = 0;
      this.pcb.LLC = 0;

      // Allocate block for Page Table (PTR)
      this.PTR = this.allocateBlock();
      for (let i = 0; i < 10; i++) {
        this.M2[this.PTR * 10 + i] = ['*', '*', '*', '*'];
      }

      this.addLog(
        'LOADER',
        'info',
        `Job ID ${this.pcb.jobID} initialized | TTL: ${this.pcb.TTL} | TLL: ${this.pcb.TLL} | Page Table allocated at Frame ${this.PTR} (RA=${this.PTR * 10})`
      );

      // Load program instructions into randomly allocated frames
      while (this.inputLineIdx < this.inputLines.length) {
        const line = this.inputLines[this.inputLineIdx++];
        if (line.startsWith('$DTA')) {
          this.addLog('LOADER', 'success', '$DTA marker reached. Program pages mapped. Execution ready at IC=0.');
          break;
        }

        // Allocate a frame and find the first empty PTE
        const frame = this.allocateBlock();
        let pageNum = -1;
        for (let i = 0; i < 10; i++) {
          if (this.M2[this.PTR * 10 + i][0] === '*') {
            pageNum = i;
            const f1 = Math.floor(frame / 10).toString();
            const f2 = (frame % 10).toString();
            this.M2[this.PTR * 10 + i] = [' ', ' ', f1, f2];
            this.addLog('PAGING', 'info', `Page ${pageNum} allocated in Frame ${frame} (RA=${frame * 10})`);
            break;
          }
        }

        // Load 10 words into frame
        let i = 0;
        let m = 0;
        const len = line.length;
        while (i < len && m < 10) {
          const word = [' ', ' ', ' ', ' '];
          if (line[i] === 'H') {
            word[0] = 'H';
            i += 1;
          } else {
            for (let j = 0; j < 4 && i + j < len; j++) {
              word[j] = line[i + j];
            }
            i += 4;
          }
          this.M2[frame * 10 + m] = word;
          m++;
        }
      }
      return true;
    }
  }

  public step(): boolean {
    if (this.terminateFlag) return false;
    this.currentCycle++;

    if (this.phaseMode === 1) {
      return this.stepPhase1();
    } else {
      return this.stepPhase2();
    }
  }

  private stepPhase1(): boolean {
    if (this.IC >= 100) {
      this.terminateFlag = true;
      this.addLog('CPU', 'error', 'Instruction counter exceeded memory limit.');
      return false;
    }

    this.IR = [...this.M1[this.IC]];
    const currentIC = this.IC;
    this.IC++;

    const opcode = this.IR[0] + this.IR[1];
    this.lastDecodedOpcode = opcode;
    const irStr = this.IR.join('');
    this.addLog('CPU', 'info', `[Fetch] IC=${currentIC} | IR='${irStr}'`);

    const d1 = parseInt(this.IR[2], 10);
    const d2 = parseInt(this.IR[3], 10);
    const address = !isNaN(d1) && !isNaN(d2) ? d1 * 10 + d2 : -1;
    this.lastOperandVA = address;
    this.lastOperandRA = address;

    if (opcode === 'LR') {
      if (address >= 0 && address < 100) {
        this.R = [...this.M1[address]];
        this.addLog('CPU', 'info', `[LR] Loaded M[${address}] ('${this.R.join('')}') into Register R.`);
      }
    } else if (opcode === 'SR') {
      if (address >= 0 && address < 100) {
        this.M1[address] = [...this.R];
        this.addLog('CPU', 'info', `[SR] Stored Register R ('${this.R.join('')}') into M[${address}].`);
      }
    } else if (opcode === 'CR') {
      if (address >= 0 && address < 100) {
        this.C = true;
        for (let i = 0; i < 4; i++) {
          if (this.R[i] !== this.M1[address][i]) {
            this.C = false;
            break;
          }
        }
        this.addLog('CPU', 'info', `[CR] Compared R ('${this.R.join('')}') with M[${address}] ('${this.M1[address].join('')}') -> C=${this.C}`);
      }
    } else if (opcode === 'BT') {
      if (this.C) {
        this.IC = address;
        this.addLog('CPU', 'info', `[BT] Branch taken! IC set to ${address}.`);
      } else {
        this.addLog('CPU', 'info', '[BT] Branch not taken (C=false).');
      }
    } else if (opcode === 'GD') {
      this.SI = 1;
      this.addLog('INTERRUPT', 'warn', `[SI=1] Supervisor Interrupt: READ initiated for M[${address}].`);
      if (this.inputLineIdx < this.inputLines.length) {
        const dataLine = this.inputLines[this.inputLineIdx++];
        if (dataLine.startsWith('$END')) {
          this.addLog('INTERRUPT', 'error', 'Abort: Out of Data.');
          this.terminateFlag = true;
          return false;
        }
        let k = 0;
        for (let i = 0; i < 10 && k < dataLine.length; i++) {
          for (let j = 0; j < 4 && k < dataLine.length; j++) {
            this.M1[address + i][j] = dataLine[k++];
          }
        }
        this.addLog('IO', 'success', `Read line "${dataLine}" into memory starting at block ${address}.`);
      }
      this.SI = 0;
    } else if (opcode === 'PD') {
      this.SI = 2;
      this.addLog('INTERRUPT', 'warn', `[SI=2] Supervisor Interrupt: WRITE from M[${address}].`);
      let out = '';
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 4; j++) {
          const ch = this.M1[address + i][j];
          if (ch !== '\0' && ch !== ' ') out += ch;
        }
      }
      this.outputBuffer += out + '\n';
      this.addLog('IO', 'success', `Output written: "${out}"`);
      this.SI = 0;
    } else if (this.IR[0] === 'H') {
      this.SI = 3;
      this.terminateFlag = true;
      this.outputBuffer += '\n\n';
      this.addLog('INTERRUPT', 'success', '[SI=3] Halt executed. Program terminated successfully.');
      this.SI = 0;
      return false;
    }

    return !this.terminateFlag;
  }

  private stepPhase2(): boolean {
    if (this.terminateFlag) return false;

    // 1. Translate IC to Real Address
    const icMap = this.addressMap(this.IC);
    this.lastTranslation = icMap;

    if (icMap.pi !== 0) {
      this.PI = icMap.pi;
      this.handleMOS();
      return !this.terminateFlag;
    }

    const ra = icMap.ra!;
    this.IR = [...this.M2[ra]];
    const prevIC = this.IC;
    this.IC++;

    // Increment TTC (Total Time Counter)
    this.pcb.TTC++;
    if (this.pcb.TTC >= this.pcb.TTL) {
      this.TI = 2;
    }

    const irStr = this.IR.join('');
    this.addLog(
      'CPU',
      'info',
      `[Fetch] IC=${prevIC} -> RA=${ra} | IR='${irStr}' | TTC=${this.pcb.TTC}/${this.pcb.TTL}`
    );

    // Halt check
    if (this.IR[0] === 'H') {
      this.SI = 3;
      this.lastDecodedOpcode = 'H';
      this.handleMOS();
      return !this.terminateFlag;
    }

    const op = this.IR[0] + this.IR[1];
    this.lastDecodedOpcode = op;

    // Check opcode validity
    const validOps = ['LR', 'SR', 'CR', 'BT', 'GD', 'PD'];
    if (!validOps.includes(op)) {
      this.PI = 1; // Operation Code Error
      this.addLog('INTERRUPT', 'error', `Invalid Opcode detected: '${op}' -> PI=1`);
      this.handleMOS();
      return !this.terminateFlag;
    }

    // GD and SR take 2 time units
    if (op === 'GD' || op === 'SR') {
      this.pcb.TTC++;
      if (this.pcb.TTC >= this.pcb.TTL) {
        this.TI = 2;
      }
    }

    // Check operand validity
    const c1 = this.IR[2];
    const c2 = this.IR[3];
    if (!/^\d$/.test(c1) || !/^\d$/.test(c2)) {
      this.PI = 2; // Operand Error
      this.addLog('INTERRUPT', 'error', `Invalid Operand digits in IR '${irStr}' -> PI=2`);
      this.handleMOS();
      return !this.terminateFlag;
    }

    const va = parseInt(c1, 10) * 10 + parseInt(c2, 10);
    this.lastOperandVA = va;
    const opMap = this.addressMap(va);
    this.lastTranslation = opMap;

    if (opMap.pi !== 0) {
      this.PI = opMap.pi;
      this.addLog('INTERRUPT', 'warn', `Operand Address Translation Interrupt: PI=${this.PI} (${opMap.reason})`);
      this.handleMOS();
      return !this.terminateFlag;
    }

    const ra_op = opMap.ra!;
    this.lastOperandRA = ra_op;

    if (op === 'LR') {
      this.R = [...this.M2[ra_op]];
      this.addLog('CPU', 'info', `[LR] Loaded RA=${ra_op} ('${this.R.join('')}') into R.`);
    } else if (op === 'SR') {
      this.M2[ra_op] = [...this.R];
      this.addLog('CPU', 'info', `[SR] Stored R ('${this.R.join('')}') into RA=${ra_op}.`);
    } else if (op === 'CR') {
      const temp = this.M2[ra_op];
      this.C = true;
      for (let i = 0; i < 4; i++) {
        if (this.R[i] !== temp[i]) {
          this.C = false;
          break;
        }
      }
      this.addLog('CPU', 'info', `[CR] Compared R with RA=${ra_op} -> C=${this.C}`);
    } else if (op === 'BT') {
      if (this.C) {
        this.IC = va;
        this.addLog('CPU', 'info', `[BT] C=true. Jumped IC to virtual address ${va}.`);
      } else {
        this.addLog('CPU', 'info', '[BT] C=false. No branch.');
      }
    } else if (op === 'GD') {
      this.SI = 1;
      this.handleMOS();
    } else if (op === 'PD') {
      this.SI = 2;
      this.handleMOS();
    }

    if (this.TI !== 0 && !this.terminateFlag) {
      this.handleMOS();
    }

    return !this.terminateFlag;
  }

  // Master Operating Subroutine (Decision Table)
  private handleMOS() {
    if (this.TI === 0) {
      if (this.SI === 1) {
        this.readPhase2();
        this.SI = 0;
      } else if (this.SI === 2) {
        this.writePhase2();
        this.SI = 0;
      } else if (this.SI === 3) {
        this.terminatePhase2(0);
        this.SI = 0;
      } else if (this.PI === 1) {
        this.terminatePhase2(4);
        this.PI = 0;
      } else if (this.PI === 2) {
        this.terminatePhase2(5);
        this.PI = 0;
      } else if (this.PI === 3) {
        const op = this.IR[0] + this.IR[1];
        if (op === 'GD' || op === 'SR') {
          // Valid Page Fault: Demand Paging!
          const va = parseInt(this.IR[2], 10) * 10 + parseInt(this.IR[3], 10);
          const pageNum = Math.floor(va / 10);
          const frame = this.allocateBlock();
          const f1 = Math.floor(frame / 10).toString();
          const f2 = (frame % 10).toString();
          this.M2[this.PTR * 10 + pageNum] = [' ', ' ', f1, f2];
          this.PI = 0;
          this.IC--; // Re-execute instruction
          this.pcb.TTC -= 2; // Rollback TTC
          this.addLog(
            'PAGING',
            'success',
            `[DEMAND PAGING] Valid Page Fault resolved for Page ${pageNum} -> Frame ${frame} (RA=${frame * 10}). Re-executing instruction.`
          );
        } else {
          this.terminatePhase2(6); // Invalid Page Fault
          this.PI = 0;
        }
      }
    } else if (this.TI === 2) {
      if (this.SI === 1) {
        this.terminatePhase2(3);
      } else if (this.SI === 2) {
        this.writePhase2();
        if (!this.terminateFlag) this.terminatePhase2(3);
      } else if (this.SI === 3) {
        this.terminatePhase2(0);
      } else if (this.PI === 1) {
        this.terminatePhase2(3, 4);
      } else if (this.PI === 2) {
        this.terminatePhase2(3, 5);
      } else if (this.PI === 3) {
        this.terminatePhase2(3);
      } else {
        this.terminatePhase2(3);
      }
      this.TI = 0;
    }
  }

  private readPhase2() {
    if (this.inputLineIdx >= this.inputLines.length) return;
    const line = this.inputLines[this.inputLineIdx++];

    if (line.startsWith('$END')) {
      this.terminatePhase2(1); // Out of Data
      return;
    }

    const va = parseInt(this.IR[2], 10) * 10 + parseInt(this.IR[3], 10);
    const res = this.addressMap(va);
    if (res.ra === null) return;

    let padded = line;
    while (padded.length < 40) padded += ' ';

    for (let i = 0; i < 10; i++) {
      const word = [' ', ' ', ' ', ' '];
      for (let j = 0; j < 4; j++) {
        word[j] = padded[i * 4 + j];
      }
      this.M2[res.ra + i] = word;
    }
    this.addLog('IO', 'success', `[SI=1] Read data into RA=${res.ra} (Page ${res.pageNum}, Frame ${res.frame})`);
  }

  private writePhase2() {
    this.pcb.LLC++;
    if (this.pcb.LLC > this.pcb.TLL) {
      this.terminatePhase2(2); // Line Limit Exceeded
      return;
    }

    const va = parseInt(this.IR[2], 10) * 10 + parseInt(this.IR[3], 10);
    const res = this.addressMap(va);
    if (res.ra === null) return;

    let line = '';
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 4; j++) {
        line += this.M2[res.ra + i][j];
      }
    }
    this.outputBuffer += line + '\n';
    this.addLog('IO', 'success', `[SI=2] Write to output from RA=${res.ra} | LLC=${this.pcb.LLC}/${this.pcb.TLL}`);
  }

  private terminatePhase2(em1: number, em2?: number) {
    this.terminateFlag = true;

    const errorMsg = (code: number) => {
      switch (code) {
        case 0: return ' - NO ERROR';
        case 1: return ' - OUT OF DATA';
        case 2: return ' - LINE LIMIT EXCEEDED';
        case 3: return ' - TIME LIMIT EXCEEDED';
        case 4: return ' - OPERATION CODE ERROR';
        case 5: return ' - OPERAND ERROR';
        case 6: return ' - INVALID PAGE FAULT';
        default: return ' - UNKNOWN ERROR';
      }
    };

    let reason = errorMsg(em1);
    if (em2 !== undefined && em2 >= 0) {
      reason += ' & ' + errorMsg(em2);
    }
    this.terminationReason = reason;

    const formattedJobID = String(this.pcb.jobID).padStart(4, '0');
    const formattedIC = String(this.IC).padStart(2, '0');
    const irStr = this.IR.join('');

    const terminationBlock =
      `\nJOB ID: ${formattedJobID}${reason}\n` +
      `IC: ${formattedIC}  IR: ${irStr}  TTC: ${this.pcb.TTC}  LLC: ${this.pcb.LLC}\n\n\n`;

    this.outputBuffer += terminationBlock;
    this.addLog('SYSTEM', 'warn', `Job Terminated: ${reason} (IC=${formattedIC}, IR=${irStr}, TTC=${this.pcb.TTC})`);
  }

  public runAll() {
    let steps = 0;
    while (!this.terminateFlag && steps < 5000) {
      if (!this.step()) break;
      steps++;
    }
  }

  public getSnapshot(): SimulationSnapshot {
    const rawMem = this.phaseMode === 1 ? this.M1 : this.M2;
    const memoryWords: MemoryWord[] = rawMem.map((wordArr, idx) => {
      const content = wordArr.join('');
      const frame = Math.floor(idx / 10);
      const offset = idx % 10;

      let type: MemoryWord['type'] = 'free';
      if (this.phaseMode === 2) {
        if (frame === this.PTR) {
          type = 'pagetable';
        } else if (this.blockUsed[frame]) {
          type = content.trim().length > 0 ? 'code' : 'data';
        }
      } else {
        type = content.trim().length > 0 ? 'code' : 'free';
      }

      const isHighlighted =
        this.phaseMode === 1
          ? idx === this.IC - 1 || (this.lastOperandRA !== undefined && idx >= this.lastOperandRA && idx < this.lastOperandRA + 10)
          : (this.lastOperandRA !== undefined && idx >= this.lastOperandRA && idx < this.lastOperandRA + 10);

      return {
        address: idx,
        content,
        type,
        frame,
        offset,
        isHighlighted
      };
    });

    const pageTableEntries: PageTableEntry[] = [];
    if (this.phaseMode === 2) {
      for (let i = 0; i < 10; i++) {
        const pteArr = this.M2[this.PTR * 10 + i] || ['*', '*', '*', '*'];
        const rawPte = pteArr.join('');
        const isFault = pteArr[0] === '*';
        let frameVal: number | null = null;
        if (!isFault) {
          const d1 = parseInt(pteArr[2], 10);
          const d2 = parseInt(pteArr[3], 10);
          if (!isNaN(d1) && !isNaN(d2)) frameVal = d1 * 10 + d2;
        }

        pageTableEntries.push({
          page: i,
          frame: frameVal,
          rawPte,
          isAllocated: !isFault
        });
      }
    }

    return {
      phase: this.phaseMode,
      registers: {
        IR: this.IR.join(''),
        R: this.R.join(''),
        IC: this.IC,
        C: this.C,
        SI: this.SI,
        PI: this.PI,
        TI: this.TI,
        PTR: this.PTR,
        terminateFlag: this.terminateFlag
      },
      pcb: { ...this.pcb },
      memory: memoryWords,
      pageTable: pageTableEntries,
      output: this.outputBuffer,
      logs: [...this.logs],
      currentCycle: this.currentCycle,
      lastDecodedOpcode: this.lastDecodedOpcode,
      lastOperandVA: this.lastOperandVA,
      lastOperandRA: this.lastOperandRA,
      lastTranslation: this.lastTranslation,
      isTerminated: this.terminateFlag,
      terminationReason: this.terminationReason
    };
  }
}
