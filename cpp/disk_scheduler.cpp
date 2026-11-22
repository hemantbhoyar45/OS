#include "disk_scheduler.hpp"
#include <algorithm>
#include <cstdlib>

static bool validRequests(const std::vector<int>& requests, int initialHead,
                          int cylinderMin, int cylinderMax) {
    if (cylinderMin > cylinderMax || initialHead < cylinderMin || initialHead > cylinderMax)
        return false;
    for (int cylinder : requests)
        if (cylinder < cylinderMin || cylinder > cylinderMax)
            return false;
    return true;
}

static void addStep(DiskScheduleResult& result, int from, int to,
                    const std::string& type) {
    DiskStep step;
    step.stepNumber = (int)result.steps.size();
    step.fromPosition = from;
    step.toPosition = to;
    step.seekDistance = std::abs(to - from);
    step.cumulativeMovement = result.totalHeadMovement + step.seekDistance;
    step.type = type;
    result.steps.push_back(step);
    result.totalHeadMovement = step.cumulativeMovement;
}

static DiskScheduleResult makeResult(const std::string& algorithm,
                                     const std::vector<int>& requests,
                                     int initialHead, int cylinderMin, int cylinderMax) {
    DiskScheduleResult result;
    result.algorithm = algorithm;
    result.initialHead = initialHead;
    result.cylinderMin = cylinderMin;
    result.cylinderMax = cylinderMax;
    result.totalHeadMovement = 0;
    result.averageSeekDistance = 0.0;
    return result;
}

static void finalizeResult(DiskScheduleResult& result) {
    if (result.servicingOrder.empty())
        result.averageSeekDistance = 0.0;
    else
        result.averageSeekDistance = (double)result.totalHeadMovement / result.servicingOrder.size();
}

DiskScheduleResult DiskScheduler::simulateFCFS(
    const std::vector<int>& requests, int initialHead,
    int cylinderMin, int cylinderMax) {
    DiskScheduleResult result = makeResult("FCFS", requests, initialHead, cylinderMin, cylinderMax);
    int head = initialHead;
    for (int cylinder : requests) {
        if (!validRequests({cylinder}, head, cylinderMin, cylinderMax)) continue;
        addStep(result, head, cylinder, "request");
        head = cylinder;
        result.servicingOrder.push_back(cylinder);
    }
    finalizeResult(result);
    return result;
}

DiskScheduleResult DiskScheduler::simulateSSTF(
    const std::vector<int>& requests, int initialHead,
    int cylinderMin, int cylinderMax) {
    DiskScheduleResult result = makeResult("SSTF", requests, initialHead, cylinderMin, cylinderMax);
    if (!validRequests(requests, initialHead, cylinderMin, cylinderMax)) {
        finalizeResult(result);
        return result;
    }
    std::vector<int> remaining = requests;
    int head = initialHead;
    while (!remaining.empty()) {
        auto closest = std::min_element(remaining.begin(), remaining.end(),
            [head](int a, int b) {
                return std::abs(a - head) < std::abs(b - head);
            });
        int cylinder = *closest;
        addStep(result, head, cylinder, "request");
        head = cylinder;
        result.servicingOrder.push_back(cylinder);
        remaining.erase(closest);
    }
    finalizeResult(result);
    return result;
}

DiskScheduleResult DiskScheduler::simulateSCAN(
    const std::vector<int>& requests, int initialHead,
    int cylinderMin, int cylinderMax, DiskDirection direction) {
    DiskScheduleResult result = makeResult("SCAN", requests, initialHead, cylinderMin, cylinderMax);
    if (!validRequests(requests, initialHead, cylinderMin, cylinderMax)) { finalizeResult(result); return result; }
    std::vector<int> lower, higher;
    for (int cylinder : requests) {
        if (cylinder < initialHead) lower.push_back(cylinder);
        else if (cylinder > initialHead) higher.push_back(cylinder);
    }
    std::sort(lower.begin(), lower.end());
    std::sort(higher.begin(), higher.end());
    int head = initialHead;
    if (direction == DiskDirection::UP) {
        for (int cylinder : higher) { addStep(result, head, cylinder, "request"); head = cylinder; result.servicingOrder.push_back(cylinder); }
        if (!higher.empty() && head != cylinderMax) { addStep(result, head, cylinderMax, "boundary"); head = cylinderMax; }
        for (auto it = lower.rbegin(); it != lower.rend(); ++it) { addStep(result, head, *it, "request"); head = *it; result.servicingOrder.push_back(*it); }
    } else {
        for (auto it = lower.rbegin(); it != lower.rend(); ++it) { addStep(result, head, *it, "request"); head = *it; result.servicingOrder.push_back(*it); }
        if (!lower.empty() && head != cylinderMin) { addStep(result, head, cylinderMin, "boundary"); head = cylinderMin; }
        for (int cylinder : higher) { addStep(result, head, cylinder, "request"); head = cylinder; result.servicingOrder.push_back(cylinder); }
    }
    finalizeResult(result);
    return result;
}

