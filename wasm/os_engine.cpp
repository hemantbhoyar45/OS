/**
 * WebAssembly C++ Engine wrapper for Multiprogramming Operating System (MOS)
 * Encapsulates Phase 1 (Sequential) & Phase 2 (Paging + Interrupts)
 * Compiles with Emscripten (emcc) into WebAssembly (.wasm + .js)
 */

#include <iostream>
#include <sstream>
#include <vector>
#include <string>
#include <cstring>
#include <cstdlib>
#include <ctime>
#include <iomanip>
#include "../cpp/deadlock_manager.hpp"
#include "../cpp/disk_scheduler.hpp"

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
using namespace emscripten;
#endif

// ==========================================
// Phase 2 Constants & Structures
// ==========================================
const int P2_MEM_SIZE = 300;
const int P2_BLOCK_SIZE = 10;
const int P2_NUM_BLOCKS = 30;
const int WORD_SIZE = 4;

struct PCB {
    int jobID;
    int TTL;
    int TLL;
    int TTC;
    int LLC;
};

struct Registers {
    std::string IR;
    std::string R;
    int IC;
    bool C;
    int SI;
    int PI;
    int TI;
    int PTR;
    bool terminateFlag;
};

struct PageTableEntry {
    int pageNum;
    int frameNum;
    bool isValid;
};

struct AddressTranslationResult {
    int va;
    int pageNum;
    int offset;
    int pteAddr;
    int frame;
    int ra;
    int pi;
    bool isFault;
    std::string reason;
};

class MOSEngine {
private:
    int phaseMode; // 1 = Phase 1 (100 words), 2 = Phase 2 (300 words)

    // Memory representation: [rows][4]
    char M1[100][4];
    char M2[P2_MEM_SIZE][4];
    bool blockUsed[P2_NUM_BLOCKS];

    // Registers
    char IR[4];
    char R[4];
    int IC;
    bool C;
    int SI;
    int PI;
    int TI;
    int PTR;
    bool terminateFlag;

    PCB pcb;

    // Stream buffers
    std::vector<std::string> inputLines;
    size_t inputLineIdx;
    std::string outputBuffer;
    std::vector<std::string> executionLogs;
    std::string lastErrorReason;

public:
    MOSEngine(int mode = 2) {
        phaseMode = mode;
        reset();
    }

    void setPhaseMode(int mode) {
        phaseMode = mode;
        reset();
    }

    int getPhaseMode() const {
        return phaseMode;
    }

    void reset() {
        // Clear Phase 1 memory
        for (int i = 0; i < 100; ++i) {
            for (int j = 0; j < 4; ++j) {
                M1[i][j] = ' ';
            }
        }

        // Clear Phase 2 memory
        for (int i = 0; i < P2_MEM_SIZE; ++i) {
            for (int j = 0; j < WORD_SIZE; ++j) {
                M2[i][j] = ' ';
            }
        }

        for (int i = 0; i < P2_NUM_BLOCKS; ++i) {
            blockUsed[i] = false;
        }

        for (int i = 0; i < 4; ++i) {
            IR[i] = ' ';
            R[i] = ' ';
        }

        IC = 0;
        C = false;
        SI = 0;
        PI = 0;
        TI = 0;
        PTR = 0;
        terminateFlag = false;

        pcb.jobID = 0;
        pcb.TTL = 0;
        pcb.TLL = 0;
        pcb.TTC = 0;
        pcb.LLC = 0;

        inputLines.clear();
        inputLineIdx = 0;
        outputBuffer = "";
        executionLogs.clear();
        lastErrorReason = "";
    }

    int allocateBlock() {
        int block = 0;
        int attempts = 0;
        do {
            block = rand() % P2_NUM_BLOCKS;
            attempts++;
            if (attempts > 1000) {
                for (int i = 0; i < P2_NUM_BLOCKS; ++i) {
                    if (!blockUsed[i]) {
                        block = i;
                        break;
                    }
                }
                break;
            }
        } while (blockUsed[block]);

        blockUsed[block] = true;
        return block;
    }

