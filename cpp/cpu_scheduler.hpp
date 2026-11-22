#ifndef CPU_SCHEDULER_HPP
#define CPU_SCHEDULER_HPP

#include <string>
#include <vector>
#include <algorithm>
#include <sstream>
#include <iomanip>
#include <cmath>

struct ProcessInput {
    int pid;
    std::string name;
    int arrivalTime;
    int burstTime;
    int priority; // By default: lower numerical value = higher priority
};

struct ProcessResult {
    int pid;
    std::string name;
    int arrivalTime;
    int burstTime;
    int priority;
    int completionTime;
    int turnaroundTime; // CT - AT
    int waitingTime;    // TAT - BT
    int responseTime;   // firstExecutionTime - AT
};

struct GanttSegment {
    int pid; // -1 for IDLE
    std::string processName;
    int startTime;
    int endTime;
};

struct TimeStepProcessState {
    int pid;
    std::string name;
    int remainingBurst;
    int state; // 0 = Not Arrived, 1 = Ready, 2 = Running, 3 = Completed
};

struct TimeStepState {
    int time;
    int runningPid; // -1 if idle
    std::string runningName;
    std::vector<int> readyQueuePids;
    std::vector<TimeStepProcessState> processStates;
    std::string log;
};

struct ScheduleResult {
    std::string algorithm;
    std::vector<ProcessResult> processResults;
    std::vector<GanttSegment> ganttChart;
    std::vector<TimeStepState> timelineSteps;
    double avgTurnaroundTime;
    double avgWaitingTime;
    double avgResponseTime;
    double cpuUtilization; // Percentage 0 - 100
    double throughput;     // processes per time unit
    int totalTime;
    int idleTime;
};

class CPUScheduler {
public:
    static ScheduleResult scheduleFCFS(const std::vector<ProcessInput>& processes);
    static ScheduleResult scheduleSJF(const std::vector<ProcessInput>& processes);
    static ScheduleResult scheduleSRTF(const std::vector<ProcessInput>& processes);
    static ScheduleResult scheduleRR(const std::vector<ProcessInput>& processes, int timeQuantum);
    static ScheduleResult schedulePriorityNonPreemptive(const std::vector<ProcessInput>& processes, bool lowerIsHigher = true);
    static ScheduleResult schedulePriorityPreemptive(const std::vector<ProcessInput>& processes, bool lowerIsHigher = true);

    static std::vector<ScheduleResult> compareAll(
        const std::vector<ProcessInput>& processes,
        int timeQuantum = 2,
        bool lowerIsHigher = true
    );

    static std::string resultToJson(const ScheduleResult& res);
    static std::string comparisonToJson(const std::vector<ScheduleResult>& results);
};

#endif // CPU_SCHEDULER_HPP
