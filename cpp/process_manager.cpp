#include "process_manager.hpp"
#include <iostream>

ProcessManager::ProcessManager(int csOverhead, const std::string& policy, int tq, bool lowerIsHigher)
    : currentTime(0),
      nextPid(1),
      runningPid(-1),
      isContextSwitching(false),
      contextSwitchTimeRemaining(0),
      contextSwitchOverhead(csOverhead),
      schedulingPolicy(policy),
      timeQuantum(tq > 0 ? tq : 2),
      lowerIsHigherPriority(lowerIsHigher),
      totalContextSwitches(0),
      totalCpuBusyTime(0),
      totalCpuIdleTime(0) {}

void ProcessManager::reset() {
    currentTime = 0;
    nextPid = 1;
    runningPid = -1;
    isContextSwitching = false;
    contextSwitchTimeRemaining = 0;
    totalContextSwitches = 0;
    totalCpuBusyTime = 0;
    totalCpuIdleTime = 0;

    processes.clear();
    newQueue.clear();
    readyQueue.clear();
    waitingQueue.clear();
    terminatedQueue.clear();
    eventLog.clear();
}

void ProcessManager::setContextSwitchOverhead(int overhead) {
    contextSwitchOverhead = std::max(0, overhead);
}

void ProcessManager::setSchedulingPolicy(const std::string& policy, int tq, bool lowerIsHigher) {
    schedulingPolicy = policy;
    timeQuantum = std::max(1, tq);
    lowerIsHigherPriority = lowerIsHigher;
    sortReadyQueue();
}

bool ProcessManager::isValidTransition(ProcessState from, ProcessState to) const {
    if (from == to) return false;
    switch (from) {
        case ProcessState::NEW:
            return to == ProcessState::READY || to == ProcessState::TERMINATED;
        case ProcessState::READY:
            return to == ProcessState::RUNNING || to == ProcessState::TERMINATED;
        case ProcessState::RUNNING:
            return to == ProcessState::READY || to == ProcessState::WAITING || to == ProcessState::TERMINATED;
        case ProcessState::WAITING:
            return to == ProcessState::READY || to == ProcessState::TERMINATED;
        case ProcessState::TERMINATED:
            return false; // Terminal state has no outgoing transitions
        default:
            return false;
    }
}

void ProcessManager::logEvent(int pid, ProcessState from, ProcessState to, const std::string& trigger, const std::string& details) {
    TransitionEvent ev;
    ev.time = currentTime;
    ev.pid = pid;
    ev.processName = processes.count(pid) ? processes[pid].name : ("P" + std::to_string(pid));
    ev.fromState = from;
    ev.toState = to;
    ev.trigger = trigger;
    ev.details = details;
    eventLog.push_back(ev);
}

void ProcessManager::sortReadyQueue() {
    if (readyQueue.size() <= 1) return;

    if (schedulingPolicy == "PRIORITY") {
        std::stable_sort(readyQueue.begin(), readyQueue.end(), [this](int a, int b) {
            int pA = processes[a].priority;
            int pB = processes[b].priority;
            if (pA != pB) {
                return lowerIsHigherPriority ? (pA < pB) : (pA > pB);
            }
            return processes[a].arrivalTime < processes[b].arrivalTime;
        });
    } else if (schedulingPolicy == "SJF") {
        std::stable_sort(readyQueue.begin(), readyQueue.end(), [this](int a, int b) {
            if (processes[a].remainingTime != processes[b].remainingTime) {
                return processes[a].remainingTime < processes[b].remainingTime;
            }
            return processes[a].arrivalTime < processes[b].arrivalTime;
        });
    }
    // FCFS and RR maintain FIFO order
}

