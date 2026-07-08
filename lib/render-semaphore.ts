/**
 * In-process render throttle for the no-Redis (inline) path.
 *
 * Without a queue, every generation request forks its own multi-minute ffmpeg
 * chain — ten clicks means ten parallel renders and a dead server. When Redis
 * IS configured, BullMQ's worker concurrency does this job; this semaphore only
 * protects the inline fallback.
 *
 * FIFO so early requests can't be starved. Limit via RENDER_CONCURRENCY.
 */

const DEFAULT_LIMIT = 2;

let active = 0;
const waiters: Array<() => void> = [];

function limit(): number {
  const parsed = Number(process.env.RENDER_CONCURRENCY);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : DEFAULT_LIMIT;
}

/** How many renders are running right now (exposed for tests/metrics). */
export function activeRenders(): number {
  return active;
}

export function queuedRenders(): number {
  return waiters.length;
}

async function acquire(): Promise<void> {
  if (active < limit()) {
    active += 1;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
  active += 1;
}

function release(): void {
  active -= 1;
  const next = waiters.shift();
  if (next) next();
}

/**
 * Run `fn` while holding a render slot; excess work waits its turn.
 * The slot is released on both success and failure.
 */
export async function withRenderSlot<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}
