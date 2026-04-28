import { StateCategory } from '../types/enums';

export const CATEGORY_COLORS: Record<
  StateCategory,
  { bg: string; border: string; text: string; label: string }
> = {
  [StateCategory.New]: {
    bg: '#ecfdf5',
    border: '#10b981',
    text: '#065f46',
    label: 'New',
  },
  [StateCategory.Open]: {
    bg: '#eff6ff',
    border: '#3b82f6',
    text: '#1e40af',
    label: 'Open',
  },
  [StateCategory.Pending]: {
    bg: '#fffbeb',
    border: '#f59e0b',
    text: '#92400e',
    label: 'Pending',
  },
  [StateCategory.Resolved]: {
    bg: '#f3f4f6',
    border: '#6b7280',
    text: '#374151',
    label: 'Resolved',
  },
  [StateCategory.Closed]: {
    bg: '#fef2f2',
    border: '#ef4444',
    text: '#991b1b',
    label: 'Closed',
  },
};

export const CANVAS_TOKENS = {
  background: '#f9fafb',
  edge: '#94a3b8',
  edgeSelected: '#3b82f6',
  minimapMask: 'rgba(226, 232, 240, 0.6)',
};

export const PARALLEL_COLORS = {
  bg: '#f5f3ff',
  border: '#7c3aed',
  text: '#4c1d95',
  label: 'Parallel',
};

/**
 * Design tokens for rich-node inline styling.
 * Mirrors rules-ui ruleEditorTheme T tokens for visual consistency.
 */
export const T = {
  bg: '#f8f9fb',
  surface: '#ffffff',
  surfaceAlt: '#f3f4f7',
  text: '#1a1d27',
  textMuted: '#6b7084',
  textDim: '#9ba1b4',
  border: '#e2e5eb',
  red: '#dc2626',
  redLight: '#fee2e2',
  redBorder: '#fca5a5',
} as const;
