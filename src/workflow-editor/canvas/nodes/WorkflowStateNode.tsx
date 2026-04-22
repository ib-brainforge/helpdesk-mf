import { Handle, type Node, type NodeProps, Position } from '@xyflow/react';
import { useEffect, useRef, useState } from 'react';
import type { WorkflowStateDto } from '../../types';
import { StateCategory, StateType } from '../../types/enums';
import { CATEGORY_COLORS, T } from '../canvasTheme';

export type WorkflowStateNodeType = Node<
  {
    state: WorkflowStateDto;
    allStates: WorkflowStateDto[];
    onChange?: (nodeId: string, next: WorkflowStateDto) => void;
    onDelete?: (nodeId: string) => void;
  },
  'workflowState'
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
  // Parallel handled by its own node type
  { value: StateType.Terminal, label: 'Terminal' },
];

export function WorkflowStateNode({ id, data }: NodeProps<WorkflowStateNodeType>) {
  const { state, onChange, onDelete } = data;
  const c = CATEGORY_COLORS[state.category];
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Local draft values for inputs (commit on blur/Enter)
  const [nameValue, setNameValue] = useState(state.name);
  const [slugValue, setSlugValue] = useState(state.slug);
  const nameRef = useRef<HTMLInputElement>(null);

  // Keep local drafts in sync when parent state changes
  useEffect(() => {
    setNameValue(state.name);
    setSlugValue(state.slug);
  }, [state.name, state.slug]);

  function commitName() {
    const trimmed = nameValue.trim();
    if (!trimmed) {
      setNameValue(state.name);
      return;
    }
    if (trimmed === state.name) return;
    // Auto-update slug only if it still matches the auto-generated pattern
    const currentAutoSlug = slugify(state.name);
    const newSlug = state.slug === currentAutoSlug ? slugify(trimmed) : state.slug;
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
    onChange?.(id, { ...state, type });
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
        border: `2px solid ${c.border}`,
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
          background: c.border,
          width: 12,
          height: 12,
          border: '2px solid #fff',
          boxShadow: `0 0 0 1px ${c.border}`,
        }}
      />

      {/* Header */}
      <div
        style={{
          background: c.bg,
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          borderBottom: expanded ? `1px solid ${c.border}` : undefined,
          borderRadius: expanded ? '12px 12px 0 0' : 12,
        }}
      >
        {/* Category color dot */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: c.border,
            flexShrink: 0,
          }}
          aria-hidden="true"
        />

        {/* State name (collapsed: static text; expanded: see body) */}
        <span
          style={{
            fontWeight: 600,
            fontSize: 12,
            color: c.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
          title={state.name}
        >
          {state.name}
        </span>

        {/* Type badge */}
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: T.textMuted,
            background: T.surface,
            padding: '1px 5px',
            borderRadius: 4,
            border: `1px solid ${T.border}`,
            whiteSpace: 'nowrap',
          }}
        >
          {state.type}
        </span>

        {/* Chevron toggle */}
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
            <label
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 600,
                color: T.textMuted,
                marginBottom: 3,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Name
            </label>
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
              style={{
                width: '100%',
                fontSize: 12,
                fontWeight: 500,
                color: T.text,
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                padding: '4px 8px',
                outline: 'none',
                background: T.surface,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Slug */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 600,
                color: T.textMuted,
                marginBottom: 3,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Slug
            </label>
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
                width: '100%',
                fontSize: 11,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                color: T.textMuted,
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                padding: '4px 8px',
                outline: 'none',
                background: T.surfaceAlt,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Category */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 600,
                color: T.textMuted,
                marginBottom: 3,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Category
            </label>
            <select
              className="nodrag nopan"
              value={state.category}
              onChange={e => handleCategoryChange(e.target.value as StateCategory)}
              style={{
                width: '100%',
                fontSize: 12,
                color: T.text,
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                padding: '4px 8px',
                outline: 'none',
                background: T.surface,
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
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
            <label
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 600,
                color: T.textMuted,
                marginBottom: 3,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Type
            </label>
            <select
              className="nodrag nopan"
              value={state.type}
              onChange={e => handleTypeChange(e.target.value as StateType)}
              style={{
                width: '100%',
                fontSize: 12,
                color: T.text,
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                padding: '4px 8px',
                outline: 'none',
                background: T.surface,
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              {TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

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
                {/* Trash icon (SVG inline) */}
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

      {/* Source handle — Right */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: c.border,
          width: 12,
          height: 12,
          border: '2px solid #fff',
          boxShadow: `0 0 0 1px ${c.border}`,
        }}
      />
    </div>
  );
}

WorkflowStateNode.displayName = 'WorkflowStateNode';