    AddressTranslationResult addressMap(int va) {
        AddressTranslationResult res;
        res.va = va;
        res.pageNum = va / 10;
        res.offset = va % 10;
        res.pteAddr = PTR * 10 + res.pageNum;
        res.frame = -1;
        res.ra = -1;
        res.pi = 0;
        res.isFault = false;
        res.reason = "OK";

        if (va < 0 || va >= 100) {
            res.pi = 2; // Operand Error
            res.reason = "Operand error: VA outside valid range (0-99)";
            return res;
        }

        char pte[4];
        for (int j = 0; j < 4; ++j) {
            pte[j] = M2[res.pteAddr][j];
        }

        if (pte[0] == '*') {
            res.pi = 3; // Page Fault
            res.isFault = true;
            res.reason = "Page Fault: Page not allocated in Page Table";
            return res;
        }

        int block = (pte[2] - '0') * 10 + (pte[3] - '0');
        res.frame = block;
        res.ra = block * 10 + res.offset;
        return res;
    }

    bool loadJob(const std::string& inputContent) {
        reset();
        std::istringstream stream(inputContent);
        std::string line;
        inputLines.clear();

        while (std::getline(stream, line)) {
            while (!line.empty() && (line.back() == '\r' || line.back() == ' ')) {
                line.pop_back();
            }
            if (!line.empty()) {
                inputLines.push_back(line);
            }
        }

        if (inputLines.empty()) {
            executionLogs.push_back("Error: Input file is empty");
            return false;
        }

        inputLineIdx = 0;
        return parseJob();
    }

    bool parseJob() {
        if (inputLineIdx >= inputLines.size()) return false;

        std::string line = inputLines[inputLineIdx++];
        if (line.substr(0, 4) != "$AMJ") {
            executionLogs.push_back("Error: First card must be $AMJ. Found: " + line);
            return false;
        }

        if (phaseMode == 1) {
            // Phase 1 parse
            executionLogs.push_back("[PHASE-1] Loaded Job " + line);
            int m = 0;
            while (inputLineIdx < inputLines.size()) {
                std::string progLine = inputLines[inputLineIdx++];
                if (progLine.substr(0, 4) == "$DTA") {
                    executionLogs.push_back("[PHASE-1] $DTA card found. Ready to execute.");
                    break;
                }
                if (m >= 100) {
                    executionLogs.push_back("Abort: Phase 1 memory exceeded 100 words.");
                    break;
                }
                int k = 0;
                for (int i = 0; i < 10 && k < (int)progLine.length(); ++i) {
                    for (int j = 0; j < 4 && k < (int)progLine.length(); ++j) {
                        M1[m + i][j] = progLine[k++];
                    }
                }
                m += 10;
            }
            return true;
        } else {
            // Phase 2 parse
            if (line.length() >= 16) {
                pcb.jobID = std::stoi(line.substr(4, 4));
                pcb.TTL = std::stoi(line.substr(8, 4));
                pcb.TLL = std::stoi(line.substr(12, 4));
            } else {
                pcb.jobID = 1; pcb.TTL = 15; pcb.TLL = 5;
            }
            pcb.TTC = 0;
            pcb.LLC = 0;

            // Allocate Page Table
            PTR = allocateBlock();
            for (int i = 0; i < 10; ++i) {
                for (int j = 0; j < 4; ++j) {
                    M2[PTR * 10 + i][j] = '*';
                }
            }

            executionLogs.push_back("[LOADER] New Job: " + std::to_string(pcb.jobID) +
                " TTL: " + std::to_string(pcb.TTL) + " TLL: " + std::to_string(pcb.TLL) +
                " | Page Table allocated at frame " + std::to_string(PTR));

            while (inputLineIdx < inputLines.size()) {
                std::string progLine = inputLines[inputLineIdx++];
                if (progLine.substr(0, 4) == "$DTA") {
                    executionLogs.push_back("[LOADER] $DTA reached. Execution armed at IC=0.");
                    break;
                }

                // Allocate frame for program card
                int frame = allocateBlock();
                int pageNum = 0;
                for (int i = 0; i < 10; ++i) {
                    if (M2[PTR * 10 + i][0] == '*') {
                        pageNum = i;
                        char f1 = (char)((frame / 10) + '0');
                        char f2 = (char)((frame % 10) + '0');
                        M2[PTR * 10 + i][0] = ' ';
                        M2[PTR * 10 + i][1] = ' ';
                        M2[PTR * 10 + i][2] = f1;
                        M2[PTR * 10 + i][3] = f2;
                        executionLogs.push_back("[PAGING] Page " + std::to_string(pageNum) + " mapped to Frame " + std::to_string(frame));
                        break;
                    }
                }

                int len = (int)progLine.length();
                int i = 0, m = 0;
                while (i < len && m < 10) {
                    char word[4] = {' ', ' ', ' ', ' '};
                    if (progLine[i] == 'H') {
                        word[0] = 'H';
                        i += 1;
                    } else {
                        for (int j = 0; j < 4 && (i + j) < len; ++j) {
                            word[j] = progLine[i + j];
                        }
                        i += 4;
                    }
                    for (int j = 0; j < 4; ++j) {
                        M2[frame * 10 + m][j] = word[j];
                    }
                    m++;
                }
            }
            return true;
        }
    }

