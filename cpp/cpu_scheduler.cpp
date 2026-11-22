#include "cpu_scheduler.hpp"
#include <queue>
#include <map>
#include <climits>

// Helper to consolidate consecutive segments with same PID into clean Gantt segments
static std::vector<GanttSegment> consolidateGantt(const std::vector<GanttSegment>& raw) {
    if (raw.empty()) return {};
    std::vector<GanttSegment> clean;
    for (const auto& seg : raw) {
        if (seg.startTime >= seg.endTime) continue;
        if (!clean.empty() && clean.back().pid == seg.pid && clean.back().endTime == seg.startTime) {
            clean.back().endTime = seg.endTime;
        } else {
            clean.push_back(seg);
        }
    }
    return clean;
}

// Compute averages and metrics
static void finalizeScheduleResult(
    ScheduleResult& res,
    const std::vector<ProcessInput>& original,
    const std::map<int, int>& firstExec,
    const std::map<int, int>& completion
) {
    res.ganttChart = consolidateGantt(res.ganttChart);
    int n = (int)original.size();
    if (n == 0) return;

    int totalTAT = 0;
    int totalWT = 0;
    int totalRT = 0;
    int maxCT = 0;
    int totalBusy = 0;

    for (const auto& seg : res.ganttChart) {
        if (seg.pid != -1) {
            totalBusy += (seg.endTime - seg.startTime);
        }
    }

    res.processResults.clear();
    for (const auto& p : original) {
        ProcessResult pr;
        pr.pid = p.pid;
        pr.name = p.name;
        pr.arrivalTime = p.arrivalTime;
        pr.burstTime = p.burstTime;
        pr.priority = p.priority;

        auto itC = completion.find(p.pid);
        pr.completionTime = (itC != completion.end()) ? itC->second : p.arrivalTime;
        pr.turnaroundTime = pr.completionTime - pr.arrivalTime;
        pr.waitingTime = pr.turnaroundTime - pr.burstTime;

        auto itF = firstExec.find(p.pid);
        int fe = (itF != firstExec.end()) ? itF->second : pr.arrivalTime;
        pr.responseTime = fe - pr.arrivalTime;

        totalTAT += pr.turnaroundTime;
        totalWT += pr.waitingTime;
        totalRT += pr.responseTime;
        if (pr.completionTime > maxCT) maxCT = pr.completionTime;

        res.processResults.push_back(pr);
    }

    res.totalTime = maxCT;
    res.idleTime = maxCT - totalBusy;
    res.avgTurnaroundTime = (double)totalTAT / n;
    res.avgWaitingTime = (double)totalWT / n;
    res.avgResponseTime = (double)totalRT / n;
    res.cpuUtilization = (maxCT > 0) ? ((double)totalBusy / maxCT) * 100.0 : 0.0;
    res.throughput = (maxCT > 0) ? ((double)n / maxCT) : 0.0;
}

