import type { WorkflowStateDto } from '../types';

/**
 * Simple grid layout: 300px horizontal stride, 180px vertical.
 * Treats (0, 0) as "unpositioned" — backend's toStateDto returns 0 when
 * displayMetadata["ui.x"]/["ui.y"] are unset (newly created or never dragged),
 * so the fallback fires for any state whose coordinates are 0/0.
 *
 * Once the user has dragged nodes to non-zero positions, saved positions
 * are preserved. This is a pragmatic tradeoff — no real workflow node
 * benefits from being placed exactly at origin, and avoids round-tripping
 * nullable positions through the DTO chain just to disambiguate.
 */
export function autoLayout(states: WorkflowStateDto[]): WorkflowStateDto[] {
  return states.map((s, i) => ({
    ...s,
    positionX: s.positionX || 100 + (i % 4) * 300,
    positionY: s.positionY || 120 + Math.floor(i / 4) * 180,
  }));
}
