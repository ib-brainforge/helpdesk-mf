import '@testing-library/jest-dom';

// jsdom lacks the layout observers the table and overlay components use.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as Record<string, unknown>).ResizeObserver ??= NoopObserver;
(globalThis as Record<string, unknown>).IntersectionObserver ??= NoopObserver;