int ProcessManager::createProcess(const std::string& name, int burstTime, int priority, int arrivalTime, int ttl, int tll) {
    int pid = nextPid++;
    PCBData pcb;
    pcb.pid = pid;
    pcb.name = name.empty() ? ("P" + std::to_string(pid)) : name;
    pcb.state = ProcessState::NEW;
    pcb.priority = priority;
    pcb.arrivalTime = arrivalTime >= 0 ? arrivalTime : currentTime;
    pcb.burstTime = std::max(1, burstTime);
    pcb.remainingTime = pcb.burstTime;

    // Default MOS registers
    pcb.registers.IR = "GD10";
    pcb.registers.R = "    ";
    pcb.registers.PC = 0;
    pcb.registers.C = false;
    pcb.registers.PTR = pid % 30;

    pcb.timeQuantumSlice = 0;
    pcb.waitReason = "None";
    pcb.ioRemainingTicks = 0;
    pcb.ttl = ttl > 0 ? ttl : 15;
    pcb.tll = tll > 0 ? tll : 5;
    pcb.ttc = 0;
    pcb.llc = 0;
    pcb.contextSwitches = 0;
    pcb.memoryBase = (pid - 1) * 10;
    pcb.memoryLimit = 10;
    pcb.allocatedFrames.push_back(pcb.registers.PTR);

    processes[pid] = pcb;
    newQueue.push_back(pid);

    logEvent(pid, ProcessState::NEW, ProcessState::NEW, "Create", "Process initialized in NEW pool.");
    return pid;
}

bool ProcessManager::admitProcess(int pid) {
    if (!processes.count(pid)) return false;
    PCBData& pcb = processes[pid];
    if (!isValidTransition(pcb.state, ProcessState::READY)) return false;

    // Remove from newQueue
    auto it = std::find(newQueue.begin(), newQueue.end(), pid);
    if (it != newQueue.end()) newQueue.erase(it);

    ProcessState oldState = pcb.state;
    pcb.state = ProcessState::READY;
    readyQueue.push_back(pid);
    sortReadyQueue();

    logEvent(pid, oldState, ProcessState::READY, "Admit", "Admitted to Ready Queue.");
    return true;
}

bool ProcessManager::dispatchProcess(int pid) {
    if (readyQueue.empty() && pid == -1) return false;

    int targetPid = pid;
    if (targetPid == -1) {
        targetPid = readyQueue.front();
    }

    if (!processes.count(targetPid)) return false;
    PCBData& pcb = processes[targetPid];
    if (!isValidTransition(pcb.state, ProcessState::RUNNING)) return false;

    // Context Switch logic
    if (runningPid != -1 && runningPid != targetPid) {
        preemptProcess("Context Switch Preemption");
    }

    // Remove target from readyQueue
    auto it = std::find(readyQueue.begin(), readyQueue.end(), targetPid);
    if (it != readyQueue.end()) readyQueue.erase(it);

    ProcessState oldState = pcb.state;
    pcb.state = ProcessState::RUNNING;
    pcb.timeQuantumSlice = 0;
    pcb.contextSwitches++;
    totalContextSwitches++;
    runningPid = targetPid;

    if (contextSwitchOverhead > 0) {
        isContextSwitching = true;
        contextSwitchTimeRemaining = contextSwitchOverhead;
    }

    logEvent(targetPid, oldState, ProcessState::RUNNING, "Dispatch",
             "Dispatched to CPU (Context switch count: " + std::to_string(pcb.contextSwitches) + ").");
    return true;
}

bool ProcessManager::preemptProcess(const std::string& reason) {
    if (runningPid == -1 || !processes.count(runningPid)) return false;

    PCBData& pcb = processes[runningPid];
    if (!isValidTransition(pcb.state, ProcessState::READY)) return false;

    ProcessState oldState = pcb.state;
    pcb.state = ProcessState::READY;
    pcb.timeQuantumSlice = 0;

    readyQueue.push_back(runningPid);
    sortReadyQueue();

    int prev = runningPid;
    runningPid = -1;

    logEvent(prev, oldState, ProcessState::READY, "Preempt", reason + " -> Returned to Ready Queue.");
    return true;
}

bool ProcessManager::blockProcess(const std::string& reason, int ioDuration) {
    if (runningPid == -1 || !processes.count(runningPid)) return false;

    PCBData& pcb = processes[runningPid];
    if (!isValidTransition(pcb.state, ProcessState::WAITING)) return false;

    ProcessState oldState = pcb.state;
    pcb.state = ProcessState::WAITING;
    pcb.waitReason = reason;
    pcb.ioRemainingTicks = std::max(1, ioDuration);

    waitingQueue.push_back(runningPid);
    int prev = runningPid;
    runningPid = -1;

    logEvent(prev, oldState, ProcessState::WAITING, "I/O Request",
             "Blocked on " + reason + " for " + std::to_string(ioDuration) + " ticks.");
    return true;
}

