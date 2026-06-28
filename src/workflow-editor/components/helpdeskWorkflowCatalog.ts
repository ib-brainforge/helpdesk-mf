// Helpdesk's domain injection for the shared @brainforgeau/workflow-ui canvas.
//
// The package canvas/palette are catalog-driven: the consuming app supplies
// the draggable step types, the category vocabulary, and the per-category
// colours. This file builds those three from helpdesk's own StateType +
// StateCategory enums so the canvas renders identically to the previous
// in-repo implementation.
import type {
  CategoryColor,
  CategoryOption,
  WorkflowStepTypeOption,
} from '@brainforgeau/workflow-ui';
import { StateType } from '@brainforgeau/workflow-ui';
import { StateCategory } from '../types/enums';

/** Fork/join swatch — kept distinct from the lifecycle categories. */
const PARALLEL_COLOR: CategoryColor = {
  bg: '#f5f3ff',
  border: '#7c3aed',
  text: '#4c1d95',
  label: 'Parallel',
};

/**
 * Per-category colour swatches keyed by helpdesk's StateCategory value.
 * Mirrors the previous in-repo CATEGORY_COLORS exactly.
 */
export const HELPDESK_CATEGORY_COLORS: Record<string, CategoryColor> = {
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

/**
 * Category options surfaced in the node-config "Category" dropdown — helpdesk's
 * ticket lifecycle buckets.
 */
export const HELPDESK_CATEGORY_OPTIONS: CategoryOption[] = [
  { value: StateCategory.New, label: 'New' },
  { value: StateCategory.Open, label: 'Open' },
  { value: StateCategory.Pending, label: 'Pending' },
  { value: StateCategory.Resolved, label: 'Resolved' },
  { value: StateCategory.Closed, label: 'Closed' },
];

/**
 * The draggable step-type catalog — one entry per palette item. Mirrors the
 * four state kinds helpdesk shipped with (Initial / Normal / Parallel /
 * Terminal) and the default category each stamps onto a newly-dropped state.
 */
export const HELPDESK_STEP_TYPE_CATALOG: WorkflowStepTypeOption[] = [
  {
    id: 'initial',
    label: 'Initial State',
    description: 'Workflow entry point',
    nodeType: 'baseState',
    stateType: StateType.Initial,
    defaultCategory: StateCategory.New,
  },
  {
    id: 'normal',
    label: 'Normal State',
    description: 'In-progress state',
    nodeType: 'baseState',
    stateType: StateType.Normal,
    defaultCategory: StateCategory.Open,
  },
  {
    id: 'parallel',
    label: 'Parallel State',
    description: 'Fork + join branches',
    nodeType: 'parallel',
    stateType: StateType.Parallel,
    defaultCategory: StateCategory.Open,
    colorOverride: {
      bg: PARALLEL_COLOR.bg,
      border: PARALLEL_COLOR.border,
      text: PARALLEL_COLOR.text,
    },
  },
  {
    id: 'terminal',
    label: 'Terminal State',
    description: 'End of workflow',
    nodeType: 'terminal',
    stateType: StateType.Terminal,
    defaultCategory: StateCategory.Closed,
  },
];
