#ifndef DEADLOCK_MANAGER_HPP
#define DEADLOCK_MANAGER_HPP

#include <string>
#include <vector>

struct DeadlockSafetyStep {
    int stepNumber;
    int processIndex;
    std::vector<int> workBefore;
    std::vector<int> workAfter;
    std::vector<bool> finishBefore;
    std::vector<bool> finishAfter;
    bool selected;
    std::string message;
};

struct BankersResult {
    bool isSafe;
    std::string state; // SAFE or UNSAFE
    std::string error;
    std::vector<int> safeSequence;
    std::vector<std::vector<int> > need;
    std::vector<DeadlockSafetyStep> steps;
};

struct DetectionStep {
    int stepNumber;
    int processIndex;
    std::vector<int> workBefore;
    std::vector<int> workAfter;
    std::vector<bool> finishBefore;
    std::vector<bool> finishAfter;
    bool selected;
    std::string message;
};

struct DetectionResult {
    bool hasDeadlock;
    std::string error;
    std::vector<int> deadlockedProcesses;
    std::vector<DetectionStep> steps;
};

struct RequestResult {
    bool validRequest;
    bool granted;
    std::string status;
    std::string reason;
    std::vector<int> availableAfter;
    std::vector<int> safeSequence;
    std::vector<std::vector<int> > allocationAfter;
    std::vector<std::vector<int> > needAfter;
    std::vector<DeadlockSafetyStep> steps;
};

class DeadlockManager {
public:
    static std::vector<std::vector<int> > calculateNeed(
        const std::vector<std::vector<int> >& maximum,
        const std::vector<std::vector<int> >& allocation);

    static BankersResult runBankers(
        const std::vector<std::vector<int> >& allocation,
        const std::vector<std::vector<int> >& maximum,
        const std::vector<int>& available);

    static RequestResult requestResources(
        int processIndex,
        const std::vector<int>& request,
        const std::vector<std::vector<int> >& allocation,
        const std::vector<std::vector<int> >& maximum,
        const std::vector<int>& available);

    static DetectionResult detectDeadlock(
        const std::vector<std::vector<int> >& allocation,
        const std::vector<std::vector<int> >& request,
        const std::vector<int>& available);

    static std::string bankerResultToJson(const BankersResult& result);
    static std::string detectionResultToJson(const DetectionResult& result);
    static std::string requestResultToJson(const RequestResult& result);
};

#endif
