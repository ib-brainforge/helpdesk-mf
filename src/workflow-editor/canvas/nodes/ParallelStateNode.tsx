import { Handle, type Node, type NodeProps, Position } from '@xyflow/react';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import type { ParallelSpecDto, WorkflowStateDto } from '../../types';
import { StateCategory, StateType } from '../../types/enums';
import { CATEGORY_COLORS, PARALLEL_COLORS, T } from '../canvasTheme';

export type ParallelStateNodeType = Node<
  {
    state: WorkflowStateDto;
    allStates: WorkflowStateDto[];
    onChange?: (nodeId: string, next: WorkflowStateDto) => void;
    onDelete?: (nodeId: string) => void;
  },
  'parallelState'
>;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const CATEGORY_OPTIONS: { value: StateCategory; label: string }[] = [
  { value: StateCategory.New, label: 'New' },
  { value: StateCategory.Open, label: 'Open' },
  { value: StateCategory.Pending, label: 'Pending' },
  { value: StateCategory.Resolved, label: 'Resolved' },
  { value: StateCategory.Closed, label: 'Closed' },
];

const TYPE_OPTIONS: { value: StateType; label: string }[] = [
  { value: StateType.Initial, label: 'Initial' },
  { value: StateType.Normal, label: 'Normal' },
  { value: StateType.Parallel, label: 'Parallel' },
  { value: StateType.Terminal, label: 'Terminal' },
];

/** Minimum number of branch handles to render for visual stability */
const MIN_HANDLES = 2;

/** Distribute handles evenly along the right side (20%–80%) */
function topPct(i: number, total: number): string {
  const step = 60 / (total + 1);
  return `${20 + step * (i + 1)}%`;
}

