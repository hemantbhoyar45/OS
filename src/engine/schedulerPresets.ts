import { PresetWorkload } from './schedulerTypes';

export const SCHEDULER_PRESETS: PresetWorkload[] = [
  {
    id: 'silberschatz_sample',
    name: 'OS Textbook Standard Mixed Workload',
    description: 'Classic textbook workload with staggered arrivals and varying burst times. Demonstrates preemption in SRTF and time-slicing in Round Robin.',
    timeQuantum: 2,
    lowerIsHigherPriority: true,
    processes: [
      { pid: 1, name: 'P1', arrivalTime: 0, burstTime: 5, priority: 3 },
      { pid: 2, name: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
      { pid: 3, name: 'P3', arrivalTime: 2, burstTime: 8, priority: 4 },
      { pid: 4, name: 'P4', arrivalTime: 3, burstTime: 6, priority: 2 }
    ]
  },
  {
    id: 'convoy_effect',
    name: 'Convoy Effect Demonstration (FCFS vs SJF)',
    description: 'A long process arrives first (P1 burst=12), followed closely by short processes. In FCFS, short processes suffer high wait times; in SJF/SRTF, wait times plummet.',
    timeQuantum: 3,
    lowerIsHigherPriority: true,
    processes: [
      { pid: 1, name: 'P1 (Heavy)', arrivalTime: 0, burstTime: 12, priority: 4 },
      { pid: 2, name: 'P2 (Quick)', arrivalTime: 1, burstTime: 2, priority: 2 },
      { pid: 3, name: 'P3 (Quick)', arrivalTime: 1, burstTime: 1, priority: 1 },
      { pid: 4, name: 'P4 (Quick)', arrivalTime: 2, burstTime: 2, priority: 3 }
    ]
  },
  {
    id: 'srtf_preemption',
    name: 'SRTF Preemption & Tie-Breaking',
    description: 'Demonstrates immediate preemption when a shorter job arrives mid-execution, with simultaneous arrival tie-breaking.',
    timeQuantum: 2,
    lowerIsHigherPriority: true,
    processes: [
      { pid: 1, name: 'P1', arrivalTime: 0, burstTime: 8, priority: 2 },
      { pid: 2, name: 'P2', arrivalTime: 1, burstTime: 4, priority: 3 },
      { pid: 3, name: 'P3', arrivalTime: 2, burstTime: 9, priority: 1 },
      { pid: 4, name: 'P4', arrivalTime: 3, burstTime: 5, priority: 4 }
    ]
  },
  {
    id: 'round_robin_fairness',
    name: 'Round Robin Quantum Fairness (TQ=2)',
    description: 'Simultaneous arrivals at t=0 with equal priority to highlight fair CPU sharing under Round Robin time slicing.',
    timeQuantum: 2,
    lowerIsHigherPriority: true,
    processes: [
      { pid: 1, name: 'P1', arrivalTime: 0, burstTime: 6, priority: 1 },
      { pid: 2, name: 'P2', arrivalTime: 0, burstTime: 4, priority: 1 },
      { pid: 3, name: 'P3', arrivalTime: 0, burstTime: 2, priority: 1 }
    ]
  },
  {
    id: 'cpu_idle_gaps',
    name: 'Intermittent Arrivals with CPU Idle Gaps',
    description: 'Tests CPU behavior when no processes are ready, creating explicit IDLE segments in the Gantt chart and affecting CPU utilization.',
    timeQuantum: 2,
    lowerIsHigherPriority: true,
    processes: [
      { pid: 1, name: 'P1', arrivalTime: 2, burstTime: 3, priority: 2 }, // CPU idle 0-2
      { pid: 2, name: 'P2', arrivalTime: 8, burstTime: 4, priority: 1 }, // CPU idle 5-8
      { pid: 3, name: 'P3', arrivalTime: 9, burstTime: 2, priority: 3 }
    ]
  },
  {
    id: 'priority_preemption_demo',
    name: 'Priority Inversion & Preemption Demo',
    description: 'A low priority task starts, but higher priority tasks arrive and preempt it immediately.',
    timeQuantum: 2,
    lowerIsHigherPriority: true,
    processes: [
      { pid: 1, name: 'P1 (Low)', arrivalTime: 0, burstTime: 8, priority: 5 },
      { pid: 2, name: 'P2 (High)', arrivalTime: 2, burstTime: 3, priority: 1 },
      { pid: 3, name: 'P3 (Mid)', arrivalTime: 4, burstTime: 4, priority: 3 }
    ]
  }
];
