#include "deadlock_manager.hpp"
#include <sstream>
#include <iostream>

static std::string validationError(
    const std::vector<std::vector<int> >& allocation,
    const std::vector<std::vector<int> >& maximum,
    const std::vector<int>& available,
    const std::vector<std::vector<int> >& request = std::vector<std::vector<int> >()) {
    if (maximum.empty() || allocation.empty()) return "At least one process is required.";
    if (allocation.size() != maximum.size()) return "Allocation and maximum matrices must contain the same number of processes.";
    if (available.empty()) return "Available resource vector is required.";
    for (size_t i = 0; i < allocation.size(); ++i) {
        if (allocation[i].size() != available.size() || maximum[i].size() != available.size())
            return "All matrix rows must contain exactly the number of resource types.";
        for (size_t j = 0; j < available.size(); ++j) {
            if (allocation[i][j] < 0 || maximum[i][j] < 0 || allocation[i][j] > maximum[i][j])
                return "Allocation cannot be negative or exceed maximum demand.";
        }
    }
    for (int value : available) if (value < 0) return "Available resources cannot be negative.";
    if (!request.empty()) {
        if (request.size() != allocation.size()) return "Request matrix row count must match process count.";
        for (const auto& row : request) {
            if (row.size() != available.size()) return "Request matrix columns must match resource types.";
            for (int value : row) if (value < 0) return "Request values cannot be negative.";
        }
    }
    return "";
}

std::vector<std::vector<int> > DeadlockManager::calculateNeed(
    const std::vector<std::vector<int> >& maximum,
    const std::vector<std::vector<int> >& allocation) {
    std::vector<std::vector<int> > need;
    if (maximum.size() != allocation.size()) return need;
    for (size_t i = 0; i < maximum.size(); ++i) {
        std::vector<int> row;
        if (maximum[i].size() != allocation[i].size()) return std::vector<std::vector<int> >();
        for (size_t j = 0; j < maximum[i].size(); ++j)
            row.push_back(maximum[i][j] - allocation[i][j]);
        need.push_back(row);
    }
    return need;
}

BankersResult DeadlockManager::runBankers(
    const std::vector<std::vector<int> >& allocation,
    const std::vector<std::vector<int> >& maximum,
    const std::vector<int>& available) {
    BankersResult result;
    result.isSafe = false;
    result.error = validationError(allocation, maximum, available);
    result.need = calculateNeed(maximum, allocation);
    if (!result.error.empty()) return result;

    std::vector<int> work = available;
    std::vector<bool> finish(allocation.size(), false);
    int stepNumber = 1;
    while ((int)result.safeSequence.size() < (int)allocation.size()) {
        bool found = false;
        for (size_t i = 0; i < allocation.size(); ++i) {
            if (finish[i]) continue;
            bool canRun = true;
            for (size_t j = 0; j < work.size(); ++j)
                if (result.need[i][j] > work[j]) canRun = false;

            std::vector<int> workBefore = work;
            std::vector<bool> finishBefore = finish;
            DeadlockSafetyStep step;
            step.stepNumber = stepNumber++;
            step.processIndex = (int)i;
            step.workBefore = workBefore;
            step.finishBefore = finishBefore;
            step.selected = canRun;
            if (canRun) {
                for (size_t j = 0; j < work.size(); ++j) work[j] += allocation[i][j];
                finish[i] = true;
                found = true;
                result.safeSequence.push_back((int)i);
                step.message = "P" + std::to_string(i) + " satisfies Need <= Work; release its allocation.";
            } else {
                step.message = "P" + std::to_string(i) + " is skipped because Need cannot be satisfied.";
            }
            step.workAfter = work;
            step.finishAfter = finish;
            result.steps.push_back(step);
            if (canRun) break;
        }
        if (!found) break;
    }
    result.isSafe = (int)result.safeSequence.size() == (int)allocation.size();
    result.state = result.isSafe ? "SAFE" : "UNSAFE";
    return result;
}

