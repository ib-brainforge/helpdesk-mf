// ApprovalStepEditor — configure the approval requirement on a workflow transition.
// Plan 7 will wire this to the backend WorkflowApproval aggregate once client regenerates.

import { BaseInput, BaseTextarea, BaseToggle } from '@brainforgeau/components';
import { useEffect, useState } from 'react';
import type { ApprovalSpecDto } from '../types';

export interface ApprovalStepEditorProps {
  value: ApprovalSpecDto | null | undefined;
  readOnly?: boolean;
  onChange: (next: ApprovalSpecDto | null) => void;
}

/** Parse a comma-separated string into a trimmed, non-empty string array */
function parseList(raw: string): string[] {
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

/** Join an array into a comma-separated string for display in the input */
function joinList(arr: string[] | undefined): string {
  return (arr ?? []).join(', ');
}

export function ApprovalStepEditor({
  value,
  readOnly,
  onChange,
}: ApprovalStepEditorProps) {
  const [rolesInput, setRolesInput] = useState(joinList(value?.approverRoles));

  // Sync local state when parent switches transition selection (F4 fix)
  useEffect(() => {
    setRolesInput(joinList(value?.approverRoles));
  }, [value]);

  const isRequired = value?.required ?? false;

  function handleToggle(next: boolean) {
    if (!next) {
      onChange(null);
      setRolesInput('');
    } else {
      onChange({ required: true, approverRoles: [], description: '' });
    }
  }

  function handleRolesChange(raw: string) {
    setRolesInput(raw);
    onChange({
      ...(value ?? { required: true }),
      required: true,
      approverRoles: parseList(raw),
    });
  }

  function handleDescriptionChange(desc: string) {
    onChange({
      ...(value ?? { required: true }),
      required: true,
      description: desc || undefined,
    });
  }

  return (
    <div className="space-y-3 border-t border-default-200 pt-4 mt-4">
      <h4 className="text-xs font-semibold text-default-600 uppercase tracking-wide">
        Approval
      </h4>

      <div className="flex items-center gap-3">
        <BaseToggle
          isSelected={isRequired}
          onChange={handleToggle}
          isDisabled={readOnly}
          aria-label="Require approval before transition fires"
        />
        <span className="text-sm text-default-700">Require approval</span>
      </div>

      {isRequired && (
        <div className="space-y-3 pl-2 border-l-2 border-default-100">
          <BaseInput
            label="Approver Roles"
            value={rolesInput}
            onValueChange={handleRolesChange}
            readOnly={readOnly}
            labelPlacement="outside"
            size="sm"
            placeholder="manager, supervisor (comma-separated)"
            description="Roles that can approve this transition. Leave empty for any user."
          />

          <BaseTextarea
            label="Approval Note (optional)"
            value={value?.description ?? ''}
            onValueChange={handleDescriptionChange}
            readOnly={readOnly}
            labelPlacement="outside"
            size="sm"
            minRows={2}
            placeholder="Instructions for the approver"
          />
        </div>
      )}
    </div>
  );
}
