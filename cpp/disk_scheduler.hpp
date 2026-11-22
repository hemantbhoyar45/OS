#ifndef DISK_SCHEDULER_HPP
#define DISK_SCHEDULER_HPP

#include <string>
#include <vector>

enum class DiskDirection {
    UP,
    DOWN
};

struct DiskStep {
    int stepNumber;
    int fromPosition;
    int toPosition;
    int seekDistance;
    int cumulativeMovement;
    std::string type; // request, boundary, circular_jump
};

struct DiskScheduleResult {
    std::string algorithm;
    std::vector<int> servicingOrder;
    std::vector<DiskStep> steps;
    int initialHead;
    int cylinderMin;
    int cylinderMax;
    int totalHeadMovement;
    double averageSeekDistance;
};

class DiskScheduler {
public:
    static DiskScheduleResult simulateFCFS(
        const std::vector<int>& requests, int initialHead,
        int cylinderMin, int cylinderMax);

    static DiskScheduleResult simulateSSTF(
        const std::vector<int>& requests, int initialHead,
        int cylinderMin, int cylinderMax);

    static DiskScheduleResult simulateSCAN(
        const std::vector<int>& requests, int initialHead,
        int cylinderMin, int cylinderMax, DiskDirection direction);

    static DiskScheduleResult simulateCSCAN(
        const std::vector<int>& requests, int initialHead,
        int cylinderMin, int cylinderMax, DiskDirection direction);

    static DiskScheduleResult simulateLOOK(
        const std::vector<int>& requests, int initialHead,
        int cylinderMin, int cylinderMax, DiskDirection direction);

    static DiskScheduleResult simulateCLOOK(
        const std::vector<int>& requests, int initialHead,
        int cylinderMin, int cylinderMax, DiskDirection direction);

    static std::vector<DiskScheduleResult> compareAll(
        const std::vector<int>& requests, int initialHead,
        int cylinderMin, int cylinderMax, DiskDirection direction);
};

#endif
