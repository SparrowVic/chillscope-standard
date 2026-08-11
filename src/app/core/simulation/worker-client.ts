import { generateSeries, type GenerateRequest, type GeneratedSeries } from './generator';
import { SIMULATION_CONFIG } from './simulation.config';

export interface SimulationWorkerRequest {
  readonly id: number;
  readonly kind: 'series';
  readonly seed: number;
  readonly request: GenerateRequest;
}

export interface SimulationWorkerResponse {
  readonly id: number;
  readonly kind: 'series';
  readonly series: GeneratedSeries[];
}

export interface SimulationClientOptions {
  readonly createWorker?: () => Worker | null;
  readonly seed?: number;
  readonly timeoutMs?: number;
}

interface PendingCall {
  readonly message: SimulationWorkerRequest;
  readonly signal: AbortSignal | undefined;
  readonly resolve: (response: SimulationWorkerResponse) => void;
  readonly reject: (reason: Error) => void;
  readonly timeout: ReturnType<typeof setTimeout>;
  readonly removeAbortListener: () => void;
}

interface FallbackCall {
  readonly reject: (reason: Error) => void;
  readonly timeout: ReturnType<typeof setTimeout>;
  readonly removeAbortListener: () => void;
}

export function runSimulation(message: SimulationWorkerRequest): SimulationWorkerResponse {
  return { id: message.id, kind: 'series', series: generateSeries(message.request, message.seed) };
}

function defaultWorkerFactory(): Worker | null {
  if (typeof Worker === 'undefined') {
    return null;
  }
  return new Worker(new URL('./simulation.worker', import.meta.url), { type: 'module' });
}

export class SimulationClient {
  readonly #seed: number;
  readonly #timeoutMs: number;
  readonly #createWorker: () => Worker | null;
  readonly #pending = new Map<number, PendingCall>();
  readonly #fallbacks = new Map<number, FallbackCall>();
  #worker: Worker | null;
  #nextId = 0;
  #disposed = false;

  constructor(options: SimulationClientOptions = {}) {
    this.#seed = options.seed ?? SIMULATION_CONFIG.seed;
    this.#timeoutMs = options.timeoutMs ?? SIMULATION_CONFIG.workerTimeoutMs;
    this.#createWorker = options.createWorker ?? defaultWorkerFactory;
    this.#worker = this.#startWorker();
  }

