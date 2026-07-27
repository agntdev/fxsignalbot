/** A single clock seam for schedules and timestamps. */
let currentClock: () => Date = () => new Date();

export function now(): Date {
  return currentClock();
}

/** Test hook. Production code should use `now()` rather than construct dates. */
export function setClock(clock: (() => Date) | undefined): void {
  currentClock = clock ?? (() => new Date());
}
