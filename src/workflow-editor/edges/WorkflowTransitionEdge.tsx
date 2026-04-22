import {
  BaseEdge,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
} from '@xyflow/react';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import type { ApprovalSpecDto, TimerTriggerSpecDto, WorkflowTransitionDto } from '../types';
import { TriggerType } from '../types/enums';
import { ApprovalStepEditor } from '../components/ApprovalStepEditor';
import { TimerTriggerEditor } from '../components/TimerTriggerEditor';
import { CANVAS_TOKENS, T } from '../canvas/canvasTheme';

export type WorkflowTransitionEdgeType = Edge<
  {
    transition: WorkflowTransitionDto;
    onChange?: (id: string, next: WorkflowTransitionDto) => void;
    onDelete?: (id: string) => void;
  },
  'workflowTransition'
>;

const TRIGGER_LABEL: Record<TriggerType, string> = {
  [TriggerType.Manual]: 'Manual',
  [TriggerType.Event]: 'Event',
  [TriggerType.Timer]: 'Timer',
};

const TRIGGER_COLOR: Record<TriggerType, string> = {
  [TriggerType.Manual]: '#6b7084',
  [TriggerType.Event]: '#2563eb',
  [TriggerType.Timer]: '#d97706',
};

const TRIGGER_BG: Record<TriggerType, string> = {
  [TriggerType.Manual]: '#f3f4f7',
  [TriggerType.Event]: '#dbeafe',
  [TriggerType.Timer]: '#fef3c7',
};

const TRIGGER_BORDER: Record<TriggerType, string> = {
  [TriggerType.Manual]: '#e2e5eb',
  [TriggerType.Event]: '#93c5fd',
  [TriggerType.Timer]: '#fcd34d',
};

