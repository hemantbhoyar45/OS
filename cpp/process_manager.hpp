#ifndef PROCESS_MANAGER_HPP
#define PROCESS_MANAGER_HPP

#include <string>
#include <vector>
#include <map>
#include <queue>
#include <sstream>
#include <iomanip>
#include <stdexcept>
#include <algorithm>

enum class ProcessState {
    NEW = 0,
    READY = 1,
    RUNNING = 2,
    WAITING = 3,
    TERMINATED = 4
};

inline std::string processStateToString(ProcessState state) {
    switch (state) {
        case ProcessState::NEW: return "NEW";
        case ProcessState::READY: return "READY";
        case ProcessState::RUNNING: return "RUNNING";
        case ProcessState::WAITING: return "WAITING";
        case ProcessState::TERMINATED: return "TERMINATED";
        default: return "UNKNOWN";
    }
}

inline ProcessState stringToProcessState(const std::string& str) {
    if (str == "NEW") return ProcessState::NEW;
    if (str == "READY") return ProcessState::READY;
    if (str == "RUNNING") return ProcessState::RUNNING;
    if (str == "WAITING") return ProcessState::WAITING;
    if (str == "TERMINATED") return ProcessState::TERMINATED;
    return ProcessState::NEW;
}

struct CPURegisters {
    std::string IR; // 4-char instruction register (e.g. "GD20", "LR30")
    std::string R;  // 4-char accumulator register
    int PC;         // Program Counter / Instruction Counter (0-99)
    bool C;         // Condition flag (true/false)
    int PTR;        // Page Table Register frame
};

struct PCBData {
    int pid;
    std::string name;
    ProcessState state;
    int priority;        // Lower value = higher priority (or configurable)
    int arrivalTime;
    int burstTime;
    int remainingTime;
    
    // CPU Registers context
    CPURegisters registers;

    // Scheduling & I/O
    int timeQuantumSlice; // Slice spent in current quantum
    std::string waitReason; // e.g. "Disk I/O", "Keyboard Input", "Page Fault Fetch"
    int ioRemainingTicks;   // Ticks left in waiting state

    // Accounting & Limits (matching MOS architecture)
    int ttl; // Total Time Limit
    int tll; // Total Line Limit
    int ttc; // Total Time Counter (CPU cycles consumed)
    int llc; // Line Limit Counter (lines written)
    int contextSwitches;
    int memoryBase;
    int memoryLimit;
    std::vector<int> allocatedFrames;
};

struct TransitionEvent {
    int time;
    int pid;
    std::string processName;
    ProcessState fromState;
    ProcessState toState;
    std::string trigger; // e.g. "Admit", "Dispatch", "Preempt", "I/O Request", "I/O Complete", "Exit"
    std::string details;
};

struct ProcessManagerSnapshot {
    int currentTime;
    int runningPid; // -1 if idle / in context switch
    bool isContextSwitching;
    int contextSwitchTimeRemaining;
    int contextSwitchOverhead;
    std::string schedulingPolicy; // "FCFS", "RR", "PRIORITY", "SJF"
    int timeQuantum;
    
    std::vector<PCBData> allProcesses;
    std::vector<int> readyQueue;
    std::vector<int> waitingQueue;
    std::vector<int> newQueue;
    std::vector<int> terminatedQueue;
    
    std::vector<TransitionEvent> recentEvents;
    int totalContextSwitches;
    int totalCpuBusyTime;
    int totalCpuIdleTime;
};

class ProcessManager {
private:
    int currentTime;
    int nextPid;
    int runningPid;
    bool isContextSwitching;
    int contextSwitchTimeRemaining;
    int contextSwitchOverhead;
    std::string schedulingPolicy;
    int timeQuantum;
    bool lowerIsHigherPriority;

    std::map<int, PCBData> processes;
    std::vector<int> newQueue;
    std::vector<int> readyQueue;
    std::vector<int> waitingQueue;
    std::vector<int> terminatedQueue;

    std::vector<TransitionEvent> eventLog;
    int totalContextSwitches;
    int totalCpuBusyTime;
    int totalCpuIdleTime;

    void logEvent(int pid, ProcessState from, ProcessState to, const std::string& trigger, const std::string& details);
    void sortReadyQueue();

public:
    ProcessManager(int csOverhead = 1, const std::string& policy = "RR", int tq = 2, bool lowerIsHigher = true);

    // Process State Transitions
    int createProcess(const std::string& name, int burstTime, int priority = 2, int arrivalTime = 0, int ttl = 15, int tll = 5);
    bool admitProcess(int pid);
    bool dispatchProcess(int pid = -1); // -1 auto-picks from ready queue
    bool preemptProcess(const std::string& reason = "Time Quantum Expired");
    bool blockProcess(const std::string& reason = "Disk Read I/O (SI=1)", int ioDuration = 3);
    bool unblockProcess(int pid);
    bool terminateProcess(int pid = -1, const std::string& reason = "Normal Halt (H)");

    // Simulation Clock Step
    bool step();
    void reset();

    // Configuration
    void setContextSwitchOverhead(int overhead);
    void setSchedulingPolicy(const std::string& policy, int tq = 2, bool lowerIsHigher = true);

    // Queries
    bool isValidTransition(ProcessState from, ProcessState to) const;
    const PCBData* getPCB(int pid) const;
    ProcessManagerSnapshot getSnapshot() const;
    std::string getSnapshotJson() const;
};

#endif // PROCESS_MANAGER_HPP
