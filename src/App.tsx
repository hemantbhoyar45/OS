import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, TabId } from './components/Sidebar';
import { Overview } from './components/Overview';
import { InteractiveSimulator } from './components/InteractiveSimulator';
import { MemoryVisualizer } from './components/MemoryVisualizer';
import { PagingManager } from './components/PagingManager';
import { MemoryManagerDashboard } from './components/memory/MemoryManagerDashboard';
import { InterruptInspector } from './components/InterruptInspector';
import { JobEditor } from './components/JobEditor';
import { StudyGuideLab } from './components/StudyGuideLab';
import { WasmArchitecture } from './components/WasmArchitecture';
import { SchedulerDashboard } from './components/scheduler/SchedulerDashboard';
import { ProcessManagerDashboard } from './components/process/ProcessManagerDashboard';
import { DeadlockManagerDashboard } from './components/deadlock/DeadlockManagerDashboard';
import { DiskSchedulerDashboard } from './components/disk/DiskSchedulerDashboard';
import { SimulationEngine } from './engine/simulationEngine';
import { PRESET_JOBS } from './engine/presets';
import { PhaseMode, SimulationSnapshot } from './engine/types';
import { wasmBridge } from './engine/cppWasmLoader';

export const App: React.FC = () => {
  // Phase & Engine
  const [phase, setPhase] = useState<PhaseMode>(2);
  const engineRef = useRef<SimulationEngine>(new SimulationEngine(2));
  const [snapshot, setSnapshot] = useState<SimulationSnapshot>(() =>
    engineRef.current.getSnapshot()
  );

  // Active Tab
  const [currentTab, setCurrentTab] = useState<TabId>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Input code state
  const defaultPreset = PRESET_JOBS[0];
  const [selectedPresetId, setSelectedPresetId] = useState<string>(defaultPreset.id);
  const [inputCode, setInputCode] = useState<string>(defaultPreset.code);

  // Playback state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(300);
  const timerRef = useRef<any>(null);

  // Load default preset on mount
  useEffect(() => {
    engineRef.current.loadJob(defaultPreset.code);
    setSnapshot(engineRef.current.getSnapshot());
    wasmBridge.initWasm();
  }, []);

  // Update snapshot helper
  const syncSnapshot = () => {
    setSnapshot(engineRef.current.getSnapshot());
  };

  // Phase change
  const handlePhaseChange = (newPhase: PhaseMode) => {
    setPhase(newPhase);
    engineRef.current.setPhase(newPhase);
    // Find matching preset for phase
    const matchingPreset = PRESET_JOBS.find(p => p.phase === newPhase) || PRESET_JOBS[0];
    setSelectedPresetId(matchingPreset.id);
    setInputCode(matchingPreset.code);
    engineRef.current.loadJob(matchingPreset.code);
    syncSnapshot();
    if (isRunning) handleStop();
  };

  // Select preset
  const handleSelectPreset = (presetId: string) => {
    const preset = PRESET_JOBS.find(p => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(preset.id);
    setInputCode(preset.code);
    if (preset.phase !== phase) {
      setPhase(preset.phase);
      engineRef.current.setPhase(preset.phase);
    }
    engineRef.current.loadJob(preset.code);
    syncSnapshot();
    if (isRunning) handleStop();
  };

  // Step Execution
  const handleStep = () => {
    if (snapshot.isTerminated) return;
    const canContinue = engineRef.current.step();
    syncSnapshot();
    if (!canContinue) {
      handleStop();
    }
  };

  // Play / Pause
  const handleTogglePlay = () => {
    if (isRunning) {
      handleStop();
    } else {
      if (snapshot.isTerminated) return;
      setIsRunning(true);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        const canContinue = engineRef.current.step();
        setSnapshot(engineRef.current.getSnapshot());
        if (!canContinue) {
          handleStop();
        }
      }, speed);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, speed]);

  // Reset
  const handleReset = () => {
    handleStop();
    engineRef.current.loadJob(inputCode);
    syncSnapshot();
  };

  // Run All
  const handleRunAll = () => {
    handleStop();
    engineRef.current.runAll();
    syncSnapshot();
  };

  // Load custom code
  const handleLoadAndRun = () => {
    handleStop();
    engineRef.current.loadJob(inputCode);
    engineRef.current.runAll();
    syncSnapshot();
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col selection:bg-blue-600/30">
      {/* Top Navigation */}
      <Navbar
        phase={phase}
        onPhaseChange={handlePhaseChange}
        isRunning={isRunning}
        onTogglePlay={handleTogglePlay}
        onStep={handleStep}
        onReset={handleReset}
        onRunAll={handleRunAll}
        speed={speed}
        onSpeedChange={setSpeed}
        selectedPresetId={selectedPresetId}
        onSelectPreset={handleSelectPreset}
        isTerminated={snapshot.isTerminated}
        onMenuToggle={() => setSidebarOpen((open) => !open)}
      />

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          snapshot={snapshot}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#0b0f19] via-[#0d1322] to-[#0b0f19]">
          {currentTab === 'overview' && (
            <Overview
              snapshot={snapshot}
              onNavigateTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'process' && (
            <ProcessManagerDashboard />
          )}

          {currentTab === 'scheduler' && (
            <SchedulerDashboard />
          )}

          {currentTab === 'simulator' && (
            <InteractiveSimulator
              snapshot={snapshot}
              isRunning={isRunning}
              onTogglePlay={handleTogglePlay}
              onStep={handleStep}
              onReset={handleReset}
            />
          )}

          {currentTab === 'memory' && (
            <MemoryManagerDashboard snapshot={snapshot} />
          )}

          {currentTab === 'deadlock' && (
            <DeadlockManagerDashboard />
          )}

          {currentTab === 'disk' && (
            <DiskSchedulerDashboard />
          )}

          {currentTab === 'calculator' && (
            <PagingManager snapshot={snapshot} />
          )}

          {currentTab === 'interrupts' && (
            <InterruptInspector snapshot={snapshot} />
          )}

          {currentTab === 'editor' && (
            <JobEditor
              snapshot={snapshot}
              inputCode={inputCode}
              onCodeChange={setInputCode}
              onLoadAndRun={handleLoadAndRun}
              onReset={handleReset}
              onSelectPreset={handleSelectPreset}
              selectedPresetId={selectedPresetId}
            />
          )}

          {currentTab === 'study' && (
            <StudyGuideLab />
          )}

          {currentTab === 'wasm' && (
            <WasmArchitecture />
          )}
        </main>
      </div>
    </div>
  );
};
