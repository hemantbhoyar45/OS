#include "../cpp/process_manager.hpp"

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>

using namespace emscripten;

EMSCRIPTEN_BINDINGS(ProcessManagerModule) {
    enum_<ProcessState>("ProcessState")
        .value("NEW", ProcessState::NEW)
        .value("READY", ProcessState::READY)
        .value("RUNNING", ProcessState::RUNNING)
        .value("WAITING", ProcessState::WAITING)
        .value("TERMINATED", ProcessState::TERMINATED);

    value_object<CPURegisters>("CPURegisters")
        .field("IR", &CPURegisters::IR)
        .field("R", &CPURegisters::R)
        .field("PC", &CPURegisters::PC)
        .field("C", &CPURegisters::C)
        .field("PTR", &CPURegisters::PTR);

    register_vector<int>("VectorIntPM");
    register_vector<PCBData>("VectorPCBData");
    register_vector<TransitionEvent>("VectorTransitionEvent");

    value_object<PCBData>("PCBData")
        .field("pid", &PCBData::pid)
        .field("name", &PCBData::name)
        .field("state", &PCBData::state)
        .field("priority", &PCBData::priority)
        .field("arrivalTime", &PCBData::arrivalTime)
        .field("burstTime", &PCBData::burstTime)
        .field("remainingTime", &PCBData::remainingTime)
        .field("registers", &PCBData::registers)
        .field("timeQuantumSlice", &PCBData::timeQuantumSlice)
        .field("waitReason", &PCBData::waitReason)
        .field("ioRemainingTicks", &PCBData::ioRemainingTicks)
        .field("ttl", &PCBData::ttl)
        .field("tll", &PCBData::tll)
        .field("ttc", &PCBData::ttc)
        .field("llc", &PCBData::llc)
        .field("contextSwitches", &PCBData::contextSwitches)
        .field("memoryBase", &PCBData::memoryBase)
        .field("memoryLimit", &PCBData::memoryLimit)
        .field("allocatedFrames", &PCBData::allocatedFrames);

    value_object<TransitionEvent>("TransitionEvent")
        .field("time", &TransitionEvent::time)
        .field("pid", &TransitionEvent::pid)
        .field("processName", &TransitionEvent::processName)
        .field("fromState", &TransitionEvent::fromState)
        .field("toState", &TransitionEvent::toState)
        .field("trigger", &TransitionEvent::trigger)
        .field("details", &TransitionEvent::details);

    value_object<ProcessManagerSnapshot>("ProcessManagerSnapshot")
        .field("currentTime", &ProcessManagerSnapshot::currentTime)
        .field("runningPid", &ProcessManagerSnapshot::runningPid)
        .field("isContextSwitching", &ProcessManagerSnapshot::isContextSwitching)
        .field("contextSwitchTimeRemaining", &ProcessManagerSnapshot::contextSwitchTimeRemaining)
        .field("contextSwitchOverhead", &ProcessManagerSnapshot::contextSwitchOverhead)
        .field("schedulingPolicy", &ProcessManagerSnapshot::schedulingPolicy)
        .field("timeQuantum", &ProcessManagerSnapshot::timeQuantum)
        .field("allProcesses", &ProcessManagerSnapshot::allProcesses)
        .field("readyQueue", &ProcessManagerSnapshot::readyQueue)
        .field("waitingQueue", &ProcessManagerSnapshot::waitingQueue)
        .field("newQueue", &ProcessManagerSnapshot::newQueue)
        .field("terminatedQueue", &ProcessManagerSnapshot::terminatedQueue)
        .field("recentEvents", &ProcessManagerSnapshot::recentEvents)
        .field("totalContextSwitches", &ProcessManagerSnapshot::totalContextSwitches)
        .field("totalCpuBusyTime", &ProcessManagerSnapshot::totalCpuBusyTime)
        .field("totalCpuIdleTime", &ProcessManagerSnapshot::totalCpuIdleTime);

    class_<ProcessManager>("ProcessManager")
        .constructor<int, std::string, int, bool>()
        .function("createProcess", &ProcessManager::createProcess)
        .function("admitProcess", &ProcessManager::admitProcess)
        .function("dispatchProcess", &ProcessManager::dispatchProcess)
        .function("preemptProcess", &ProcessManager::preemptProcess)
        .function("blockProcess", &ProcessManager::blockProcess)
        .function("unblockProcess", &ProcessManager::unblockProcess)
        .function("terminateProcess", &ProcessManager::terminateProcess)
        .function("step", &ProcessManager::step)
        .function("reset", &ProcessManager::reset)
        .function("setContextSwitchOverhead", &ProcessManager::setContextSwitchOverhead)
        .function("setSchedulingPolicy", &ProcessManager::setSchedulingPolicy)
        .function("isValidTransition", &ProcessManager::isValidTransition)
        .function("getSnapshot", &ProcessManager::getSnapshot)
        .function("getSnapshotJson", &ProcessManager::getSnapshotJson);
}
#endif