    bool step() {
        if (terminateFlag) return false;
        if (phaseMode == 1) return stepPhase1();
        else return stepPhase2();
    }

    bool stepPhase1() {
        if (IC >= 100) {
            terminateFlag = true;
            executionLogs.push_back("[PHASE-1] Instruction counter out of bounds. Terminating.");
            return false;
        }

        for (int i = 0; i < 4; ++i) IR[i] = M1[IC][i];
        IC++;

        std::string opcode = "";
        opcode += IR[0];
        opcode += IR[1];

        int address = (IR[2] - '0') * 10 + (IR[3] - '0');

        std::string irStr(IR, 4);
        executionLogs.push_back("[CPU] Executing IC=" + std::to_string(IC - 1) + " IR=[" + irStr + "]");

        if (opcode == "LR") {
            for (int i = 0; i < 4; ++i) R[i] = M1[address][i];
        } else if (opcode == "SR") {
            for (int i = 0; i < 4; ++i) M1[address][i] = R[i];
        } else if (opcode == "CR") {
            C = true;
            for (int i = 0; i < 4; ++i) {
                if (R[i] != M1[address][i]) {
                    C = false;
                    break;
                }
            }
        } else if (opcode == "BT") {
            if (C) IC = address;
        } else if (opcode == "GD") {
            SI = 1;
            // READ()
            if (inputLineIdx < inputLines.size()) {
                std::string dataLine = inputLines[inputLineIdx++];
                if (dataLine.substr(0, 4) == "$END") {
                    executionLogs.push_back("[SI=1] Abort: Out of Data");
                    terminateFlag = true;
                    return false;
                }
                int k = 0;
                for (int i = 0; i < 10 && k < (int)dataLine.length(); ++i) {
                    for (int j = 0; j < 4 && k < (int)dataLine.length(); ++j) {
                        M1[address + i][j] = dataLine[k++];
                    }
                }
                executionLogs.push_back("[SI=1] Read data into M[" + std::to_string(address) + "]");
            }
            SI = 0;
        } else if (opcode == "PD") {
            SI = 2;
            std::string out = "";
            for (int i = 0; i < 10; ++i) {
                for (int j = 0; j < 4; ++j) {
                    if (M1[address + i][j] != '\0' && M1[address + i][j] != ' ') {
                        out += M1[address + i][j];
                    }
                }
            }
            outputBuffer += out + "\n";
            executionLogs.push_back("[SI=2] Put Data from M[" + std::to_string(address) + "]: " + out);
            SI = 0;
        } else if (IR[0] == 'H') {
            SI = 3;
            terminateFlag = true;
            outputBuffer += "\n\n";
            executionLogs.push_back("[SI=3] H instruction executed. Job completed normally.");
            SI = 0;
            return false;
        }

        return !terminateFlag;
    }

