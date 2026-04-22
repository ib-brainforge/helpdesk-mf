import type { WorkflowStateDto } from '../types';

/**
 * Simple grid layout: 250px horizontal stride, 150px vertical.
 * Uses ?? (nullish coalescing) so that positionX/positionY === 0 is treated as
 * "intentionally positioned at origin" rather than "unpositioned".
 * A value of null/undefined signals unpositioned and triggers the grid fallback.
 * Once the user has dragged nodes, saved positions are preserved.
 */
export function autoLayout(states: WorkflowStateDto[]): WorkflowStateDto[] {
  return states.map((s, i) => ({
    ...s,
    positionX: s.positionX ?? 100 + (i % 4) * 250,
    positionY: s.positionY ?? 200 + Math.floor(i / 4) * 150,
  }));
}