  async series(request: GenerateRequest, signal?: AbortSignal): Promise<GeneratedSeries[]> {
    const response = await this.#run(
      {
        id: this.#nextId++,
        kind: 'series',
        seed: this.#seed,
        request,
      },
      signal,
    );
    return response.series;
  }

  dispose(): void {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    for (const call of this.#pending.values()) {
      clearTimeout(call.timeout);
      call.removeAbortListener();
      call.reject(new Error('The simulation client was disposed'));
    }
    this.#pending.clear();
    for (const call of this.#fallbacks.values()) {
      clearTimeout(call.timeout);
      call.removeAbortListener();
      call.reject(new Error('The simulation client was disposed'));
    }
    this.#fallbacks.clear();
    this.#worker?.terminate();
    this.#worker = null;
  }

  #run(message: SimulationWorkerRequest, signal?: AbortSignal): Promise<SimulationWorkerResponse> {
    if (this.#disposed) {
      return Promise.reject(new Error('The simulation client was disposed'));
    }
    if (signal?.aborted) {
      return Promise.reject(new Error('The simulation request was aborted'));
    }
    const worker = this.#worker;
    if (worker === null) {
      return this.#runFallback(message, signal);
    }
    return new Promise<SimulationWorkerResponse>((resolve, reject) => {
      const timeout = setTimeout(() => this.#degrade(), this.#timeoutMs);
      const abort = (): void => {
        const pending = this.#pending.get(message.id);
        if (pending === undefined) {
          return;
        }
        clearTimeout(pending.timeout);
        pending.removeAbortListener();
        this.#pending.delete(message.id);
        pending.reject(new Error('The simulation request was aborted'));
        // The worker may be synchronously burning CPU on this request. Terminating it is the only
        // way to make cancellation real; other calls are replayed on a fresh worker below.
        this.#restartWorker();
      };
      signal?.addEventListener('abort', abort, { once: true });
      this.#pending.set(message.id, {
        message,
        signal,
        resolve,
        reject,
        timeout,
        removeAbortListener: () => signal?.removeEventListener('abort', abort),
      });
      if (signal?.aborted) {
        abort();
        return;
      }
      try {
        worker.postMessage(message);
      } catch {
        this.#degrade();
      }
    });
  }

  /** Yield once before running the CPU-heavy fallback on the main thread. */
  #runFallback(
    message: SimulationWorkerRequest,
    signal?: AbortSignal,
  ): Promise<SimulationWorkerResponse> {
    if (this.#disposed) {
      return Promise.reject(new Error('The simulation client was disposed'));
    }
    return new Promise<SimulationWorkerResponse>((resolve, reject) => {
      const cleanup = (): void => {
        const call = this.#fallbacks.get(message.id);
        if (call === undefined) {
          return;
        }
        clearTimeout(call.timeout);
        call.removeAbortListener();
        this.#fallbacks.delete(message.id);
      };
      const abort = (): void => {
        if (!this.#fallbacks.has(message.id)) {
          return;
        }
        cleanup();
        reject(new Error('The simulation request was aborted'));
      };
      const handle = setTimeout(() => {
        cleanup();
        if (this.#disposed) {
          reject(new Error('The simulation client was disposed'));
          return;
        }
        if (signal?.aborted) {
          reject(new Error('The simulation request was aborted'));
          return;
        }
        try {
          resolve(runSimulation(message));
        } catch (error) {
          reject(error instanceof Error ? error : new Error('The simulation failed'));
        }
      });
      signal?.addEventListener('abort', abort, { once: true });
      this.#fallbacks.set(message.id, {
        reject,
        timeout: handle,
        removeAbortListener: () => signal?.removeEventListener('abort', abort),
      });
      if (signal?.aborted) {
        abort();
      }
    });
  }

  #startWorker(): Worker | null {
    const worker = createWorkerOrNull(this.#createWorker);
    worker?.addEventListener('message', (event: MessageEvent<SimulationWorkerResponse>) => {
      if (this.#worker !== worker) {
        return;
      }
      const pending = this.#pending.get(event.data.id);
      if (pending === undefined) {
        return;
      }
      clearTimeout(pending.timeout);
      pending.removeAbortListener();
      this.#pending.delete(event.data.id);
      pending.resolve(event.data);
    });
    // A worker module that fails to load says so asynchronously, long after construction.
    worker?.addEventListener('error', () => {
      if (this.#worker === worker) {
        this.#degrade();
      }
    });
    return worker;
  }

  #restartWorker(): void {
    const worker = this.#worker;
    if (worker === null) {
      return;
    }
    this.#worker = null;
    worker.terminate();
    const replacement = this.#startWorker();
    this.#worker = replacement;
    if (replacement === null) {
      this.#degrade();
      return;
    }
    try {
      for (const call of this.#pending.values()) {
        replacement.postMessage(call.message);
      }
    } catch {
      this.#degrade();
    }
  }

  /** Replay pending calls through the fallback so worker failure cannot leave promises unsettled. */
  #degrade(): void {
    const worker = this.#worker;
    this.#worker = null;
    worker?.terminate();

    const calls = [...this.#pending.values()];
    this.#pending.clear();
    for (const call of calls) {
      clearTimeout(call.timeout);
      call.removeAbortListener();
      void this.#runFallback(call.message, call.signal).then(call.resolve, call.reject);
    }
  }
}

function createWorkerOrNull(factory: () => Worker | null): Worker | null {
  try {
    return factory();
  } catch {
    return null;
  }
}