    bool stepPhase2() {
        if (terminateFlag) return false;

        // Map IC to real address
        AddressTranslationResult icMap = addressMap(IC);
        if (icMap.pi != 0) {
            PI = icMap.pi;
            handleMOS();
            return !terminateFlag;
        }

        int ra = icMap.ra;
        for (int i = 0; i < 4; ++i) {
            IR[i] = M2[ra][i];
        }
        IC++;

        pcb.TTC++;
        if (pcb.TTC >= pcb.TTL) {
            TI = 2;
        }

        std::string irStr(IR, 4);
        executionLogs.push_back("[CPU] Fetch IC=" + std::to_string(IC - 1) + " -> RA=" + std::to_string(ra) + " IR=[" + irStr + "] TTC=" + std::to_string(pcb.TTC));

        if (IR[0] == 'H') {
            SI = 3;
            handleMOS();
            return !terminateFlag;
        }

        std::string op = "";
        op += IR[0];
        op += IR[1];

        if (op != "LR" && op != "SR" && op != "CR" && op != "BT" && op != "GD" && op != "PD") {
            PI = 1; // Opcode error
            handleMOS();
            return !terminateFlag;
        }

        if (op == "GD" || op == "SR") {
            pcb.TTC++;
            if (pcb.TTC >= pcb.TTL) TI = 2;
        }

        if (!isdigit(IR[2]) || !isdigit(IR[3])) {
            PI = 2; // Operand error
            handleMOS();
            return !terminateFlag;
        }

        int va = (IR[2] - '0') * 10 + (IR[3] - '0');
        AddressTranslationResult opMap = addressMap(va);

        if (opMap.pi != 0) {
            PI = opMap.pi;
            handleMOS();
            return !terminateFlag;
        }

        int ra_op = opMap.ra;

        if (op == "LR") {
            for (int i = 0; i < 4; ++i) R[i] = M2[ra_op][i];
            executionLogs.push_back("[LR] Loaded from RA=" + std::to_string(ra_op) + " into R");
        } else if (op == "SR") {
            for (int i = 0; i < 4; ++i) M2[ra_op][i] = R[i];
            executionLogs.push_back("[SR] Stored R into RA=" + std::to_string(ra_op));
        } else if (op == "CR") {
            C = true;
            for (int i = 0; i < 4; ++i) {
                if (R[i] != M2[ra_op][i]) {
                    C = false;
                    break;
                }
            }
            executionLogs.push_back(std::string("[CR] Compared R with RA=") + std::to_string(ra_op) + " -> C=" + (C ? "TRUE" : "FALSE"));
        } else if (op == "BT") {
            if (C) {
                IC = va;
                executionLogs.push_back("[BT] C is TRUE. Branched IC to " + std::to_string(va));
            } else {
                executionLogs.push_back("[BT] C is FALSE. Branch not taken.");
            }
        } else if (op == "GD") {
            SI = 1;
            handleMOS();
        } else if (op == "PD") {
            SI = 2;
            handleMOS();
        }

        if (TI != 0 && !terminateFlag) {
            handleMOS();
        }

        return !terminateFlag;
    }

    void handleMOS() {
        if (TI == 0) {
            if (SI == 1) {
                readPhase2();
                SI = 0;
            } else if (SI == 2) {
                writePhase2();
                SI = 0;
            } else if (SI == 3) {
                terminatePhase2(0);
                SI = 0;
            } else if (PI == 1) {
                terminatePhase2(4);
                PI = 0;
            } else if (PI == 2) {
                terminatePhase2(5);
                PI = 0;
            } else if (PI == 3) {
                std::string op = ""; op += IR[0]; op += IR[1];
                if (op == "GD" || op == "SR") {
                    // Valid Page Fault: Demand Paging
                    int va = (IR[2] - '0') * 10 + (IR[3] - '0');
                    int pageNum = va / 10;
                    int frame = allocateBlock();
                    char newPte[4] = {' ', ' ', (char)((frame / 10) + '0'), (char)((frame % 10) + '0')};
                    for (int j = 0; j < 4; ++j) {
                        M2[PTR * 10 + pageNum][j] = newPte[j];
                    }
                    PI = 0;
                    IC--; // Re-execute instruction
                    pcb.TTC -= 2;
                    executionLogs.push_back("[DEMAND PAGING] Valid Page Fault resolved for Page " +
                        std::to_string(pageNum) + " -> Allocated Frame " + std::to_string(frame));
                } else {
                    terminatePhase2(6); // Invalid Page Fault
                    PI = 0;
                }
            }
        } else if (TI == 2) {
            if (SI == 1) {
                terminatePhase2(3);
            } else if (SI == 2) {
                writePhase2();
                if (!terminateFlag) terminatePhase2(3);
            } else if (SI == 3) {
                terminatePhase2(0);
            } else if (PI == 1) {
                terminatePhase2(3, 4);
            } else if (PI == 2) {
                terminatePhase2(3, 5);
            } else if (PI == 3) {
                terminatePhase2(3);
            } else {
                terminatePhase2(3);
            }
            TI = 0;
        }
    }