// ==========================================
// 1. FCFS (First Come First Serve)
// ==========================================
ScheduleResult CPUScheduler::scheduleFCFS(const std::vector<ProcessInput>& processes) {
    ScheduleResult res;
    res.algorithm = "First Come First Serve (FCFS)";
    if (processes.empty()) return res;

    std::vector<ProcessInput> procs = processes;
    std::sort(procs.begin(), procs.end(), [](const ProcessInput& a, const ProcessInput& b) {
        if (a.arrivalTime != b.arrivalTime) return a.arrivalTime < b.arrivalTime;
        return a.pid < b.pid;
    });

    std::map<int, int> firstExec;
    std::map<int, int> completion;
    int currentTime = 0;

    for (const auto& p : procs) {
        if (currentTime < p.arrivalTime) {
            // Idle time
            res.ganttChart.push_back({-1, "IDLE", currentTime, p.arrivalTime});
            currentTime = p.arrivalTime;
        }

        firstExec[p.pid] = currentTime;
        int startTime = currentTime;
        int endTime = startTime + p.burstTime;
        res.ganttChart.push_back({p.pid, p.name, startTime, endTime});
        currentTime = endTime;
        completion[p.pid] = currentTime;
    }

    // Build timeline steps
    int maxT = currentTime;
    for (int t = 0; t <= maxT; ++t) {
        TimeStepState step;
        step.time = t;
        step.runningPid = -1;
        step.runningName = "IDLE";

        for (const auto& seg : res.ganttChart) {
            if (t >= seg.startTime && t < seg.endTime) {
                step.runningPid = seg.pid;
                step.runningName = seg.processName;
                break;
            }
        }

        for (const auto& p : procs) {
            TimeStepProcessState ps;
            ps.pid = p.pid;
            ps.name = p.name;

            if (t < p.arrivalTime) {
                ps.state = 0; // Not arrived
                ps.remainingBurst = p.burstTime;
            } else if (t >= completion[p.pid]) {
                ps.state = 3; // Completed
                ps.remainingBurst = 0;
            } else if (p.pid == step.runningPid) {
                ps.state = 2; // Running
                int elapsed = t - firstExec[p.pid];
                ps.remainingBurst = p.burstTime - elapsed;
            } else {
                ps.state = 1; // Ready
                ps.remainingBurst = p.burstTime;
                step.readyQueuePids.push_back(p.pid);
            }
            step.processStates.push_back(ps);
        }

        if (step.runningPid != -1) {
            step.log = "Time " + std::to_string(t) + ": " + step.runningName + " is executing.";
        } else if (t < maxT) {
            step.log = "Time " + std::to_string(t) + ": CPU is IDLE.";
        } else {
            step.log = "Time " + std::to_string(t) + ": All processes completed.";
        }
        res.timelineSteps.push_back(step);
    }

    finalizeScheduleResult(res, processes, firstExec, completion);
    return res;
}

// ==========================================
// 2. SJF (Shortest Job First - Non-preemptive)
// ==========================================
ScheduleResult CPUScheduler::scheduleSJF(const std::vector<ProcessInput>& processes) {
    ScheduleResult res;
    res.algorithm = "Shortest Job First (SJF Non-preemptive)";
    if (processes.empty()) return res;

    int n = (int)processes.size();
    std::vector<bool> completed(n, false);
    std::map<int, int> firstExec;
    std::map<int, int> completion;
    int completedCount = 0;
    int currentTime = 0;

    while (completedCount < n) {
        int bestIdx = -1;
        int minBurst = INT_MAX;

        for (int i = 0; i < n; ++i) {
            if (!completed[i] && processes[i].arrivalTime <= currentTime) {
                if (processes[i].burstTime < minBurst) {
                    minBurst = processes[i].burstTime;
                    bestIdx = i;
                } else if (processes[i].burstTime == minBurst) {
                    // Tie-breaker: earliest arrival time, then lowest PID
                    if (bestIdx == -1 || processes[i].arrivalTime < processes[bestIdx].arrivalTime ||
                        (processes[i].arrivalTime == processes[bestIdx].arrivalTime && processes[i].pid < processes[bestIdx].pid)) {
                        bestIdx = i;
                    }
                }
            }
        }

        if (bestIdx == -1) {
            // Find earliest next arrival
            int nextArrival = INT_MAX;
            for (int i = 0; i < n; ++i) {
                if (!completed[i] && processes[i].arrivalTime > currentTime) {
                    if (processes[i].arrivalTime < nextArrival) {
                        nextArrival = processes[i].arrivalTime;
                    }
                }
            }
            if (nextArrival != INT_MAX) {
                res.ganttChart.push_back({-1, "IDLE", currentTime, nextArrival});
                currentTime = nextArrival;
            } else {
                break;
            }
        } else {
            const auto& p = processes[bestIdx];
            firstExec[p.pid] = currentTime;
            int startTime = currentTime;
            int endTime = startTime + p.burstTime;
            res.ganttChart.push_back({p.pid, p.name, startTime, endTime});
            currentTime = endTime;
            completion[p.pid] = currentTime;
            completed[bestIdx] = true;
            completedCount++;
        }
    }

    int maxT = currentTime;
    for (int t = 0; t <= maxT; ++t) {
        TimeStepState step;
        step.time = t;
        step.runningPid = -1;
        step.runningName = "IDLE";

        for (const auto& seg : res.ganttChart) {
            if (t >= seg.startTime && t < seg.endTime) {
                step.runningPid = seg.pid;
                step.runningName = seg.processName;
                break;
            }
        }

        for (const auto& p : processes) {
            TimeStepProcessState ps;
            ps.pid = p.pid;
            ps.name = p.name;

            if (t < p.arrivalTime) {
                ps.state = 0;
                ps.remainingBurst = p.burstTime;
            } else if (t >= completion[p.pid]) {
                ps.state = 3;
                ps.remainingBurst = 0;
            } else if (p.pid == step.runningPid) {
                ps.state = 2;
                int elapsed = t - firstExec[p.pid];
                ps.remainingBurst = p.burstTime - elapsed;
            } else {
                ps.state = 1;
                ps.remainingBurst = p.burstTime;
                step.readyQueuePids.push_back(p.pid);
            }
            step.processStates.push_back(ps);
        }

        if (step.runningPid != -1) {
            step.log = "Time " + std::to_string(t) + ": " + step.runningName + " executing (SJF Non-preemptive).";
        } else if (t < maxT) {
            step.log = "Time " + std::to_string(t) + ": CPU is IDLE.";
        } else {
            step.log = "Time " + std::to_string(t) + ": All processes finished.";
        }
        res.timelineSteps.push_back(step);
    }

    finalizeScheduleResult(res, processes, firstExec, completion);
    return res;
}

