import { CATEGORY_COLORS, PARALLEL_COLORS } from '../canvas/canvasTheme';
import { StateCategory, StateType } from '../types/enums';

interface PaletteItem {
  type: 'initial' | 'normal' | 'parallel' | 'terminal';
  label: string;
  description: string;
  stateType: StateType;
  defaultCategory: StateCategory;
  /** Override colors for items that don't map directly to a StateCategory */
  colorOverride?: { bg: string; border: string; text: string };
}

const ITEMS: PaletteItem[] = [
  {
    type: 'initial',
    label: 'Initial State',
    description: 'Workflow entry point',
    stateType: StateType.Initial,
    defaultCategory: StateCategory.New,
  },
  {
    type: 'normal',
    label: 'Normal State',
    description: 'In-progress state',
    stateType: StateType.Normal,
    defaultCategory: StateCategory.Open,
  },
  {
    type: 'parallel',
    label: 'Parallel State',
    description: 'Fork + join branches',
    stateType: StateType.Parallel,
    defaultCategory: StateCategory.Open,
    colorOverride: {
      bg: PARALLEL_COLORS.bg,
      border: PARALLEL_COLORS.border,
      text: PARALLEL_COLORS.text,
    },
  },
  {
    type: 'terminal',
    label: 'Terminal State',
    description: 'End of workflow',
    stateType: StateType.Terminal,
    defaultCategory: StateCategory.Closed,
  },
];

interface DragPayload {
  stateType: StateType;
  category: StateCategory;
  label: string;
}

// REVIEW: Using controlled component pattern — palette is a pure presentational component;
// drag payload is serialised into the HTML5 dataTransfer and consumed by WorkflowCanvas.
export function ComponentsPalette() {
  function handleDragStart(event: React.DragEvent, item: PaletteItem) {
    const payload: DragPayload = {
      stateType: item.stateType,
      category: item.defaultCategory,
      label: item.label,
    };
    event.dataTransfer.setData(
      'application/x-workflow-node',
      JSON.stringify(payload),
    );
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <aside
      className="flex w-64 shrink-0 flex-col border-l border-default-200 bg-white dark:bg-default-50"
      aria-label="Components palette"
    >
      <div className="border-b border-default-200 px-4 py-3">
        <div className="text-sm font-semibold text-default-900">Components</div>
        <div className="text-xs text-default-400">
          Drag and drop onto the canvas
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {ITEMS.map(item => {
          const colors =
            item.colorOverride ?? CATEGORY_COLORS[item.defaultCategory];
          return (
            <div
              key={item.type}
              draggable
              onDragStart={e => handleDragStart(e, item)}
              className="flex items-center gap-3 rounded bg-white p-2 cursor-grab hover:bg-default-50 active:cursor-grabbing select-none"
              style={{
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: colors.border,
                borderLeftWidth: 4,
              }}
            >
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded flex-shrink-0"
                style={{
                  background: colors.bg,
                  color: colors.text,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderStyle: 'solid',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="2"
                    y="2"
                    width="12"
                    height="12"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-default-900">
                  {item.label}
                </div>
                <div className="text-[10px] text-default-400 truncate">
                  {item.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