    void readPhase2() {
        if (inputLineIdx >= inputLines.size()) return;
        std::string line = inputLines[inputLineIdx++];

        if (line.substr(0, 4) == "$END") {
            terminatePhase2(1); // Out of data
            return;
        }

        int va = (IR[2] - '0') * 10 + (IR[3] - '0');
        AddressTranslationResult res = addressMap(va);
        if (res.ra == -1) return;

        while ((int)line.length() < 40) line += ' ';

        for (int i = 0; i < 10; ++i) {
            for (int j = 0; j < 4; ++j) {
                M2[res.ra + i][j] = line[i * 4 + j];
            }
        }
        executionLogs.push_back("[SI=1] Read data into RA=" + std::to_string(res.ra) + " (10 words)");
    }

    void writePhase2() {
        pcb.LLC++;
        if (pcb.LLC > pcb.TLL) {
            terminatePhase2(2); // Line Limit Exceeded
            return;
        }

        int va = (IR[2] - '0') * 10 + (IR[3] - '0');
        AddressTranslationResult res = addressMap(va);
        if (res.ra == -1) return;

        std::string line = "";
        for (int i = 0; i < 10; ++i) {
            for (int j = 0; j < 4; ++j) {
                line += M2[res.ra + i][j];
            }
        }
        outputBuffer += line + "\n";
        executionLogs.push_back("[SI=2] Write to output from RA=" + std::to_string(res.ra) + " (LLC=" + std::to_string(pcb.LLC) + ")");
    }

    void terminatePhase2(int em1, int em2 = -1) {
        terminateFlag = true;

        std::ostringstream oss;
        oss << "\nJOB ID: " << std::setfill('0') << std::setw(4) << pcb.jobID;

        auto errorMsg = [](int code) -> std::string {
            switch (code) {
                case 0: return " - NO ERROR";
                case 1: return " - OUT OF DATA";
                case 2: return " - LINE LIMIT EXCEEDED";
                case 3: return " - TIME LIMIT EXCEEDED";
                case 4: return " - OPERATION CODE ERROR";
                case 5: return " - OPERAND ERROR";
                case 6: return " - INVALID PAGE FAULT";
                default: return " - UNKNOWN ERROR";
            }
        };

        lastErrorReason = errorMsg(em1);
        oss << lastErrorReason;
        if (em2 != -1) {
            std::string err2 = errorMsg(em2);
            lastErrorReason += " & " + err2;
            oss << err2;
        }

        oss << "\nIC: " << std::setw(2) << std::setfill('0') << IC << "  IR: ";
        for (int i = 0; i < 4; ++i) oss << IR[i];
        oss << "  TTC: " << pcb.TTC << "  LLC: " << pcb.LLC << "\n\n\n";

        outputBuffer += oss.str();
        executionLogs.push_back("[TERMINATE] " + lastErrorReason + " (IC=" + std::to_string(IC) +
            " TTC=" + std::to_string(pcb.TTC) + " LLC=" + std::to_string(pcb.LLC) + ")");
    }

    void runAll() {
        int maxSteps = 10000;
        int steps = 0;
        while (!terminateFlag && steps < maxSteps) {
            if (!step()) break;
            steps++;
        }
    }

    // Getters for frontend / WASM bridge
    Registers getRegisters() const {
        Registers reg;
        reg.IR = std::string(IR, 4);
        reg.R = std::string(R, 4);
        reg.IC = IC;
        reg.C = C;
        reg.SI = SI;
        reg.PI = PI;
        reg.TI = TI;
        reg.PTR = PTR;
        reg.terminateFlag = terminateFlag;
        return reg;
    }

    PCB getPCB() const {
        return pcb;
    }

    std::string getOutput() const {
        return outputBuffer;
    }

    std::string getLogs() const {
        std::string allLogs = "";
        for (const auto& log : executionLogs) {
            allLogs += log + "\n";
        }
        return allLogs;
    }

    std::string getMemoryWord(int addr) const {
        if (phaseMode == 1) {
            if (addr < 0 || addr >= 100) return "    ";
            return std::string(M1[addr], 4);
        } else {
            if (addr < 0 || addr >= P2_MEM_SIZE) return "    ";
            return std::string(M2[addr], 4);
        }
    }

    int getMemorySize() const {
        return phaseMode == 1 ? 100 : P2_MEM_SIZE;
    }

    bool isBlockAllocated(int block) const {
        if (block < 0 || block >= P2_NUM_BLOCKS) return false;
        return blockUsed[block];
    }