RequestResult DeadlockManager::requestResources(
    int processIndex,
    const std::vector<int>& request,
    const std::vector<std::vector<int> >& allocation,
    const std::vector<std::vector<int> >& maximum,
    const std::vector<int>& available) {
    RequestResult result;
    result.validRequest = false;
    result.granted = false;
    result.status = "INVALID";
    result.availableAfter = available;
    result.allocationAfter = allocation;
    result.needAfter = calculateNeed(maximum, allocation);

    std::string matrixError = validationError(allocation, maximum, available);
    if (!matrixError.empty()) { result.reason = matrixError; return result; }
    if (processIndex < 0 || processIndex >= (int)allocation.size()) {
        result.reason = "Requested process index is out of range.";
        return result;
    }
    if (request.size() != available.size()) {
        result.reason = "Request vector must contain exactly the number of resource types.";
        return result;
    }
    for (int value : request) if (value < 0) {
        result.reason = "Request values cannot be negative.";
        return result;
    }

    result.validRequest = true;
    for (size_t j = 0; j < request.size(); ++j) {
        if (request[j] > result.needAfter[processIndex][j]) {
            result.status = "DENIED";
            result.reason = "Request exceeds P" + std::to_string(processIndex) + "'s remaining maximum need.";
            return result;
        }
        if (request[j] > available[j]) {
            result.status = "DENIED";
            result.reason = "Request exceeds currently available resources.";
            return result;
        }
    }

    result.availableAfter = available;
    result.allocationAfter = allocation;
    result.needAfter = calculateNeed(maximum, allocation);
    for (size_t j = 0; j < request.size(); ++j) {
        result.availableAfter[j] -= request[j];
        result.allocationAfter[processIndex][j] += request[j];
        result.needAfter[processIndex][j] -= request[j];
    }
    BankersResult safety = runBankers(result.allocationAfter, maximum, result.availableAfter);
    result.steps = safety.steps;
    result.safeSequence = safety.safeSequence;
    if (safety.isSafe) {
        result.granted = true;
        result.status = "GRANTED";
        result.reason = "The state remains safe after granting the request.";
    } else {
        result.status = "DENIED";
        result.reason = "Granting the request would produce an unsafe state.";
    }
    return result;
}

DetectionResult DeadlockManager::detectDeadlock(
    const std::vector<std::vector<int> >& allocation,
    const std::vector<std::vector<int> >& request,
    const std::vector<int>& available) {
    DetectionResult result;
    result.hasDeadlock = false;
    result.error = validationError(allocation, allocation, available, request); // allocation as max fallback
    if (request.size() != allocation.size()) result.error = "Request matrix row count must match process count.";
    if (!result.error.empty()) return result;

    std::vector<int> work = available;
    std::vector<bool> finish(allocation.size(), false);
    int stepNumber = 1;
    while (true) {
        bool found = false;
        for (size_t i = 0; i < allocation.size(); ++i) {
            if (finish[i]) continue;
            bool canRun = true;
            for (size_t j = 0; j < work.size(); ++j)
                if (request[i][j] > work[j]) canRun = false;

            DetectionStep step;
            step.stepNumber = stepNumber++;
            step.processIndex = (int)i;
            step.workBefore = work;
            step.finishBefore = finish;
            step.selected = canRun;
            if (canRun) {
                for (size_t j = 0; j < work.size(); ++j) work[j] += allocation[i][j];
                finish[i] = true;
                found = true;
                step.message = "P" + std::to_string(i) + " can complete; release its allocation.";
            } else {
                step.message = "P" + std::to_string(i) + " cannot complete with the current Work.";
            }
            step.workAfter = work;
            step.finishAfter = finish;
            result.steps.push_back(step);
            if (canRun) break;
        }
        if (!found) break;
    }
    for (size_t i = 0; i < finish.size(); ++i)
        if (!finish[i]) result.deadlockedProcesses.push_back((int)i);
    result.hasDeadlock = !result.deadlockedProcesses.empty();
    return result;
}

static void appendIntJson(std::ostringstream& oss, const std::vector<int>& values) {
    oss << "[";
    for (size_t i = 0; i < values.size(); ++i) { if (i) oss << ","; oss << values[i]; }
    oss << "]";
}

static void appendBoolJson(std::ostringstream& oss, const std::vector<bool>& values) {
    oss << "[";
    for (size_t i = 0; i < values.size(); ++i) { if (i) oss << ","; oss << (values[i] ? "true" : "false"); }
    oss << "]";
}