// ==========================================
// 3. SRTF (Shortest Remaining Time First)
// ==========================================
ScheduleResult CPUScheduler::scheduleSRTF(const std::vector<ProcessInput>& processes) {
    ScheduleResult res;
    res.algorithm = "Shortest Remaining Time First (SRTF Preemptive)";
    if (processes.empty()) return res;

    int n = (int)processes.size();
    std::vector<int> remBurst(n);
    for (int i = 0; i < n; ++i) remBurst[i] = processes[i].burstTime;

    std::map<int, int> firstExec;
    std::map<int, int> completion;
    int completedCount = 0;
    int t = 0;
    std::vector<GanttSegment> unitSegments;

    while (completedCount < n) {
        int bestIdx = -1;
        int minRem = INT_MAX;

        for (int i = 0; i < n; ++i) {
            if (remBurst[i] > 0 && processes[i].arrivalTime <= t) {
                if (remBurst[i] < minRem) {
                    minRem = remBurst[i];
                    bestIdx = i;
                } else if (remBurst[i] == minRem) {
                    if (bestIdx == -1 || processes[i].arrivalTime < processes[bestIdx].arrivalTime ||
                        (processes[i].arrivalTime == processes[bestIdx].arrivalTime && processes[i].pid < processes[bestIdx].pid)) {
                        bestIdx = i;
                    }
                }
            }
        }

        TimeStepState step;
        step.time = t;

        if (bestIdx == -1) {
            unitSegments.push_back({-1, "IDLE", t, t + 1});
            step.runningPid = -1;
            step.runningName = "IDLE";
            step.log = "Time " + std::to_string(t) + ": CPU IDLE (No process arrived).";
        } else {
            if (firstExec.find(processes[bestIdx].pid) == firstExec.end()) {
                firstExec[processes[bestIdx].pid] = t;
            }

            unitSegments.push_back({processes[bestIdx].pid, processes[bestIdx].name, t, t + 1});
            step.runningPid = processes[bestIdx].pid;
            step.runningName = processes[bestIdx].name;

            remBurst[bestIdx]--;
            if (remBurst[bestIdx] == 0) {
                completion[processes[bestIdx].pid] = t + 1;
                completedCount++;
            }
            step.log = "Time " + std::to_string(t) + ": " + step.runningName + " executing (Remaining: " + std::to_string(remBurst[bestIdx]) + ").";
        }

        for (int i = 0; i < n; ++i) {
            TimeStepProcessState ps;
            ps.pid = processes[i].pid;
            ps.name = processes[i].name;
            ps.remainingBurst = remBurst[i];

            if (t < processes[i].arrivalTime) {
                ps.state = 0;
            } else if (remBurst[i] == 0 && (completion.find(processes[i].pid) != completion.end() && completion[processes[i].pid] <= t)) {
                ps.state = 3;
            } else if (i == bestIdx) {
                ps.state = 2;
            } else {
                ps.state = 1;
                step.readyQueuePids.push_back(processes[i].pid);
            }
            step.processStates.push_back(ps);
        }

        res.timelineSteps.push_back(step);
        t++;
    }

    res.ganttChart = consolidateGantt(unitSegments);
    finalizeScheduleResult(res, processes, firstExec, completion);
    return res;
}