export function WorkflowTransitionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<WorkflowTransitionEdgeType>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const t = data?.transition;
  const onChange = data?.onChange;
  const onDelete = data?.onDelete;

  // Local draft state for text fields (commit on blur/Enter)
  const [guardValue, setGuardValue] = useState(t?.guardExpression ?? '');
  const [eventName, setEventName] = useState(
    (t?.triggerSpec?.eventName as string) ?? '',
  );

  useEffect(() => {
    setGuardValue(t?.guardExpression ?? '');
    setEventName((t?.triggerSpec?.eventName as string) ?? '');
  }, [t?.guardExpression, t?.triggerSpec?.eventName]);

  if (!t) {
    return (
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? CANVAS_TOKENS.edgeSelected : CANVAS_TOKENS.edge,
          strokeWidth: 2,
        }}
      />
    );
  }

  function update(patch: Partial<WorkflowTransitionDto>) {
    if (!t || !onChange) return;
    onChange(id, { ...t, ...patch });
  }

  function commitGuard() {
    const trimmed = guardValue.trim();
    update({ guardExpression: trimmed || null });
  }

  function commitEventName() {
    const trimmed = eventName.trim();
    update({ triggerSpec: trimmed ? { eventName: trimmed } : null });
  }

  function handleTriggerTypeChange(triggerType: TriggerType) {
    update({ triggerType, triggerSpec: null });
  }

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onDelete?.(id);
  }

  const triggerColor = TRIGGER_COLOR[t.triggerType];
  const triggerBg = TRIGGER_BG[t.triggerType];
  const triggerBorderColor = TRIGGER_BORDER[t.triggerType];

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? CANVAS_TOKENS.edgeSelected : CANVAS_TOKENS.edge,
          strokeWidth: selected ? 2.5 : 2,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            position: 'absolute',
            pointerEvents: 'all',
            zIndex: expanded ? 10 : 1,
          }}
        >
          {/* Collapsed label chip */}
          {!expanded && (
            <button
              className="nodrag nopan"
              onClick={() => setExpanded(true)}
              title="Click to edit transition"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: triggerBg,
                border: `1px solid ${triggerBorderColor}`,
                borderRadius: 8,
                padding: '3px 8px',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 600,
                color: triggerColor,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                fontFamily: "'Inter', sans-serif",
                whiteSpace: 'nowrap',
              }}
            >
              {TRIGGER_LABEL[t.triggerType]}
              {t.guardExpression && (
                <span
                  style={{
                    fontSize: 9,
                    color: '#d97706',
                    background: '#fef3c7',
                    border: '1px solid #fcd34d',
                    borderRadius: 4,
                    padding: '0 4px',
                    marginLeft: 2,
                  }}
                  title={`Guard: ${t.guardExpression}`}
                >
                  guard
                </span>
              )}
              {t.approvalSpec?.required && (
                <span
                  style={{
                    fontSize: 9,
                    color: '#7c3aed',
                    background: '#ede9fe',
                    border: '1px solid #c4b5fd',
                    borderRadius: 4,
                    padding: '0 4px',
                    marginLeft: 2,
                  }}
                >
                  approval
                </span>
              )}
            </button>
          )}

          {/* Expanded panel */}
          {expanded && (
            <div
              className="nodrag nopan"
              style={{
                background: T.surface,
                border: `1px solid ${triggerBorderColor}`,
                borderRadius: 12,
                padding: '10px 12px',
                minWidth: 280,
                maxWidth: 320,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                fontFamily: "'Inter', sans-serif",
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {/* Panel header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: triggerColor,
                    flex: 1,
                  }}
                >
                  Transition
                </span>
                <button
                  className="nodrag nopan"
                  onClick={() => { setExpanded(false); setConfirmDelete(false); }}
                  aria-label="Collapse transition editor"
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 10,
                    color: T.textMuted,
                    cursor: 'pointer',
                    padding: '2px 2px',
                    lineHeight: 1,
                  }}
                >
                  {'\u25b2'}
                </button>
              </div>

              {/* Trigger type select */}
              <div>
                <label style={labelStyle}>Trigger Type</label>
                <select
                  className="nodrag nopan"
                  value={t.triggerType}
                  onChange={e => handleTriggerTypeChange(e.target.value as TriggerType)}
                  style={selectStyle}
                >
                  <option value={TriggerType.Manual}>Manual</option>
                  <option value={TriggerType.Event}>Event</option>
                  <option value={TriggerType.Timer}>Timer</option>
                </select>
              </div>

              {/* Event name — shown for Event trigger */}
              {t.triggerType === TriggerType.Event && (
                <div>
                  <label style={labelStyle}>Event Name</label>
                  <input
                    className="nodrag nopan"
                    value={eventName}
                    onChange={e => setEventName(e.target.value)}
                    onBlur={commitEventName}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitEventName();
                      if (e.key === 'Escape') setEventName((t.triggerSpec?.eventName as string) ?? '');
                    }}
                    placeholder="e.g. approval.granted"
                    style={inputStyle}
                  />
                </div>
              )}

              {/* Timer trigger editor */}
              {t.triggerType === TriggerType.Timer && (
                <TimerTriggerEditor
                  value={t.triggerSpec as unknown as TimerTriggerSpecDto | null}
                  onChange={spec =>
                    update({ triggerSpec: spec as unknown as Record<string, unknown> | null })
                  }
                />
              )}

              {/* Guard expression */}
              <div>
                <label style={labelStyle}>Guard Expression</label>
                <textarea
                  className="nodrag nopan"
                  value={guardValue}
                  onChange={e => setGuardValue(e.target.value)}
                  onBlur={commitGuard}
                  onKeyDown={e => {
                    if (e.key === 'Escape') setGuardValue(t.guardExpression ?? '');
                  }}
                  placeholder="Leave empty for no guard"
                  rows={2}
                  style={{
                    ...inputStyle,
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                    fontSize: 11,
                    resize: 'vertical',
                    minHeight: 48,
                  }}
                />
              </div>

              {/* Approval editor */}
              <InlineApprovalEditor
                value={t.approvalSpec}
                onChange={approvalSpec => update({ approvalSpec: approvalSpec ?? undefined })}
              />

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
                    <span style={{ fontSize: 11, color: T.red, flex: 1 }}>Delete transition?</span>
                    <button
                      className="nodrag nopan"
                      onClick={handleDelete}
                      style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: T.red, border: 'none', borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}
                    >
                      Yes
                    </button>
                    <button
                      className="nodrag nopan"
                      onClick={() => setConfirmDelete(false)}
                      style={{ fontSize: 11, color: T.textMuted, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}
                    >
                      No
                    </button>
                  </>
                ) : (
                  <button
                    className="nodrag nopan"
                    onClick={handleDelete}
                    aria-label="Delete transition"
                    style={{ fontSize: 11, color: T.textDim, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center', gap: 4 }}
                    onMouseEnter={e => (e.currentTarget.style.color = T.red)}
                    onMouseLeave={e => (e.currentTarget.style.color = T.textDim)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

/**
 * Inline approval editor — a lightweight version of ApprovalStepEditor
 * suitable for rendering inside the edge panel without HeroUI Switch component
 * (which requires className-based styling and doesn't suit inline canvas panels).
 * REVIEW: Using raw checkbox instead of HeroUI Switch so the edge panel stays
 * purely inline-styled without pulling in Tailwind class dependencies.
 */
function InlineApprovalEditor({
  value,
  onChange,
}: {
  value: ApprovalSpecDto | null | undefined;
  onChange: (next: ApprovalSpecDto | null) => void;
}) {
  const isRequired = value?.required ?? false;
  const [rolesInput, setRolesInput] = useState(
    (value?.approverRoles ?? []).join(', '),
  );

  useEffect(() => {
    setRolesInput((value?.approverRoles ?? []).join(', '));
  }, [value?.approverRoles]);

  function commitRoles() {
    const roles = rolesInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    onChange({ ...(value ?? { required: true }), required: true, approverRoles: roles });
  }

  return (
    <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 8, marginTop: 2 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: T.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: 6,
        }}
      >
        Approval
      </div>

      <label
        className="nodrag nopan"
        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: T.text }}
      >
        <input
          className="nodrag nopan"
          type="checkbox"
          checked={isRequired}
          onChange={e => {
            if (!e.target.checked) {
              onChange(null);
              setRolesInput('');
            } else {
              onChange({ required: true, approverRoles: [], description: '' });
            }
          }}
          style={{ cursor: 'pointer', accentColor: '#7c3aed' }}
        />
        Require approval before transition
      </label>

      {isRequired && (
        <div style={{ marginTop: 6, paddingLeft: 8 }}>
          <label style={labelStyle}>Approver Roles (comma-separated)</label>
          <input
            className="nodrag nopan"
            value={rolesInput}
            onChange={e => setRolesInput(e.target.value)}
            onBlur={commitRoles}
            onKeyDown={e => { if (e.key === 'Enter') commitRoles(); }}
            placeholder="manager, supervisor"
            style={inputStyle}
          />
        </div>
      )}
    </div>
  );
}

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
  fontWeight: 400,
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