bool ProcessManager::unblockProcess(int pid) {
    if (!processes.count(pid)) return false;
    PCBData& pcb = processes[pid];
    if (!isValidTransition(pcb.state, ProcessState::READY)) return false;

    auto it = std::find(waitingQueue.begin(), waitingQueue.end(), pid);
    if (it != waitingQueue.end()) waitingQueue.erase(it);

    ProcessState oldState = pcb.state;
    pcb.state = ProcessState::READY;
    pcb.waitReason = "None";
    pcb.ioRemainingTicks = 0;

    readyQueue.push_back(pid);
    sortReadyQueue();

    logEvent(pid, oldState, ProcessState::READY, "I/O Complete", "I/O operation finished. Re-entered Ready Queue.");
    return true;
}

bool ProcessManager::terminateProcess(int pid, const std::string& reason) {
    int target = (pid == -1) ? runningPid : pid;
    if (target == -1 || !processes.count(target)) return false;

    PCBData& pcb = processes[target];
    if (!isValidTransition(pcb.state, ProcessState::TERMINATED)) return false;

    // Remove from whichever queue it was in
    if (target == runningPid) {
        runningPid = -1;
    }
    auto itR = std::find(readyQueue.begin(), readyQueue.end(), target);
    if (itR != readyQueue.end()) readyQueue.erase(itR);
    auto itW = std::find(waitingQueue.begin(), waitingQueue.end(), target);
    if (itW != waitingQueue.end()) waitingQueue.erase(itW);
    auto itN = std::find(newQueue.begin(), newQueue.end(), target);
    if (itN != newQueue.end()) newQueue.erase(itN);

    ProcessState oldState = pcb.state;
    pcb.state = ProcessState::TERMINATED;
    pcb.remainingTime = 0;
    terminatedQueue.push_back(target);

    logEvent(target, oldState, ProcessState::TERMINATED, "Exit", reason + " -> Process Terminated.");
    return true;
}

bool ProcessManager::step() {
    currentTime++;

    // 1. Advance waiting queue I/O ticks
    std::vector<int> toUnblock;
    for (int pid : waitingQueue) {
        PCBData& pcb = processes[pid];
        pcb.ioRemainingTicks--;
        if (pcb.ioRemainingTicks <= 0) {
            toUnblock.push_back(pid);
        }
    }
    for (int pid : toUnblock) {
        unblockProcess(pid);
    }

    // 2. Handle context switch overhead
    if (isContextSwitching) {
        contextSwitchTimeRemaining--;
        totalCpuBusyTime++;
        if (contextSwitchTimeRemaining <= 0) {
            isContextSwitching = false;
        }
        return true;
    }

    // 3. Process CPU execution
    if (runningPid != -1 && processes.count(runningPid)) {
        PCBData& pcb = processes[runningPid];
        pcb.remainingTime--;
        pcb.ttc++;
        pcb.timeQuantumSlice++;
        pcb.registers.PC = (pcb.registers.PC + 1) % 100;
        totalCpuBusyTime++;

        // Program instruction simulation
        if (pcb.ttc % 2 == 0) pcb.registers.IR = "LR20";
        else pcb.registers.IR = "PD30";

        // Check completion
        if (pcb.remainingTime <= 0) {
            terminateProcess(runningPid, "Burst Completed");
            // Auto dispatch next if available
            if (!readyQueue.empty()) {
                dispatchProcess();
            }
        } else if (schedulingPolicy == "RR" && pcb.timeQuantumSlice >= timeQuantum) {
            // Round Robin quantum expired
            preemptProcess("Time Quantum (" + std::to_string(timeQuantum) + ") Expired");
            if (!readyQueue.empty()) {
                dispatchProcess();
            }
        }
    } else {
        totalCpuIdleTime++;
        // Auto-dispatch if ready queue has processes
        if (!readyQueue.empty()) {
            dispatchProcess();
        }
    }

    return true;
}

const PCBData* ProcessManager::getPCB(int pid) const {
    auto it = processes.find(pid);
    if (it != processes.end()) return &it->second;
    return nullptr;
}

