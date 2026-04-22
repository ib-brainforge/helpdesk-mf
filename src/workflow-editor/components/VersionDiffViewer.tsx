// VersionDiffViewer — text-based diff of draft vs published states and transitions.
// Full implementation done in Task 9 of Plan 6.

import { Chip } from '@heroui/react';
import { useState } from 'react';
import type {
  WorkflowDefinitionVersionDto,
  WorkflowStateDto,
  WorkflowTransitionDto,
} from '../types';

interface StateDiff {
  type: 'added' | 'removed' | 'modified';
  state: WorkflowStateDto;
  prevState?: WorkflowStateDto;
}

interface TransitionDiff {
  type: 'added' | 'removed' | 'modified';
  transition: WorkflowTransitionDto;
  prevTransition?: WorkflowTransitionDto;
}

interface DiffResult {
  states: StateDiff[];
  transitions: TransitionDiff[];
}

function computeDiff(
  published: WorkflowDefinitionVersionDto,
  draft: WorkflowDefinitionVersionDto,
): DiffResult {
  const pubStateMap = new Map(published.states.map(s => [s.id, s]));
  const draftStateMap = new Map(draft.states.map(s => [s.id, s]));
  const pubTransMap = new Map(published.transitions.map(t => [t.id, t]));
  const draftTransMap = new Map(draft.transitions.map(t => [t.id, t]));

  const stateDiffs: StateDiff[] = [];
  const transDiffs: TransitionDiff[] = [];

  // States: added (in draft but not published)
  for (const [id, state] of draftStateMap) {
    if (!pubStateMap.has(id)) {
      stateDiffs.push({ type: 'added', state });
    } else {
      const prev = pubStateMap.get(id)!;
      const isModified =
        prev.name !== state.name ||
        prev.slug !== state.slug ||
        prev.category !== state.category ||
        prev.type !== state.type ||
        prev.description !== state.description ||
        prev.sortOrder !== state.sortOrder ||
        JSON.stringify(prev.parallelSpec) !==
          JSON.stringify(state.parallelSpec);
      if (isModified) {
        stateDiffs.push({ type: 'modified', state, prevState: prev });
      }
    }
  }

  // States: removed (in published but not draft)
  for (const [id, state] of pubStateMap) {
    if (!draftStateMap.has(id)) {
      stateDiffs.push({ type: 'removed', state });
    }
  }

  // Transitions: added
  for (const [id, transition] of draftTransMap) {
    if (!pubTransMap.has(id)) {
      transDiffs.push({ type: 'added', transition });
    } else {
      const prev = pubTransMap.get(id)!;
      const isModified =
        prev.fromStateId !== transition.fromStateId ||
        prev.toStateId !== transition.toStateId ||
        prev.triggerType !== transition.triggerType ||
        prev.guardExpression !== transition.guardExpression ||
        prev.sourceHandleId !== transition.sourceHandleId ||
        JSON.stringify(prev.triggerSpec) !==
          JSON.stringify(transition.triggerSpec) ||
        JSON.stringify(prev.actions) !== JSON.stringify(transition.actions) ||
        JSON.stringify(prev.approvalSpec) !==
          JSON.stringify(transition.approvalSpec);
      if (isModified) {
        transDiffs.push({
          type: 'modified',
          transition,
          prevTransition: prev,
        });
      }
    }
  }

  // Transitions: removed
  for (const [id, transition] of pubTransMap) {
    if (!draftTransMap.has(id)) {
      transDiffs.push({ type: 'removed', transition });
    }
  }

  return { states: stateDiffs, transitions: transDiffs };
}

function chipColor(type: 'added' | 'removed' | 'modified') {
  if (type === 'added') return 'success' as const;
  if (type === 'removed') return 'danger' as const;
  return 'warning' as const;
}

function chipLabel(type: 'added' | 'removed' | 'modified') {
  if (type === 'added') return 'Added';
  if (type === 'removed') return 'Removed';
  return 'Modified';
}

export interface VersionDiffViewerProps {
  published: WorkflowDefinitionVersionDto | null;
  draft: WorkflowDefinitionVersionDto | null;
}

export function VersionDiffViewer({
  published,
  draft,
}: VersionDiffViewerProps) {
  const [expanded, setExpanded] = useState(false);

  if (!published || !draft) return null;

  const diff = computeDiff(published, draft);
  const totalChanges = diff.states.length + diff.transitions.length;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        onClick={() => setExpanded(prev => !prev)}
        aria-expanded={expanded}
      >
        <span className="text-sm font-semibold text-gray-700">
          Compare draft vs published
          {totalChanges > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              ({totalChanges} change{totalChanges !== 1 ? 's' : ''})
            </span>
          )}
        </span>
        <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="p-4 space-y-5">
          {totalChanges === 0 && (
            <p className="text-sm text-gray-500 italic">
              No differences between draft and published versions.
            </p>
          )}

          {/* States diff */}
          {diff.states.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                States ({diff.states.length})
              </h4>
              <div className="space-y-2">
                {diff.states.map(d => (
                  <div
                    key={`${d.type}-${d.state.id}`}
                    className="flex items-start gap-2 text-sm"
                  >
                    <Chip
                      size="sm"
                      color={chipColor(d.type)}
                      variant="flat"
                      className="flex-shrink-0 mt-0.5"
                    >
                      {chipLabel(d.type)}
                    </Chip>
                    <div className="min-w-0">
                      <span className="font-medium">{d.state.name}</span>
                      {d.prevState && d.prevState.name !== d.state.name && (
                        <span className="text-gray-400 text-xs ml-1">
                          (was: {d.prevState.name})
                        </span>
                      )}
                      <span className="text-xs text-gray-400 ml-1 font-mono">
                        ({d.state.slug})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transitions diff */}
          {diff.transitions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Transitions ({diff.transitions.length})
              </h4>
              <div className="space-y-2">
                {diff.transitions.map(d => (
                  <div
                    key={`${d.type}-${d.transition.id}`}
                    className="flex items-start gap-2 text-sm"
                  >
                    <Chip
                      size="sm"
                      color={chipColor(d.type)}
                      variant="flat"
                      className="flex-shrink-0 mt-0.5"
                    >
                      {chipLabel(d.type)}
                    </Chip>
                    <div className="min-w-0 text-xs text-gray-600">
                      <span className="font-mono">
                        {d.transition.fromStateId.slice(0, 6)}…
                      </span>
                      <span className="mx-1">→</span>
                      <span className="font-mono">
                        {d.transition.toStateId.slice(0, 6)}…
                      </span>
                      <span className="ml-1 text-gray-400">
                        [{d.transition.triggerType}]
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="text-xs text-gray-400 border-t border-gray-100 pt-3">
            Comparing draft v{draft.versionNumber} against published v
            {published.versionNumber}
          </div>
        </div>
      )}
    </div>
  );
}
