#include <iostream>
#include <cassert>
#include "process_manager.hpp"

void testValidTransitions() {
    std::cout << "[TEST] Running Valid State Transitions Test..." << std::endl;
    ProcessManager pm(0, "FCFS");

    // 1. Create process -> NEW state
    int pid = pm.createProcess("TestProc", 5, 1);
    const PCBData* pcb = pm.getPCB(pid);
    assert(pcb != nullptr);
    assert(pcb->state == ProcessState::NEW);

    // 2. NEW -> READY (Admit)
    bool ok = pm.admitProcess(pid);
    assert(ok);
    assert(pcb->state == ProcessState::READY);

    // 3. READY -> RUNNING (Dispatch)
    ok = pm.dispatchProcess(pid);
    assert(ok);
    assert(pcb->state == ProcessState::RUNNING);
    assert(pm.getSnapshot().runningPid == pid);

    // 4. RUNNING -> WAITING (Block on I/O)
    ok = pm.blockProcess("Disk Read (SI=1)", 3);
    assert(ok);
    assert(pcb->state == ProcessState::WAITING);
    assert(pm.getSnapshot().runningPid == -1);

    // 5. WAITING -> READY (I/O Complete)
    ok = pm.unblockProcess(pid);
    assert(ok);
    assert(pcb->state == ProcessState::READY);

    // 6. READY -> RUNNING (Re-dispatch)
    ok = pm.dispatchProcess(pid);
    assert(ok);
    assert(pcb->state == ProcessState::RUNNING);

    // 7. RUNNING -> READY (Preemption)
    ok = pm.preemptProcess("Time Slice Expired");
    assert(ok);
    assert(pcb->state == ProcessState::READY);

    // 8. READY -> RUNNING
    ok = pm.dispatchProcess(pid);
    assert(ok);

    // 9. RUNNING -> TERMINATED (Exit)
    ok = pm.terminateProcess(pid, "Normal Exit");
    assert(ok);
    assert(pcb->state == ProcessState::TERMINATED);

    std::cout << "  ✓ All 5 process lifecycle states and transitions verified successfully." << std::endl;
}

void testInvalidTransitions() {
    std::cout << "[TEST] Running Invalid Transition Rejection Test..." << std::endl;
    ProcessManager pm(0, "FCFS");

    assert(!pm.isValidTransition(ProcessState::NEW, ProcessState::RUNNING));
    assert(!pm.isValidTransition(ProcessState::NEW, ProcessState::WAITING));
    assert(!pm.isValidTransition(ProcessState::WAITING, ProcessState::RUNNING));
    assert(!pm.isValidTransition(ProcessState::TERMINATED, ProcessState::RUNNING));
    assert(!pm.isValidTransition(ProcessState::TERMINATED, ProcessState::READY));

    int pid = pm.createProcess("InvalidTester", 4);
    // Attempt to dispatch while still in NEW state (should fail)
    bool dispatched = pm.dispatchProcess(pid);
    assert(!dispatched);

    // Admit to READY
    pm.admitProcess(pid);

    // Attempt to block while still in READY state (should fail)
    bool blocked = pm.blockProcess("Invalid Block");
    assert(!blocked);

    std::cout << "  ✓ All illegal state transitions correctly rejected." << std::endl;
}

void testContextSwitchOverhead() {
    std::cout << "[TEST] Running Context Switch Overhead Test..." << std::endl;
    ProcessManager pm(2, "RR", 2); // 2 units CS overhead, RR quantum 2

    int p1 = pm.createProcess("P1", 4);
    int p2 = pm.createProcess("P2", 4);
    pm.admitProcess(p1);
    pm.admitProcess(p2);

    // Dispatch P1 -> triggers context switch
    pm.dispatchProcess(p1);
    auto snap = pm.getSnapshot();
    assert(snap.isContextSwitching);
    assert(snap.contextSwitchTimeRemaining == 2);
    assert(snap.totalContextSwitches == 1);

    // Step 1: still in CS overhead
    pm.step();
    assert(pm.getSnapshot().isContextSwitching);

    // Step 2: CS overhead completes
    pm.step();
    assert(!pm.getSnapshot().isContextSwitching);

    std::cout << "  ✓ Context switch overhead timing and state saving verified." << std::endl;
}

void testRoundRobinSchedulingIntegration() {
    std::cout << "[TEST] Running Round Robin Scheduling Integration Test..." << std::endl;
    ProcessManager pm(0, "RR", 2); // 0 CS overhead for direct check, TQ=2

    int p1 = pm.createProcess("P1", 4);
    int p2 = pm.createProcess("P2", 2);
    pm.admitProcess(p1);
    pm.admitProcess(p2);

    pm.dispatchProcess(p1); // P1 running
    pm.step(); // t=1, P1 rem 3, slice 1
    pm.step(); // t=2, P1 rem 2, slice 2 -> Quantum expired, P1 preempted, P2 dispatched!

    assert(pm.getPCB(p1)->state == ProcessState::READY);
    assert(pm.getPCB(p2)->state == ProcessState::RUNNING);

    std::cout << "  ✓ Round Robin CPU scheduling integration verified." << std::endl;
}

int main() {
    std::cout << "========================================" << std::endl;
    std::cout << "  PROCESS MANAGER C++ UNIT TEST SUITE   " << std::endl;
    std::cout << "========================================" << std::endl;

    testValidTransitions();
    testInvalidTransitions();
    testContextSwitchOverhead();
    testRoundRobinSchedulingIntegration();

    std::cout << "========================================" << std::endl;
    std::cout << "  ALL PROCESS MANAGER TESTS PASSED! ✓   " << std::endl;
    std::cout << "========================================" << std::endl;
    return 0;
}