// ==========================================
// 4. Round Robin (RR)
// ==========================================
ScheduleResult CPUScheduler::scheduleRR(const std::vector<ProcessInput>& processes, int timeQuantum) {
    ScheduleResult res;
    res.algorithm = "Round Robin (RR, TQ=" + std::to_string(timeQuantum) + ")";
    if (processes.empty()) return res;
    if (timeQuantum <= 0) timeQuantum = 2;

    int n = (int)processes.size();
    std::vector<ProcessInput> procs = processes;
    std::sort(procs.begin(), procs.end(), [](const ProcessInput& a, const ProcessInput& b) {
        if (a.arrivalTime != b.arrivalTime) return a.arrivalTime < b.arrivalTime;
        return a.pid < b.pid;
    });

    std::vector<int> remBurst(n);
    std::map<int, int> pidToIndex;
    for (int i = 0; i < n; ++i) {
        remBurst[i] = procs[i].burstTime;
        pidToIndex[procs[i].pid] = i;
    }

    std::queue<int> readyQ;
    std::vector<bool> inQueueOrDone(n, false);
    std::map<int, int> firstExec;
    std::map<int, int> completion;

    int currentTime = 0;
    int completedCount = 0;

    auto pushArrived = [&](int upToTime) {
        for (int i = 0; i < n; ++i) {
            if (!inQueueOrDone[i] && procs[i].arrivalTime <= upToTime) {
                readyQ.push(i);
                inQueueOrDone[i] = true;
            }
        }
    };

    pushArrived(currentTime);

    while (completedCount < n) {
        if (readyQ.empty()) {
            int nextArrival = INT_MAX;
            for (int i = 0; i < n; ++i) {
                if (!inQueueOrDone[i] && procs[i].arrivalTime > currentTime) {
                    if (procs[i].arrivalTime < nextArrival) {
                        nextArrival = procs[i].arrivalTime;
                    }
                }
            }
            if (nextArrival != INT_MAX) {
                res.ganttChart.push_back({-1, "IDLE", currentTime, nextArrival});
                currentTime = nextArrival;
                pushArrived(currentTime);
            } else {
                break;
            }
            continue;
        }

        int currIdx = readyQ.front();
        readyQ.pop();

        if (firstExec.find(procs[currIdx].pid) == firstExec.end()) {
            firstExec[procs[currIdx].pid] = currentTime;
        }

        int slice = std::min(timeQuantum, remBurst[currIdx]);
        int startTime = currentTime;
        int endTime = startTime + slice;
        res.ganttChart.push_back({procs[currIdx].pid, procs[currIdx].name, startTime, endTime});

        currentTime = endTime;
        remBurst[currIdx] -= slice;

        // Push processes that arrived while current process was running
        pushArrived(currentTime);

        if (remBurst[currIdx] > 0) {
            readyQ.push(currIdx);
        } else {
            completion[procs[currIdx].pid] = currentTime;
            completedCount++;
        }
    }

    // Build timeline steps
    int maxT = currentTime;
    for (int t = 0; t <= maxT; ++t) {
        TimeStepState step;
        step.time = t;
        step.runningPid = -1;
        step.runningName = "IDLE";

        for (const auto& seg : res.ganttChart) {
            if (t >= seg.startTime && t < seg.endTime) {
                step.runningPid = seg.pid;
                step.runningName = seg.processName;
                break;
            }
        }

        for (const auto& p : procs) {
            TimeStepProcessState ps;
            ps.pid = p.pid;
            ps.name = p.name;
            int idx = pidToIndex[p.pid];

            if (t < p.arrivalTime) {
                ps.state = 0;
                ps.remainingBurst = p.burstTime;
            } else if (t >= completion[p.pid]) {
                ps.state = 3;
                ps.remainingBurst = 0;
            } else if (p.pid == step.runningPid) {
                ps.state = 2;
                ps.remainingBurst = std::max(0, p.burstTime - (t - firstExec[p.pid]));
            } else {
                ps.state = 1;
                ps.remainingBurst = p.burstTime;
                step.readyQueuePids.push_back(p.pid);
            }
            step.processStates.push_back(ps);
        }

        if (step.runningPid != -1) {
            step.log = "Time " + std::to_string(t) + ": " + step.runningName + " executing under Round Robin.";
        } else if (t < maxT) {
            step.log = "Time " + std::to_string(t) + ": CPU is IDLE.";
        } else {
            step.log = "Time " + std::to_string(t) + ": All processes finished.";
        }
        res.timelineSteps.push_back(step);
    }

    finalizeScheduleResult(res, processes, firstExec, completion);
    return res;
}