    std::string getPageTableInfo() const {
        if (phaseMode != 2) return "Paging not enabled in Phase 1";
        std::ostringstream oss;
        for (int i = 0; i < 10; ++i) {
            char pte[4];
            for (int j = 0; j < 4; ++j) pte[j] = M2[PTR * 10 + i][j];
            oss << "Page " << i << " -> ";
            if (pte[0] == '*') {
                oss << "[FAULT: *]\n";
            } else {
                int frame = (pte[2] - '0') * 10 + (pte[3] - '0');
                oss << "Frame " << frame << " (RA=" << (frame * 10) << ")\n";
            }
        }
        return oss.str();
    }
};

static std::vector<int> parseCsvInts(const std::string& text) {
    std::vector<int> result;
    std::stringstream ss(text);
    std::string item;
    while (std::getline(ss, item, ',')) {
        try { result.push_back(std::stoi(item)); } catch (...) { result.push_back(0); }
    }
    return result;
}

static std::vector<std::vector<int> > parseCsvMatrix(const std::string& text) {
    std::vector<std::vector<int> > result;
    std::stringstream ss(text);
    std::string rowText;
    while (std::getline(ss, rowText, ';')) {
        if (!rowText.empty()) result.push_back(parseCsvInts(rowText));
    }
    return result;
}

std::string deadlockBankersJson(const std::string& allocationCsv,
                                const std::string& maximumCsv,
                                const std::string& availableCsv) {
    BankersResult result = DeadlockManager::runBankers(
        parseCsvMatrix(allocationCsv),
        parseCsvMatrix(maximumCsv),
        parseCsvInts(availableCsv));
    return DeadlockManager::bankerResultToJson(result);
}

std::string deadlockDetectionJson(const std::string& allocationCsv,
                                  const std::string& requestCsv,
                                  const std::string& availableCsv) {
    DetectionResult result = DeadlockManager::detectDeadlock(
        parseCsvMatrix(allocationCsv),
        parseCsvMatrix(requestCsv),
        parseCsvInts(availableCsv));
    return DeadlockManager::detectionResultToJson(result);
}

std::string deadlockRequestJson(int processIndex,
                                const std::string& requestCsv,
                                const std::string& allocationCsv,
                                const std::string& maximumCsv,
                                const std::string& availableCsv) {
    RequestResult result = DeadlockManager::requestResources(
        processIndex,
        parseCsvInts(requestCsv),
        parseCsvMatrix(allocationCsv),
        parseCsvMatrix(maximumCsv),
        parseCsvInts(availableCsv));
    return DeadlockManager::requestResultToJson(result);
}

static std::vector<int> parseDiskRequests(const std::string& text) {
    std::vector<int> result;
    std::stringstream ss(text);
    std::string item;
    while (std::getline(ss, item, ',')) {
        try { result.push_back(std::stoi(item)); } catch (...) {}
    }
    return result;
}

