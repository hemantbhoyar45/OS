#include <iostream>
#include <cassert>
#include "cpu_scheduler.hpp"

void testFCFS() {
    std::cout << "[TEST] Running FCFS Test..." << std::endl;
    std::vector<ProcessInput> procs = {
        {1, "P1", 0, 4, 2},
        {2, "P2", 1, 3, 3},
        {3, "P3", 2, 1, 1}
    };

    auto res = CPUScheduler::scheduleFCFS(procs);
    assert(res.processResults.size() == 3);
    // P1: starts 0, ends 4 -> CT=4, TAT=4, WT=0, RT=0
    assert(res.processResults[0].completionTime == 4);
    assert(res.processResults[0].turnaroundTime == 4);
    assert(res.processResults[0].waitingTime == 0);
    assert(res.processResults[0].responseTime == 0);

    // P2: starts 4, ends 7 -> CT=7, TAT=6, WT=3, RT=3
    assert(res.processResults[1].completionTime == 7);
    assert(res.processResults[1].turnaroundTime == 6);
    assert(res.processResults[1].waitingTime == 3);

    // P3: starts 7, ends 8 -> CT=8, TAT=6, WT=5, RT=5
    assert(res.processResults[2].completionTime == 8);
    assert(res.processResults[2].turnaroundTime == 6);
    assert(res.processResults[2].waitingTime == 5);

    assert(res.totalTime == 8);
    assert(res.idleTime == 0);
    assert(res.cpuUtilization == 100.0);
    std::cout << "  ✓ FCFS passed. Avg WT: " << res.avgWaitingTime << " Avg TAT: " << res.avgTurnaroundTime << std::endl;
}

void testIdleTime() {
    std::cout << "[TEST] Running CPU Idle Time Test..." << std::endl;
    std::vector<ProcessInput> procs = {
        {1, "P1", 2, 3, 1}, // Arrives at 2, not 0!
        {2, "P2", 8, 2, 2}  // Arrives at 8, gap between 5 and 8!
    };

    auto res = CPUScheduler::scheduleFCFS(procs);
    assert(res.ganttChart.size() >= 3);
    assert(res.ganttChart[0].pid == -1); // IDLE 0 to 2
    assert(res.ganttChart[0].startTime == 0 && res.ganttChart[0].endTime == 2);
    assert(res.ganttChart[1].pid == 1);  // P1 2 to 5
    assert(res.ganttChart[2].pid == -1); // IDLE 5 to 8
    assert(res.ganttChart[3].pid == 2);  // P2 8 to 10
    assert(res.totalTime == 10);
    assert(res.idleTime == 5);
    assert(res.cpuUtilization == 50.0);
    std::cout << "  ✓ CPU Idle Time handled properly. Total time: 10, Idle: 5." << std::endl;
}

void testSJF() {
    std::cout << "[TEST] Running SJF (Non-preemptive) Test..." << std::endl;
    std::vector<ProcessInput> procs = {
        {1, "P1", 0, 7, 1},
        {2, "P2", 2, 4, 2},
        {3, "P3", 4, 1, 3},
        {4, "P4", 5, 4, 4}
    };

    auto res = CPUScheduler::scheduleSJF(procs);
    // P1 runs 0 to 7. At t=7, P2 (rem 4), P3 (rem 1), P4 (rem 4) are ready.
    // Shortest is P3 (burst 1), so P3 runs 7 to 8.
    // Next tie between P2 (burst 4) and P4 (burst 4) -> P2 arrived earlier (2 vs 5), so P2 runs 8 to 12.
    // Then P4 runs 12 to 16.
    assert(res.processResults[0].completionTime == 7);
    assert(res.processResults[2].completionTime == 8);  // P3
    assert(res.processResults[1].completionTime == 12); // P2
    assert(res.processResults[3].completionTime == 16); // P4
    std::cout << "  ✓ SJF passed. Avg WT: " << res.avgWaitingTime << " Avg TAT: " << res.avgTurnaroundTime << std::endl;
}

