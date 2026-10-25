import { useSyncExternalStore } from 'react';

/*
 * One clock for every deadline chip on the page.
 *
 * A page of 25 tickets would otherwise run 25 intervals. Here the first
 * subscriber starts a single interval and the last one stops it, and every
 * chip re-renders from the same "now", so two chips never disagree by a tick.
 */
const TICK_MS = 30_000;

let now = Date.now();
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      for (const l of listeners) l();
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
};

const getSnapshot = () => now;

/** The current time in ms, refreshed every 30 seconds while anything uses it. */
export const useMinuteTick = (): number =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
