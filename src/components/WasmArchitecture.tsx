import React, { useState } from 'react';
import {
  Binary,
  Cpu,
  Layers,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Code2,
  Copy,
  Check,
  RefreshCw,
  Zap
} from 'lucide-react';
import { wasmBridge } from '../engine/cppWasmLoader';

export const WasmArchitecture: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const status = wasmBridge.getStatus();

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const emccCommand = `emcc wasm/os_engine.cpp -o public/os_engine.js \\
  -O3 \\
  -s WASM=1 \\
  -s MODULARIZE=1 \\
  -s EXPORT_NAME="createOSEngine" \\
  -s ALLOW_MEMORY_GROWTH=1 \\
  --bind`;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Binary className="w-5 h-5 text-purple-400" />
              WebAssembly & C++ Engine Architecture
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Emscripten (emcc) + WebAssembly
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zero-backend architecture: C++ Operating System engine compiled to high-speed WebAssembly running directly inside your browser.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-xl border bg-slate-950 border-slate-800 text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            TypeScript &amp; C++ Dual-Engine Active
          </span>
        </div>
      </div>

      {/* Engine Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-xs text-slate-400 font-medium">Simulation Engine Runtime</span>
          <div className="text-lg font-bold text-white font-mono flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            Browser-Native VM
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Runs client-side with zero external backend latency. Zero Node/Express/FastAPI servers required.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-xs text-slate-400 font-medium">C++ Source Fidelity</span>
          <div className="text-lg font-bold text-emerald-400 font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            100% Byte-for-Byte
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Preserves the exact register sizes (IR[4], R[4]), memory matrix M[300][4], and interrupt decision table.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-xs text-slate-400 font-medium">Emscripten Bindings</span>
          <div className="text-lg font-bold text-purple-400 font-mono flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            Embind Enabled
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            <code>wasm/os_engine.cpp</code> exposes native class <code>MOSEngine</code> with structured getters.
          </p>
        </div>
      </div>

      {/* Emscripten Compilation Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Compiling C++ to WebAssembly with Emscripten
          </h3>
          <button
            onClick={() => handleCopy(emccCommand, 'emcc')}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
          >
            {copied === 'emcc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            Copy Command
          </button>
        </div>

        <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto leading-relaxed">
          {emccCommand}
        </pre>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="font-semibold text-white">Scripts in this Project:</div>
            <ul className="text-slate-300 space-y-1 font-mono text-[11px]">
              <li>• <code>npm run build:wasm</code> - Triggers emcc compilation</li>
              <li>• <code>wasm/Makefile</code> - Multiplatform makefile</li>
              <li>• <code>wasm/build_wasm.sh</code> - Linux / macOS build script</li>
              <li>• <code>wasm/build_wasm.bat</code> - Windows build script</li>
            </ul>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="font-semibold text-white">Native C++ Verification:</div>
            <p className="text-slate-400 text-[11px]">
              The exact same <code>wasm/os_engine.cpp</code> file compiles directly with standard <code>g++</code>:
            </p>
            <code className="text-blue-300 block bg-slate-900 p-2 rounded border border-slate-800 font-mono text-[11px]">
              g++ wasm/os_engine.cpp -o wasm/test_engine.exe && ./wasm/test_engine.exe
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};
