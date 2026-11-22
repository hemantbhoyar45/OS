/**
 * WebAssembly Loader for Emscripten-compiled C++ OS Engine
 * Gracefully checks for WASM runtime and exposes status to UI
 */

export interface WasmModuleStatus {
  isAvailable: boolean;
  isLoading: boolean;
  error?: string;
  engineInstance?: any;
}

class CppWasmBridge {
  private status: WasmModuleStatus = {
    isAvailable: false,
    isLoading: false
  };

  public async initWasm(): Promise<WasmModuleStatus> {
    if (this.status.isAvailable) return this.status;

    this.status.isLoading = true;
    try {
      // Check if /os_engine.js was served in public directory
      const scriptCheck = await fetch('/os_engine.js', { method: 'HEAD' });
      if (scriptCheck.ok) {
        // Dynamically load
        const script = document.createElement('script');
        script.src = '/os_engine.js';
        document.head.appendChild(script);

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load WASM glue script'));
        });

        // @ts-ignore
        if (typeof window.createOSEngine === 'function') {
          // @ts-ignore
          const wasmModule = await window.createOSEngine();
          this.status.engineInstance = wasmModule;
          this.status.isAvailable = true;
          this.status.isLoading = false;
          return this.status;
        }
      }
      this.status.isLoading = false;
      this.status.error = 'WebAssembly binary not yet compiled. Native TypeScript simulation engine is active.';
      return this.status;
    } catch (err: any) {
      this.status.isLoading = false;
      this.status.error = err.message || 'WASM initialization error';
      return this.status;
    }
  }

  public getStatus(): WasmModuleStatus {
    return this.status;
  }

  public runDiskScheduler(
    algorithm: string,
    requests: number[],
    initialHead: number,
    cylinderMin: number,
    cylinderMax: number,
    direction: 'UP' | 'DOWN'
  ): any | null {
    if (!this.status.isAvailable || !this.status.engineInstance) return null;
    const fn = this.status.engineInstance.diskScheduleJson;
    if (typeof fn !== 'function') return null;
    try {
      return JSON.parse(fn(algorithm, requests.join(','), initialHead, cylinderMin, cylinderMax, direction));
    } catch {
      return null;
    }
  }

  public runBankers(allocation: number[][], maximum: number[][], available: number[]): any | null {
    if (!this.status.isAvailable || !this.status.engineInstance) return null;
    const fn = this.status.engineInstance.deadlockBankersJson;
    if (typeof fn !== 'function') return null;
    try {
      const matrix = (rows: number[][]) => rows.map((row) => row.join(',')).join(';');
      return JSON.parse(fn(matrix(allocation), matrix(maximum), available.join(',')));
    } catch {
      return null;
    }
  }

  public runDeadlockDetection(allocation: number[][], request: number[][], available: number[]): any | null {
    if (!this.status.isAvailable || !this.status.engineInstance) return null;
    const fn = this.status.engineInstance.deadlockDetectionJson;
    if (typeof fn !== 'function') return null;
    try {
      const matrix = (rows: number[][]) => rows.map((row) => row.join(',')).join(';');
      return JSON.parse(fn(matrix(allocation), matrix(request), available.join(',')));
    } catch {
      return null;
    }
  }
}

export const wasmBridge = new CppWasmBridge();