// ==========================================
// 5. Priority Scheduling (Non-preemptive)
// ==========================================
ScheduleResult CPUScheduler::schedulePriorityNonPreemptive(
    const std::vector<ProcessInput>& processes,
    bool lowerIsHigher
) {
    ScheduleResult res;
    res.algorithm = "Priority Scheduling (Non-preemptive)";
    if (processes.empty()) return res;

    int n = (int)processes.size();
    std::vector<bool> completed(n, false);
    std::map<int, int> firstExec;
    std::map<int, int> completion;
    int completedCount = 0;
    int currentTime = 0;

    auto comparePriority = [lowerIsHigher](int p1, int p2) {
        return lowerIsHigher ? (p1 < p2) : (p1 > p2);
    };

    while (completedCount < n) {
        int bestIdx = -1;

        for (int i = 0; i < n; ++i) {
            if (!completed[i] && processes[i].arrivalTime <= currentTime) {
                if (bestIdx == -1) {
                    bestIdx = i;
                } else if (comparePriority(processes[i].priority, processes[bestIdx].priority)) {
                    bestIdx = i;
                } else if (processes[i].priority == processes[bestIdx].priority) {
                    if (processes[i].arrivalTime < processes[bestIdx].arrivalTime ||
                        (processes[i].arrivalTime == processes[bestIdx].arrivalTime && processes[i].pid < processes[bestIdx].pid)) {
                        bestIdx = i;
                    }
                }
            }
        }

        if (bestIdx == -1) {
            int nextArrival = INT_MAX;
            for (int i = 0; i < n; ++i) {
                if (!completed[i] && processes[i].arrivalTime > currentTime) {
                    if (processes[i].arrivalTime < nextArrival) {
                        nextArrival = processes[i].arrivalTime;
                    }
                }
            }
            if (nextArrival != INT_MAX) {
                res.ganttChart.push_back({-1, "IDLE", currentTime, nextArrival});
                currentTime = nextArrival;
            } else {
                break;
            }
        } else {
            const auto& p = processes[bestIdx];
            firstExec[p.pid] = currentTime;
            int startTime = currentTime;
            int endTime = startTime + p.burstTime;
            res.ganttChart.push_back({p.pid, p.name, startTime, endTime});
            currentTime = endTime;
            completion[p.pid] = currentTime;
            completed[bestIdx] = true;
            completedCount++;
        }
    }

    int maxT = currentTime;
    for (int t = 0; t <= maxT; ++t) {
        TimeStepState step;
        step.time = t;
        step.runningPid = -1;
        step.runningName = "IDLE";

        for (const auto& seg : res.ganttChart) {
            if (t >= seg.startTime && t < seg.endTime) {
                step.runningPid = seg.pid;
                step.runningName = seg.processName;
                break;
            }
        }

        for (const auto& p : processes) {
            TimeStepProcessState ps;
            ps.pid = p.pid;
            ps.name = p.name;

            if (t < p.arrivalTime) {
                ps.state = 0;
                ps.remainingBurst = p.burstTime;
            } else if (t >= completion[p.pid]) {
                ps.state = 3;
                ps.remainingBurst = 0;
            } else if (p.pid == step.runningPid) {
                ps.state = 2;
                ps.remainingBurst = p.burstTime - (t - firstExec[p.pid]);
            } else {
                ps.state = 1;
                ps.remainingBurst = p.burstTime;
                step.readyQueuePids.push_back(p.pid);
            }
            step.processStates.push_back(ps);
        }

        if (step.runningPid != -1) {
            step.log = "Time " + std::to_string(t) + ": " + step.runningName + " running (Priority Non-preemptive).";
        } else if (t < maxT) {
            step.log = "Time " + std::to_string(t) + ": CPU is IDLE.";
        } else {
            step.log = "Time " + std::to_string(t) + ": All processes finished.";
        }
        res.timelineSteps.push_back(step);
    }

    finalizeScheduleResult(res, processes, firstExec, completion);
    return res;
}