static void appendMatrixJson(std::ostringstream& oss, const std::vector<std::vector<int> >& matrix) {
    oss << "[";
    for (size_t i = 0; i < matrix.size(); ++i) {
        if (i) oss << ",";
        appendIntJson(oss, matrix[i]);
    }
    oss << "]";
}

std::string DeadlockManager::bankerResultToJson(const BankersResult& result) {
    std::ostringstream oss;
    oss << "{\"isSafe\":" << (result.isSafe ? "true" : "false")
        << ",\"state\":\"" << result.state << "\",\"error\":\"" << result.error
        << "\",\"safeSequence\":";
    appendIntJson(oss, result.safeSequence);
    oss << ",\"need\":";
    appendMatrixJson(oss, result.need);
    oss << ",\"steps\":[";
    for (size_t i = 0; i < result.steps.size(); ++i) {
        if (i) oss << ",";
        const DeadlockSafetyStep& s = result.steps[i];
        oss << "{\"stepNumber\":" << s.stepNumber << ",\"processIndex\":" << s.processIndex
            << ",\"workBefore\":"; appendIntJson(oss, s.workBefore);
        oss << ",\"workAfter\":"; appendIntJson(oss, s.workAfter);
        oss << ",\"finishBefore\":"; appendBoolJson(oss, s.finishBefore);
        oss << ",\"finishAfter\":"; appendBoolJson(oss, s.finishAfter);
        oss << ",\"selected\":" << (s.selected ? "true" : "false")
            << ",\"message\":\"" << s.message << "\"}";
    }
    oss << "]}";
    return oss.str();
}

std::string DeadlockManager::detectionResultToJson(const DetectionResult& result) {
    std::ostringstream oss;
    oss << "{\"hasDeadlock\":" << (result.hasDeadlock ? "true" : "false")
        << ",\"error\":\"" << result.error << "\",\"deadlockedProcesses\":";
    appendIntJson(oss, result.deadlockedProcesses);
    oss << ",\"steps\":[";
    for (size_t i = 0; i < result.steps.size(); ++i) {
        if (i) oss << ",";
        const DetectionStep& s = result.steps[i];
        oss << "{\"stepNumber\":" << s.stepNumber << ",\"processIndex\":" << s.processIndex
            << ",\"workBefore\":"; appendIntJson(oss, s.workBefore);
        oss << ",\"workAfter\":"; appendIntJson(oss, s.workAfter);
        oss << ",\"finishBefore\":"; appendBoolJson(oss, s.finishBefore);
        oss << ",\"finishAfter\":"; appendBoolJson(oss, s.finishAfter);
        oss << ",\"selected\":" << (s.selected ? "true" : "false")
            << ",\"message\":\"" << s.message << "\"}";
    }
    oss << "]}";
    return oss.str();
}

std::string DeadlockManager::requestResultToJson(const RequestResult& result) {
    std::ostringstream oss;
    oss << "{\"validRequest\":" << (result.validRequest ? "true" : "false")
        << ",\"granted\":" << (result.granted ? "true" : "false")
        << ",\"status\":\"" << result.status << "\",\"reason\":\"" << result.reason
        << "\",\"availableAfter\":"; appendIntJson(oss, result.availableAfter);
    oss << ",\"safeSequence\":"; appendIntJson(oss, result.safeSequence);
    oss << ",\"allocationAfter\":"; appendMatrixJson(oss, result.allocationAfter);
    oss << ",\"needAfter\":"; appendMatrixJson(oss, result.needAfter);
    oss << ",\"steps\":[";
    for (size_t i = 0; i < result.steps.size(); ++i) {
        if (i) oss << ",";
        const DeadlockSafetyStep& s = result.steps[i];
        oss << "{\"stepNumber\":" << s.stepNumber << ",\"processIndex\":" << s.processIndex
            << ",\"workBefore\":"; appendIntJson(oss, s.workBefore);
        oss << ",\"workAfter\":"; appendIntJson(oss, s.workAfter);
        oss << ",\"finishBefore\":"; appendBoolJson(oss, s.finishBefore);
        oss << ",\"finishAfter\":"; appendBoolJson(oss, s.finishAfter);
        oss << ",\"selected\":" << (s.selected ? "true" : "false")
            << ",\"message\":\"" << s.message << "\"}";
    }
    oss << "]}";
    return oss.str();
}