ProcessManagerSnapshot ProcessManager::getSnapshot() const {
    ProcessManagerSnapshot snap;
    snap.currentTime = currentTime;
    snap.runningPid = runningPid;
    snap.isContextSwitching = isContextSwitching;
    snap.contextSwitchTimeRemaining = contextSwitchTimeRemaining;
    snap.contextSwitchOverhead = contextSwitchOverhead;
    snap.schedulingPolicy = schedulingPolicy;
    snap.timeQuantum = timeQuantum;

    for (const auto& kv : processes) {
        snap.allProcesses.push_back(kv.second);
    }

    snap.readyQueue = readyQueue;
    snap.waitingQueue = waitingQueue;
    snap.newQueue = newQueue;
    snap.terminatedQueue = terminatedQueue;
    snap.recentEvents = eventLog;
    snap.totalContextSwitches = totalContextSwitches;
    snap.totalCpuBusyTime = totalCpuBusyTime;
    snap.totalCpuIdleTime = totalCpuIdleTime;

    return snap;
}

std::string ProcessManager::getSnapshotJson() const {
    std::ostringstream ss;
    ss << "{";
    ss << "\"currentTime\":" << currentTime << ",";
    ss << "\"runningPid\":" << runningPid << ",";
    ss << "\"isContextSwitching\":" << (isContextSwitching ? "true" : "false") << ",";
    ss << "\"contextSwitchOverhead\":" << contextSwitchOverhead << ",";
    ss << "\"schedulingPolicy\":\"" << schedulingPolicy << "\",";
    ss << "\"timeQuantum\":" << timeQuantum << ",";
    ss << "\"totalContextSwitches\":" << totalContextSwitches << ",";
    ss << "\"totalCpuBusyTime\":" << totalCpuBusyTime << ",";
    ss << "\"totalCpuIdleTime\":" << totalCpuIdleTime << ",";

    // allProcesses
    ss << "\"allProcesses\":[";
    bool first = true;
    for (const auto& kv : processes) {
        const auto& p = kv.second;
        if (!first) ss << ",";
        first = false;
        ss << "{"
           << "\"pid\":" << p.pid << ","
           << "\"name\":\"" << p.name << "\","
           << "\"state\":\"" << processStateToString(p.state) << "\","
           << "\"priority\":" << p.priority << ","
           << "\"arrivalTime\":" << p.arrivalTime << ","
           << "\"burstTime\":" << p.burstTime << ","
           << "\"remainingTime\":" << p.remainingTime << ","
           << "\"timeQuantumSlice\":" << p.timeQuantumSlice << ","
           << "\"waitReason\":\"" << p.waitReason << "\","
           << "\"ioRemainingTicks\":" << p.ioRemainingTicks << ","
           << "\"ttl\":" << p.ttl << ","
           << "\"tll\":" << p.tll << ","
           << "\"ttc\":" << p.ttc << ","
           << "\"llc\":" << p.llc << ","
           << "\"contextSwitches\":" << p.contextSwitches << ","
           << "\"registers\":{"
           << "\"IR\":\"" << p.registers.IR << "\","
           << "\"R\":\"" << p.registers.R << "\","
           << "\"PC\":" << p.registers.PC << ","
           << "\"C\":" << (p.registers.C ? "true" : "false") << ","
           << "\"PTR\":" << p.registers.PTR
           << "}"
           << "}";
    }
    ss << "],";

    // readyQueue
    ss << "\"readyQueue\":[";
    for (size_t i = 0; i < readyQueue.size(); ++i) {
        if (i > 0) ss << ",";
        ss << readyQueue[i];
    }
    ss << "],";

    // waitingQueue
    ss << "\"waitingQueue\":[";
    for (size_t i = 0; i < waitingQueue.size(); ++i) {
        if (i > 0) ss << ",";
        ss << waitingQueue[i];
    }
    ss << "],";

    // newQueue
    ss << "\"newQueue\":[";
    for (size_t i = 0; i < newQueue.size(); ++i) {
        if (i > 0) ss << ",";
        ss << newQueue[i];
    }
    ss << "],";

    // terminatedQueue
    ss << "\"terminatedQueue\":[";
    for (size_t i = 0; i < terminatedQueue.size(); ++i) {
        if (i > 0) ss << ",";
        ss << terminatedQueue[i];
    }
    ss << "]";

    ss << "}";
    return ss.str();
}