export function ParallelStateNode({
  id,
  data,
}: NodeProps<ParallelStateNodeType>) {
  const { state, allStates, onChange, onDelete } = data;
  const c = CATEGORY_COLORS[state.category];
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Local draft values
  const [nameValue, setNameValue] = useState(state.name);
  const [slugValue, setSlugValue] = useState(state.slug);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameValue(state.name);
    setSlugValue(state.slug);
  }, [state.name, state.slug]);

  const branchCount = Math.max(
    state.parallelSpec?.branchStartStateIds.length ?? 0,
    MIN_HANDLES,
  );

  const availableForSpec = (allStates ?? []).filter(s => s.id !== id);
  const spec = state.parallelSpec ?? {
    branchStartStateIds: [],
    joinStateId: '',
    joinMode: 'AllMustComplete' as const,
  };

  function commitName() {
    const trimmed = nameValue.trim();
    if (!trimmed) {
      setNameValue(state.name);
      return;
    }
    if (trimmed === state.name) return;
    const currentAutoSlug = slugify(state.name);
    const newSlug =
      state.slug === currentAutoSlug ? slugify(trimmed) : state.slug;
    setSlugValue(newSlug);
    onChange?.(id, { ...state, name: trimmed, slug: newSlug });
  }

  function commitSlug() {
    const trimmed = slugValue.trim();
    if (!trimmed) {
      setSlugValue(state.slug);
      return;
    }
    if (trimmed === state.slug) return;
    onChange?.(id, { ...state, slug: trimmed });
  }

  function handleCategoryChange(category: StateCategory) {
    onChange?.(id, { ...state, category });
  }

  function handleTypeChange(type: StateType) {
    if (type === StateType.Parallel) {
      onChange?.(id, {
        ...state,
        type,
        parallelSpec: state.parallelSpec ?? spec,
      });
    } else {
      onChange?.(id, { ...state, type, parallelSpec: null });
    }
  }

  function updateSpec(patch: Partial<ParallelSpecDto>) {
    onChange?.(id, { ...state, parallelSpec: { ...spec, ...patch } });
  }

  function toggleBranchState(stateId: string, checked: boolean) {
    const current = spec.branchStartStateIds;
    const next = checked
      ? [...current, stateId]
      : current.filter(sid => sid !== stateId);
    updateSpec({ branchStartStateIds: next });
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete?.(id);
  }

  return (
    <div
      style={{
        background: T.surface,
        border: `2px dashed ${PARALLEL_COLORS.border}`,
        borderRadius: 14,
        minWidth: expanded ? 420 : 180,
        maxWidth: expanded ? 420 : 180,
        overflow: 'visible',
        fontFamily: "'Inter', sans-serif",
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        position: 'relative',
      }}
    >
      {/* Target handle — Left */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: PARALLEL_COLORS.border,
          width: 12,
          height: 12,
          border: '2px solid #fff',
          boxShadow: `0 0 0 1px ${PARALLEL_COLORS.border}`,
        }}
      />

      {/* Header */}
      <div
        style={{
          background: '#f5f3ff',
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          borderBottom: expanded
            ? `1px solid ${PARALLEL_COLORS.border}`
            : undefined,
          borderRadius: expanded ? '12px 12px 0 0' : 12,
        }}
      >
        {/* Fork indicator */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <div
            style={{
              width: 12,
              height: 1.5,
              background: PARALLEL_COLORS.border,
              borderRadius: 1,
            }}
          />
          <div
            style={{
              width: 12,
              height: 1.5,
              background: PARALLEL_COLORS.border,
              borderRadius: 1,
            }}
          />
          <div
            style={{
              width: 12,
              height: 1.5,
              background: PARALLEL_COLORS.border,
              borderRadius: 1,
            }}
          />
        </div>

        <span
          style={{
            fontWeight: 600,
            fontSize: 12,
            color: PARALLEL_COLORS.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
          title={state.name}
        >
          {state.name}
        </span>

        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: PARALLEL_COLORS.text,
            background: T.surface,
            padding: '1px 5px',
            borderRadius: 4,
            border: `1px solid ${PARALLEL_COLORS.border}`,
            whiteSpace: 'nowrap',
            opacity: 0.8,
          }}
        >
          Parallel
        </span>

        <button
          className="nodrag nopan"
          onClick={() => {
            setExpanded(e => !e);
            setConfirmDelete(false);
          }}
          aria-label={expanded ? 'Collapse node' : 'Expand node'}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 10,
            color: T.textMuted,
            padding: '2px 2px',
            lineHeight: 1,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {expanded ? '\u25b2' : '\u25bc'}
        </button>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div
          style={{
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* Name */}
          <div>
            <label style={labelStyle}>Name</label>
            <input
              ref={nameRef}
              className="nodrag nopan"
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => {
                if (e.key === 'Enter') commitName();
                if (e.key === 'Escape') setNameValue(state.name);
              }}
              style={inputStyle}
            />
          </div>

          {/* Slug */}
          <div>
            <label style={labelStyle}>Slug</label>
            <input
              className="nodrag nopan"
              value={slugValue}
              onChange={e => setSlugValue(e.target.value)}
              onBlur={commitSlug}
              onKeyDown={e => {
                if (e.key === 'Enter') commitSlug();
                if (e.key === 'Escape') setSlugValue(state.slug);
              }}
              style={{
                ...inputStyle,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                fontSize: 11,
                background: T.surfaceAlt,
              }}
            />
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category</label>
            <select
              className="nodrag nopan"
              value={state.category}
              onChange={e =>
                handleCategoryChange(e.target.value as StateCategory)
              }
              style={selectStyle}
            >
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label style={labelStyle}>Type</label>
            <select
              className="nodrag nopan"
              value={state.type}
              onChange={e => handleTypeChange(e.target.value as StateType)}
              style={selectStyle}
            >
              {TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Parallel spec section */}
          {state.type === StateType.Parallel && (
            <div
              style={{
                borderTop: `1px solid ${T.border}`,
                paddingTop: 8,
                marginTop: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: PARALLEL_COLORS.text,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Parallel Spec
              </div>

              {/* Branch start states — checkbox list */}
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: T.textMuted,
                    marginBottom: 4,
                  }}
                >
                  Branch Start States
                </div>
                {availableForSpec.length === 0 ? (
                  <p
                    style={{
                      fontSize: 10,
                      color: T.textDim,
                      fontStyle: 'italic',
                    }}
                  >
                    Add more states to select branch starts.
                  </p>
                ) : (
                  <div
                    className="nodrag nopan"
                    style={{
                      maxHeight: 120,
                      overflowY: 'auto',
                      border: `1px solid ${T.border}`,
                      borderRadius: 6,
                      padding: '4px 6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                    }}
                  >
                    {availableForSpec.map(s => {
                      const cc = CATEGORY_COLORS[s.category];
                      return (
                        <label
                          key={s.id}
                          className="nodrag nopan"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: 'pointer',
                            fontSize: 11,
                            color: T.text,
                          }}
                        >
                          <input
                            className="nodrag nopan"
                            type="checkbox"
                            checked={spec.branchStartStateIds.includes(s.id)}
                            onChange={e =>
                              toggleBranchState(s.id, e.target.checked)
                            }
                            style={{
                              cursor: 'pointer',
                              accentColor: PARALLEL_COLORS.border,
                            }}
                          />
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: cc.border,
                              flexShrink: 0,
                            }}
                          />
                          {s.name}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Join state */}
              <div>
                <label style={labelStyle}>Join State</label>
                <select
                  className="nodrag nopan"
                  value={spec.joinStateId}
                  onChange={e => updateSpec({ joinStateId: e.target.value })}
                  style={selectStyle}
                >
                  <option value="">— Select join state —</option>
                  {availableForSpec.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Join mode */}
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: T.textMuted,
                    marginBottom: 4,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Join Mode
                </div>
                <div
                  className="nodrag nopan"
                  style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  {(['AllMustComplete', 'AnyBranch'] as const).map(mode => (
                    <label
                      key={mode}
                      className="nodrag nopan"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        fontSize: 11,
                        color: T.text,
                      }}
                    >
                      <input
                        className="nodrag nopan"
                        type="radio"
                        name={`join-mode-${id}`}
                        value={mode}
                        checked={spec.joinMode === mode}
                        onChange={() => updateSpec({ joinMode: mode })}
                        style={{
                          cursor: 'pointer',
                          accentColor: PARALLEL_COLORS.border,
                        }}
                      />
                      {mode === 'AllMustComplete'
                        ? 'All must complete'
                        : 'Any branch'}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Delete row */}
          <div
            style={{
              borderTop: `1px solid ${T.border}`,
              paddingTop: 8,
              marginTop: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {confirmDelete ? (
              <>
                <span style={{ fontSize: 11, color: T.red, flex: 1 }}>
                  Delete this state?
                </span>
                <button
                  className="nodrag nopan"
                  onClick={handleDelete}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#fff',
                    background: T.red,
                    border: 'none',
                    borderRadius: 4,
                    padding: '3px 8px',
                    cursor: 'pointer',
                  }}
                >
                  Yes
                </button>
                <button
                  className="nodrag nopan"
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    fontSize: 11,
                    color: T.textMuted,
                    background: T.surfaceAlt,
                    border: `1px solid ${T.border}`,
                    borderRadius: 4,
                    padding: '3px 8px',
                    cursor: 'pointer',
                  }}
                >
                  No
                </button>
              </>
            ) : (
              <button
                className="nodrag nopan"
                onClick={handleDelete}
                aria-label="Delete state"
                title="Delete state"
                style={{
                  fontSize: 11,
                  color: T.textDim,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = T.red)}
                onMouseLeave={e => (e.currentTarget.style.color = T.textDim)}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {/* Branch source handles — one per branch, dynamically positioned on the right */}
      {Array.from({ length: branchCount }, (_, i) => {
        const branchId = state.parallelSpec?.branchStartStateIds[i];
        const branchState = branchId
          ? (allStates ?? []).find(s => s.id === branchId)
          : undefined;
        return (
          <Handle
            key={`branch-${i}`}
            type="source"
            position={Position.Right}
            id={`branch-${i}`}
            style={{
              background: PARALLEL_COLORS.border,
              width: 12,
              height: 12,
              border: '2px solid #fff',
              boxShadow: `0 0 0 1px ${PARALLEL_COLORS.border}`,
              top: topPct(i, branchCount),
            }}
            title={branchState?.name ?? `Branch ${i + 1}`}
          />
        );
      })}
    </div>
  );
}

ParallelStateNode.displayName = 'ParallelStateNode';

// Shared inline styles to avoid repetition
const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  color: '#6b7084',
  marginBottom: 3,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const inputStyle: CSSProperties = {
  width: '100%',
  fontSize: 12,
  fontWeight: 500,
  color: '#1a1d27',
  border: '1px solid #e2e5eb',
  borderRadius: 6,
  padding: '4px 8px',
  outline: 'none',
  background: '#ffffff',
  boxSizing: 'border-box',
};

const selectStyle: CSSProperties = {
  width: '100%',
  fontSize: 12,
  color: '#1a1d27',
  border: '1px solid #e2e5eb',
  borderRadius: 6,
  padding: '4px 8px',
  outline: 'none',
  background: '#ffffff',
  cursor: 'pointer',
  boxSizing: 'border-box',
};