void testSRTF() {
    std::cout << "[TEST] Running SRTF (Preemptive SJF) Test..." << std::endl;
    std::vector<ProcessInput> procs = {
        {1, "P1", 0, 8, 1},
        {2, "P2", 1, 4, 1},
        {3, "P3", 2, 9, 1},
        {4, "P4", 3, 5, 1}
    };

    auto res = CPUScheduler::scheduleSRTF(procs);
    // At t=0: P1 starts (rem 8)
    // At t=1: P2 arrives (burst 4 < P1 remaining 7) -> Preempt! P2 runs
    // At t=2: P3 arrives (burst 9) -> P2 continues (rem 3)
    // At t=3: P4 arrives (burst 5) -> P2 continues (rem 2)
    // At t=5: P2 completes! Ready: P1 (7), P4 (5), P3 (9) -> P4 runs 5 to 10
    // At t=10: P4 completes! P1 runs 10 to 17
    // At t=17: P1 completes! P3 runs 17 to 26
    assert(res.processResults[1].completionTime == 5);  // P2
    assert(res.processResults[3].completionTime == 10); // P4
    assert(res.processResults[0].completionTime == 17); // P1
    assert(res.processResults[2].completionTime == 26); // P3
    std::cout << "  ✓ SRTF Preemption passed with verified completion times." << std::endl;
}

void testRoundRobin() {
    std::cout << "[TEST] Running Round Robin (RR, TQ=2) Test..." << std::endl;
    std::vector<ProcessInput> procs = {
        {1, "P1", 0, 5, 1},
        {2, "P2", 1, 3, 1},
        {3, "P3", 2, 1, 1}
    };

    auto res = CPUScheduler::scheduleRR(procs, 2);
    // t=0: P1 (runs 0-2, rem 3). Arrived during [0,2]: P2(t=1), P3(t=2).
    // Queue after t=2: P2, P3, P1.
    // t=2: P2 runs 2-4 (rem 1).
    // Queue: P3, P1, P2.
    // t=4: P3 runs 4-5 (burst 1, finishes at 5!).
    // Queue: P1, P2.
    // t=5: P1 runs 5-7 (rem 1).
    // Queue: P2, P1.
    // t=7: P2 runs 7-8 (finishes at 8!).
    // t=8: P1 runs 8-9 (finishes at 9!).
    assert(res.processResults[2].completionTime == 5); // P3
    assert(res.processResults[1].completionTime == 8); // P2
    assert(res.processResults[0].completionTime == 9); // P1
    assert(res.totalTime == 9);
    std::cout << "  ✓ Round Robin (TQ=2) passed with exact queue ordering." << std::endl;
}

void testPriorityPreemptive() {
    std::cout << "[TEST] Running Priority Preemptive Test..." << std::endl;
    // Lower number = higher priority
    std::vector<ProcessInput> procs = {
        {1, "P1", 0, 4, 3}, // lower priority 3
        {2, "P2", 1, 2, 1}, // higher priority 1 arrives at t=1
        {3, "P3", 2, 3, 2}  // priority 2
    };

    auto res = CPUScheduler::schedulePriorityPreemptive(procs, true);
    // At t=0: P1 starts (priority 3)
    // At t=1: P2 arrives with priority 1 (higher) -> Preempt! P2 runs 1 to 3
    // At t=3: P2 finishes. Ready: P3 (priority 2), P1 (priority 3, rem 3).
    // P3 runs 3 to 6.
    // P1 runs 6 to 9.
    assert(res.processResults[1].completionTime == 3); // P2
    assert(res.processResults[2].completionTime == 6); // P3
    assert(res.processResults[0].completionTime == 9); // P1
    std::cout << "  ✓ Priority Preemptive preemption and completion verified." << std::endl;
}

void testJsonOutput() {
    std::cout << "[TEST] Running JSON Serialization Test..." << std::endl;
    std::vector<ProcessInput> procs = {
        {1, "P1", 0, 2, 1},
        {2, "P2", 1, 1, 2}
    };
    auto all = CPUScheduler::compareAll(procs, 2, true);
    assert(all.size() == 6);
    std::string json = CPUScheduler::comparisonToJson(all);
    assert(!json.empty());
    assert(json.front() == '[' && json.back() == ']');
    std::cout << "  ✓ Comparison JSON generated successfully (" << json.length() << " bytes)." << std::endl;
}

int main() {
    std::cout << "========================================" << std::endl;
    std::cout << "  CPU SCHEDULER C++ UNIT TEST SUITE    " << std::endl;
    std::cout << "========================================" << std::endl;

    testFCFS();
    testIdleTime();
    testSJF();
    testSRTF();
    testRoundRobin();
    testPriorityPreemptive();
    testJsonOutput();

    std::cout << "========================================" << std::endl;
    std::cout << "  ALL CPU SCHEDULING TESTS PASSED! ✓    " << std::endl;
    std::cout << "========================================" << std::endl;
    return 0;
}
