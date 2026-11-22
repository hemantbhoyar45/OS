#include <iostream>
#include <cassert>
#include "deadlock_manager.hpp"

int main() {
    std::vector<std::vector<int> > allocation = {{0,1,0},{2,0,0},{3,0,2},{2,1,1},{0,0,2}};
    std::vector<std::vector<int> > maximum = {{7,5,3},{3,2,2},{9,0,2},{2,2,2},{4,3,3}};
    std::vector<int> available = {3,3,2};

    auto need = DeadlockManager::calculateNeed(maximum, allocation);
    assert((need[0] == std::vector<int>{7,4,3}));
    assert((need[2] == std::vector<int>{6,0,0}));

    auto safe = DeadlockManager::runBankers(allocation, maximum, available);
    assert(safe.isSafe);
    assert(safe.safeSequence.size() == 5);
    assert(!safe.steps.empty());

    auto denied = DeadlockManager::requestResources(0, {4,0,0}, allocation, maximum, available);
    assert(denied.validRequest);
    assert(!denied.granted);
    assert(denied.status == "DENIED");

    std::vector<std::vector<int> > dAllocation = {{0,1},{2,0},{0,0}};
    std::vector<std::vector<int> > dRequest = {{1,0},{0,1},{1,1}};
    auto detected = DeadlockManager::detectDeadlock(dAllocation, dRequest, {0,0});
    assert(detected.hasDeadlock);
    assert(detected.deadlockedProcesses.size() == 3);

    std::vector<std::vector<int> > badAllocation = {{2,1},{1,2}};
    std::vector<std::vector<int> > badMaximum = {{1,1},{2,2}};
    auto invalid = DeadlockManager::runBankers(badAllocation, badMaximum, {1,1});
    assert(!invalid.isSafe);
    assert(!invalid.error.empty());

    std::cout << "All deadlock manager tests passed." << std::endl;
    return 0;
}