// ==========================================
// 6. Priority Scheduling (Preemptive)
// ==========================================
ScheduleResult CPUScheduler::schedulePriorityPreemptive(
    const std::vector<ProcessInput>& processes,
    bool lowerIsHigher
) {
    ScheduleResult res;
    res.algorithm = "Priority Scheduling (Preemptive)";
    if (processes.empty()) return res;

    int n = (int)processes.size();
    std::vector<int> remBurst(n);
    for (int i = 0; i < n; ++i) remBurst[i] = processes[i].burstTime;

    std::map<int, int> firstExec;
    std::map<int, int> completion;
    int completedCount = 0;
    int t = 0;
    std::vector<GanttSegment> unitSegments;

    auto comparePriority = [lowerIsHigher](int p1, int p2) {
        return lowerIsHigher ? (p1 < p2) : (p1 > p2);
    };

    while (completedCount < n) {
        int bestIdx = -1;

        for (int i = 0; i < n; ++i) {
            if (remBurst[i] > 0 && processes[i].arrivalTime <= t) {
                if (bestIdx == -1) {
                    bestIdx = i;
                } else if (comparePriority(processes[i].priority, processes[bestIdx].priority)) {
                    bestIdx = i;
                } else if (processes[i].priority == processes[bestIdx].priority) {
                    // Tie-breaker: arrival time, then remaining burst, then PID
                    if (processes[i].arrivalTime < processes[bestIdx].arrivalTime ||
                        (processes[i].arrivalTime == processes[bestIdx].arrivalTime && remBurst[i] < remBurst[bestIdx]) ||
                        (processes[i].arrivalTime == processes[bestIdx].arrivalTime && remBurst[i] == remBurst[bestIdx] && processes[i].pid < processes[bestIdx].pid)) {
                        bestIdx = i;
                    }
                }
            }
        }

        TimeStepState step;
        step.time = t;

        if (bestIdx == -1) {
            unitSegments.push_back({-1, "IDLE", t, t + 1});
            step.runningPid = -1;
            step.runningName = "IDLE";
            step.log = "Time " + std::to_string(t) + ": CPU IDLE.";
        } else {
            if (firstExec.find(processes[bestIdx].pid) == firstExec.end()) {
                firstExec[processes[bestIdx].pid] = t;
            }

            unitSegments.push_back({processes[bestIdx].pid, processes[bestIdx].name, t, t + 1});
            step.runningPid = processes[bestIdx].pid;
            step.runningName = processes[bestIdx].name;

            remBurst[bestIdx]--;
            if (remBurst[bestIdx] == 0) {
                completion[processes[bestIdx].pid] = t + 1;
                completedCount++;
            }
            step.log = "Time " + std::to_string(t) + ": " + step.runningName + " executing (Priority: " + std::to_string(processes[bestIdx].priority) + ").";
        }

        for (int i = 0; i < n; ++i) {
            TimeStepProcessState ps;
            ps.pid = processes[i].pid;
            ps.name = processes[i].name;
            ps.remainingBurst = remBurst[i];

            if (t < processes[i].arrivalTime) {
                ps.state = 0;
            } else if (remBurst[i] == 0 && (completion.find(processes[i].pid) != completion.end() && completion[processes[i].pid] <= t)) {
                ps.state = 3;
            } else if (i == bestIdx) {
                ps.state = 2;
            } else {
                ps.state = 1;
                step.readyQueuePids.push_back(processes[i].pid);
            }
            step.processStates.push_back(ps);
        }

        res.timelineSteps.push_back(step);
        t++;
    }

    res.ganttChart = consolidateGantt(unitSegments);
    finalizeScheduleResult(res, processes, firstExec, completion);
    return res;
}

