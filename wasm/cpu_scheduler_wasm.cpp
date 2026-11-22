#include "../cpp/cpu_scheduler.hpp"

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
#include <emscripten/emscripten.h>

using namespace emscripten;

// Wrapper functions for JS / WebAssembly
std::string wasmRunScheduleJson(
    const std::string& algorithm,
    const std::string& inputJson,
    int timeQuantum,
    bool lowerIsHigher
) {
    // We can parse or pass inputs directly
    return "";
}

// Embind structures
EMSCRIPTEN_BINDINGS(CPUSchedulerModule) {
    value_object<ProcessInput>("ProcessInput")
        .field("pid", &ProcessInput::pid)
        .field("name", &ProcessInput::name)
        .field("arrivalTime", &ProcessInput::arrivalTime)
        .field("burstTime", &ProcessInput::burstTime)
        .field("priority", &ProcessInput::priority);

    value_object<ProcessResult>("ProcessResult")
        .field("pid", &ProcessResult::pid)
        .field("name", &ProcessResult::name)
        .field("arrivalTime", &ProcessResult::arrivalTime)
        .field("burstTime", &ProcessResult::burstTime)
        .field("priority", &ProcessResult::priority)
        .field("completionTime", &ProcessResult::completionTime)
        .field("turnaroundTime", &ProcessResult::turnaroundTime)
        .field("waitingTime", &ProcessResult::waitingTime)
        .field("responseTime", &ProcessResult::responseTime);

    value_object<GanttSegment>("GanttSegment")
        .field("pid", &GanttSegment::pid)
        .field("processName", &GanttSegment::processName)
        .field("startTime", &GanttSegment::startTime)
        .field("endTime", &GanttSegment::endTime);

    value_object<TimeStepProcessState>("TimeStepProcessState")
        .field("pid", &TimeStepProcessState::pid)
        .field("name", &TimeStepProcessState::name)
        .field("remainingBurst", &TimeStepProcessState::remainingBurst)
        .field("state", &TimeStepProcessState::state);

    value_object<TimeStepState>("TimeStepState")
        .field("time", &TimeStepState::time)
        .field("runningPid", &TimeStepState::runningPid)
        .field("runningName", &TimeStepState::runningName)
        .field("readyQueuePids", &TimeStepState::readyQueuePids)
        .field("processStates", &TimeStepState::processStates)
        .field("log", &TimeStepState::log);

    register_vector<ProcessInput>("VectorProcessInput");
    register_vector<ProcessResult>("VectorProcessResult");
    register_vector<GanttSegment>("VectorGanttSegment");
    register_vector<TimeStepState>("VectorTimeStepState");
    register_vector<int>("VectorInt");

    value_object<ScheduleResult>("ScheduleResult")
        .field("algorithm", &ScheduleResult::algorithm)
        .field("processResults", &ScheduleResult::processResults)
        .field("ganttChart", &ScheduleResult::ganttChart)
        .field("timelineSteps", &ScheduleResult::timelineSteps)
        .field("avgTurnaroundTime", &ScheduleResult::avgTurnaroundTime)
        .field("avgWaitingTime", &ScheduleResult::avgWaitingTime)
        .field("avgResponseTime", &ScheduleResult::avgResponseTime)
        .field("cpuUtilization", &ScheduleResult::cpuUtilization)
        .field("throughput", &ScheduleResult::throughput)
        .field("totalTime", &ScheduleResult::totalTime)
        .field("idleTime", &ScheduleResult::idleTime);

    register_vector<ScheduleResult>("VectorScheduleResult");

    class_<CPUScheduler>("CPUScheduler")
        .class_function("scheduleFCFS", &CPUScheduler::scheduleFCFS)
        .class_function("scheduleSJF", &CPUScheduler::scheduleSJF)
        .class_function("scheduleSRTF", &CPUScheduler::scheduleSRTF)
        .class_function("scheduleRR", &CPUScheduler::scheduleRR)
        .class_function("schedulePriorityNonPreemptive", &CPUScheduler::schedulePriorityNonPreemptive)
        .class_function("schedulePriorityPreemptive", &CPUScheduler::schedulePriorityPreemptive)
        .class_function("compareAll", &CPUScheduler::compareAll)
        .class_function("resultToJson", &CPUScheduler::resultToJson)
        .class_function("comparisonToJson", &CPUScheduler::comparisonToJson);
}
#endif