DiskScheduleResult DiskScheduler::simulateCSCAN(
    const std::vector<int>& requests, int initialHead,
    int cylinderMin, int cylinderMax, DiskDirection direction) {
    DiskScheduleResult result = makeResult("C-SCAN", requests, initialHead, cylinderMin, cylinderMax);
    if (!validRequests(requests, initialHead, cylinderMin, cylinderMax)) { finalizeResult(result); return result; }
    std::vector<int> lower, higher;
    for (int cylinder : requests) {
        if (cylinder < initialHead) lower.push_back(cylinder);
        else if (cylinder > initialHead) higher.push_back(cylinder);
    }
    std::sort(lower.begin(), lower.end());
    std::sort(higher.begin(), higher.end());
    int head = initialHead;
    if (direction == DiskDirection::UP) {
        for (int cylinder : higher) { addStep(result, head, cylinder, "request"); head = cylinder; result.servicingOrder.push_back(cylinder); }
        if (!higher.empty() && head != cylinderMax) { addStep(result, head, cylinderMax, "boundary"); head = cylinderMax; }
        if (!lower.empty()) {
            addStep(result, head, cylinderMin, "circular_jump");
            head = cylinderMin;
            for (int cylinder : lower) { addStep(result, head, cylinder, "request"); head = cylinder; result.servicingOrder.push_back(cylinder); }
        }
    } else {
        for (auto it = lower.rbegin(); it != lower.rend(); ++it) { addStep(result, head, *it, "request"); head = *it; result.servicingOrder.push_back(*it); }
        if (!lower.empty() && head != cylinderMin) { addStep(result, head, cylinderMin, "boundary"); head = cylinderMin; }
        if (!higher.empty()) {
            addStep(result, head, cylinderMax, "circular_jump");
            head = cylinderMax;
            for (auto it = higher.rbegin(); it != higher.rend(); ++it) { addStep(result, head, *it, "request"); head = *it; result.servicingOrder.push_back(*it); }
        }
    }
    finalizeResult(result);
    return result;
}

DiskScheduleResult DiskScheduler::simulateLOOK(
    const std::vector<int>& requests, int initialHead,
    int cylinderMin, int cylinderMax, DiskDirection direction) {
    DiskScheduleResult result = makeResult("LOOK", requests, initialHead, cylinderMin, cylinderMax);
    if (!validRequests(requests, initialHead, cylinderMin, cylinderMax)) { finalizeResult(result); return result; }
    std::vector<int> lower, higher;
    for (int cylinder : requests) {
        if (cylinder < initialHead) lower.push_back(cylinder);
        else if (cylinder > initialHead) higher.push_back(cylinder);
    }
    std::sort(lower.begin(), lower.end());
    std::sort(higher.begin(), higher.end());
    int head = initialHead;
    if (direction == DiskDirection::UP) {
        for (int cylinder : higher) { addStep(result, head, cylinder, "request"); head = cylinder; result.servicingOrder.push_back(cylinder); }
        for (auto it = lower.rbegin(); it != lower.rend(); ++it) { addStep(result, head, *it, "request"); head = *it; result.servicingOrder.push_back(*it); }
    } else {
        for (auto it = lower.rbegin(); it != lower.rend(); ++it) { addStep(result, head, *it, "request"); head = *it; result.servicingOrder.push_back(*it); }
        for (int cylinder : higher) { addStep(result, head, cylinder, "request"); head = cylinder; result.servicingOrder.push_back(cylinder); }
    }
    finalizeResult(result);
    return result;
}

DiskScheduleResult DiskScheduler::simulateCLOOK(
    const std::vector<int>& requests, int initialHead,
    int cylinderMin, int cylinderMax, DiskDirection direction) {
    DiskScheduleResult result = makeResult("C-LOOK", requests, initialHead, cylinderMin, cylinderMax);
    if (!validRequests(requests, initialHead, cylinderMin, cylinderMax)) { finalizeResult(result); return result; }
    std::vector<int> lower, higher;
    for (int cylinder : requests) {
        if (cylinder < initialHead) lower.push_back(cylinder);
        else if (cylinder > initialHead) higher.push_back(cylinder);
    }
    std::sort(lower.begin(), lower.end());
    std::sort(higher.begin(), higher.end());
    int head = initialHead;
    if (direction == DiskDirection::UP) {
        for (int cylinder : higher) { addStep(result, head, cylinder, "request"); head = cylinder; result.servicingOrder.push_back(cylinder); }
        if (!lower.empty() && !higher.empty()) {
            addStep(result, head, lower.front(), "circular_jump");
            head = lower.front();
            result.servicingOrder.push_back(lower.front());
            for (size_t i = 1; i < lower.size(); ++i) { addStep(result, head, lower[i], "request"); head = lower[i]; result.servicingOrder.push_back(lower[i]); }
        }
    } else {
        for (auto it = lower.rbegin(); it != lower.rend(); ++it) { addStep(result, head, *it, "request"); head = *it; result.servicingOrder.push_back(*it); }
        if (!higher.empty() && !lower.empty()) {
            addStep(result, head, higher.back(), "circular_jump");
            head = higher.back();
            result.servicingOrder.push_back(higher.back());
            for (auto it = higher.rbegin() + 1; it != higher.rend(); ++it) { addStep(result, head, *it, "request"); head = *it; result.servicingOrder.push_back(*it); }
        }
    }
    finalizeResult(result);
    return result;
}

std::vector<DiskScheduleResult> DiskScheduler::compareAll(
    const std::vector<int>& requests, int initialHead,
    int cylinderMin, int cylinderMax, DiskDirection direction) {
    std::vector<DiskScheduleResult> results;
    results.push_back(simulateFCFS(requests, initialHead, cylinderMin, cylinderMax));
    results.push_back(simulateSSTF(requests, initialHead, cylinderMin, cylinderMax));
    results.push_back(simulateSCAN(requests, initialHead, cylinderMin, cylinderMax, direction));
    results.push_back(simulateCSCAN(requests, initialHead, cylinderMin, cylinderMax, direction));
    results.push_back(simulateLOOK(requests, initialHead, cylinderMin, cylinderMax, direction));
    results.push_back(simulateCLOOK(requests, initialHead, cylinderMin, cylinderMax, direction));
    return results;
}