// Compare all 6 algorithms
std::vector<ScheduleResult> CPUScheduler::compareAll(
    const std::vector<ProcessInput>& processes,
    int timeQuantum,
    bool lowerIsHigher
) {
    std::vector<ScheduleResult> all;
    all.push_back(scheduleFCFS(processes));
    all.push_back(scheduleSJF(processes));
    all.push_back(scheduleSRTF(processes));
    all.push_back(scheduleRR(processes, timeQuantum));
    all.push_back(schedulePriorityNonPreemptive(processes, lowerIsHigher));
    all.push_back(schedulePriorityPreemptive(processes, lowerIsHigher));
    return all;
}

// JSON Serialization helpers
std::string CPUScheduler::resultToJson(const ScheduleResult& res) {
    std::ostringstream ss;
    ss << std::fixed << std::setprecision(2);
    ss << "{";
    ss << "\"algorithm\":\"" << res.algorithm << "\",";
    ss << "\"avgTurnaroundTime\":" << res.avgTurnaroundTime << ",";
    ss << "\"avgWaitingTime\":" << res.avgWaitingTime << ",";
    ss << "\"avgResponseTime\":" << res.avgResponseTime << ",";
    ss << "\"cpuUtilization\":" << res.cpuUtilization << ",";
    ss << "\"throughput\":" << res.throughput << ",";
    ss << "\"totalTime\":" << res.totalTime << ",";
    ss << "\"idleTime\":" << res.idleTime << ",";

    // Process results
    ss << "\"processResults\":[";
    for (size_t i = 0; i < res.processResults.size(); ++i) {
        const auto& pr = res.processResults[i];
        if (i > 0) ss << ",";
        ss << "{"
           << "\"pid\":" << pr.pid << ","
           << "\"name\":\"" << pr.name << "\","
           << "\"arrivalTime\":" << pr.arrivalTime << ","
           << "\"burstTime\":" << pr.burstTime << ","
           << "\"priority\":" << pr.priority << ","
           << "\"completionTime\":" << pr.completionTime << ","
           << "\"turnaroundTime\":" << pr.turnaroundTime << ","
           << "\"waitingTime\":" << pr.waitingTime << ","
           << "\"responseTime\":" << pr.responseTime
           << "}";
    }
    ss << "],";

    // Gantt chart
    ss << "\"ganttChart\":[";
    for (size_t i = 0; i < res.ganttChart.size(); ++i) {
        const auto& g = res.ganttChart[i];
        if (i > 0) ss << ",";
        ss << "{"
           << "\"pid\":" << g.pid << ","
           << "\"processName\":\"" << g.processName << "\","
           << "\"startTime\":" << g.startTime << ","
           << "\"endTime\":" << g.endTime
           << "}";
    }
    ss << "],";

    // Timeline steps
    ss << "\"timelineSteps\":[";
    for (size_t i = 0; i < res.timelineSteps.size(); ++i) {
        const auto& st = res.timelineSteps[i];
        if (i > 0) ss << ",";
        ss << "{"
           << "\"time\":" << st.time << ","
           << "\"runningPid\":" << st.runningPid << ","
           << "\"runningName\":\"" << st.runningName << "\","
           << "\"log\":\"" << st.log << "\","
           << "\"readyQueuePids\":[";
        for (size_t j = 0; j < st.readyQueuePids.size(); ++j) {
            if (j > 0) ss << ",";
            ss << st.readyQueuePids[j];
        }
        ss << "],\"processStates\":[";
        for (size_t j = 0; j < st.processStates.size(); ++j) {
            const auto& ps = st.processStates[j];
            if (j > 0) ss << ",";
            ss << "{"
               << "\"pid\":" << ps.pid << ","
               << "\"name\":\"" << ps.name << "\","
               << "\"remainingBurst\":" << ps.remainingBurst << ","
               << "\"state\":" << ps.state
               << "}";
        }
        ss << "]}";
    }
    ss << "]}";

    return ss.str();
}

std::string CPUScheduler::comparisonToJson(const std::vector<ScheduleResult>& results) {
    std::ostringstream ss;
    ss << "[";
    for (size_t i = 0; i < results.size(); ++i) {
        if (i > 0) ss << ",";
        ss << resultToJson(results[i]);
    }
    ss << "]";
    return ss.str();
}
