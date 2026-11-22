#include <iostream>
#include <cassert>
#include "disk_scheduler.hpp"

int main() {
    std::vector<int> requests = {98, 183, 37, 122, 14, 124, 65, 67};
    int head = 53, low = 0, high = 199;

    auto fcfs = DiskScheduler::simulateFCFS(requests, head, low, high);
    assert(fcfs.totalHeadMovement == 640);
    assert(fcfs.servicingOrder[0] == 98);

    auto sstf = DiskScheduler::simulateSSTF(requests, head, low, high);
    assert(sstf.servicingOrder.front() == 65);
    assert(sstf.totalHeadMovement == 236);

    auto scan = DiskScheduler::simulateSCAN(requests, head, low, high, DiskDirection::UP);
    assert(scan.servicingOrder.front() == 65);
    assert(scan.totalHeadMovement == 331);

    auto cscan = DiskScheduler::simulateCSCAN(requests, head, low, high, DiskDirection::UP);
    assert(cscan.totalHeadMovement == 382);
    assert(cscan.steps.back().toPosition == 37);

    auto look = DiskScheduler::simulateLOOK(requests, head, low, high, DiskDirection::UP);
    assert(look.totalHeadMovement == 299);

    auto clook = DiskScheduler::simulateCLOOK(requests, head, low, high, DiskDirection::UP);
    assert(clook.totalHeadMovement == 322);

    auto invalid = DiskScheduler::simulateFCFS({200}, head, low, high);
    assert(invalid.servicingOrder.empty());

    std::cout << "All disk scheduler tests passed." << std::endl;
    return 0;
}