std::string diskScheduleJson(const std::string& algorithm,
                             const std::string& requestCsv,
                             int initialHead,
                             int cylinderMin,
                             int cylinderMax,
                             const std::string& directionText) {
    std::vector<int> requests = parseDiskRequests(requestCsv);
    DiskDirection direction = (directionText == "DOWN")
        ? DiskDirection::DOWN : DiskDirection::UP;
    DiskScheduleResult result;
    if (algorithm == "SSTF") result = DiskScheduler::simulateSSTF(requests, initialHead, cylinderMin, cylinderMax);
    else if (algorithm == "SCAN") result = DiskScheduler::simulateSCAN(requests, initialHead, cylinderMin, cylinderMax, direction);
    else if (algorithm == "C-SCAN") result = DiskScheduler::simulateCSCAN(requests, initialHead, cylinderMin, cylinderMax, direction);
    else if (algorithm == "LOOK") result = DiskScheduler::simulateLOOK(requests, initialHead, cylinderMin, cylinderMax, direction);
    else if (algorithm == "C-LOOK") result = DiskScheduler::simulateCLOOK(requests, initialHead, cylinderMin, cylinderMax, direction);
    else result = DiskScheduler::simulateFCFS(requests, initialHead, cylinderMin, cylinderMax);

    std::ostringstream oss;
    oss << "{\"algorithm\":\"" << result.algorithm
        << "\",\"initialHead\":" << result.initialHead
        << ",\"cylinderMin\":" << result.cylinderMin
        << ",\"cylinderMax\":" << result.cylinderMax
        << ",\"totalHeadMovement\":" << result.totalHeadMovement
        << ",\"averageSeekDistance\":" << result.averageSeekDistance
        << ",\"servicingOrder\":[";
    for (size_t i = 0; i < result.servicingOrder.size(); ++i) {
        if (i) oss << ",";
        oss << result.servicingOrder[i];
    }
    oss << "],\"steps\":[";
    for (size_t i = 0; i < result.steps.size(); ++i) {
        if (i) oss << ",";
        const DiskStep& step = result.steps[i];
        oss << "{\"stepNumber\":" << step.stepNumber
            << ",\"fromPosition\":" << step.fromPosition
            << ",\"toPosition\":" << step.toPosition
            << ",\"seekDistance\":" << step.seekDistance
            << ",\"cumulativeMovement\":" << step.cumulativeMovement
            << ",\"type\":\"" << step.type << "\"}";
    }
    oss << "]}";
    return oss.str();
}

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_BINDINGS(MOS_Module) {
    function("deadlockBankersJson", &deadlockBankersJson);
    function("deadlockDetectionJson", &deadlockDetectionJson);
    function("deadlockRequestJson", &deadlockRequestJson);
    function("diskScheduleJson", &diskScheduleJson);

    value_object<Registers>("Registers")
        .field("IR", &Registers::IR)
        .field("R", &Registers::R)
        .field("IC", &Registers::IC)
        .field("C", &Registers::C)
        .field("SI", &Registers::SI)
        .field("PI", &Registers::PI)
        .field("TI", &Registers::TI)
        .field("PTR", &Registers::PTR)
        .field("terminateFlag", &Registers::terminateFlag);

    value_object<PCB>("PCB")
        .field("jobID", &PCB::jobID)
        .field("TTL", &PCB::TTL)
        .field("TLL", &PCB::TLL)
        .field("TTC", &PCB::TTC)
        .field("LLC", &PCB::LLC);

    value_object<AddressTranslationResult>("AddressTranslationResult")
        .field("va", &AddressTranslationResult::va)
        .field("pageNum", &AddressTranslationResult::pageNum)
        .field("offset", &AddressTranslationResult::offset)
        .field("pteAddr", &AddressTranslationResult::pteAddr)
        .field("frame", &AddressTranslationResult::frame)
        .field("ra", &AddressTranslationResult::ra)
        .field("pi", &AddressTranslationResult::pi)
        .field("isFault", &AddressTranslationResult::isFault)
        .field("reason", &AddressTranslationResult::reason);

    class_<MOSEngine>("MOSEngine")
        .constructor<int>()
        .function("setPhaseMode", &MOSEngine::setPhaseMode)
        .function("getPhaseMode", &MOSEngine::getPhaseMode)
        .function("reset", &MOSEngine::reset)
        .function("loadJob", &MOSEngine::loadJob)
        .function("step", &MOSEngine::step)
        .function("runAll", &MOSEngine::runAll)
        .function("getRegisters", &MOSEngine::getRegisters)
        .function("getPCB", &MOSEngine::getPCB)
        .function("getOutput", &MOSEngine::getOutput)
        .function("getLogs", &MOSEngine::getLogs)
        .function("getMemoryWord", &MOSEngine::getMemoryWord)
        .function("getMemorySize", &MOSEngine::getMemorySize)
        .function("isBlockAllocated", &MOSEngine::isBlockAllocated)
        .function("addressMap", &MOSEngine::addressMap)
        .function("getPageTableInfo", &MOSEngine::getPageTableInfo);
}
#endif

// Standalone C++ test driver when compiled with g++
#ifndef __EMSCRIPTEN__
int main() {
    std::cout << "MOS C++ Engine compiled natively for verification." << std::endl;
    MOSEngine engine(2);
    std::string sampleJob = "$AMJ000200150003\nGD10GD30GD40GD50LR20CR30BT09PD50HPD40\n$DTA\nVIT\nVIIT\nIS SAME\nNOT SAME\n$END0002\n";
    engine.loadJob(sampleJob);
    engine.runAll();
    std::cout << "Engine Output:\n" << engine.getOutput() << std::endl;
    std::cout << "Engine Logs:\n" << engine.getLogs() << std::endl;
    return 0;
}
#endif
