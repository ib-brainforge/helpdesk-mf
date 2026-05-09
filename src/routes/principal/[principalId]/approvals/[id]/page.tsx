/**
 * Principal approval workflow edit page — /principal/[principalId]/approvals/[id]
 */

import { APPROVAL_MODE_LABELS } from '@/constants/approvalLabels';
import { toast } from '@heroui/react';
import {
  usePrincipalApprovalWorkflow,
  useUpdatePrincipalApprovalWorkflow,
} from '@/hooks/usePrincipalApprovalWorkflows';
import {
  BaseButton,
  BaseCheckbox,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  PageSpinner,
} from '@brainforgeau/components';
import { HelpdeskDomainApprovalsEnumsApprovalMode } from '@brainforgeau/helpdesk-client';
import { withAuthenticationRequired } from '@brainforgeau/security';

import {
  useNavigate,
  useOutletContext,
  useParams,
} from '@modern-js/runtime/router';
import { useCallback, useEffect, useState } from 'react';
import type { PrincipalOutletContext } from '../../layout';

function PrincipalApprovalWorkflowEditPage() {
  const { principalId, id } = useParams<{ principalId: string; id: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();

  const { data: workflow, isLoading } = usePrincipalApprovalWorkflow(
    principalId ?? '',
    id ?? '',
  );
  const updateMutation = useUpdatePrincipalApprovalWorkflow(principalId ?? '');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [approvalMode, setApprovalMode] = useState<string>(
    HelpdeskDomainApprovalsEnumsApprovalMode.Sequential,
  );
  const [isActive, setIsActive] = useState(true);
  const [triggerOnCreation, setTriggerOnCreation] = useState(false);
  const [triggerOnStatusChange, setTriggerOnStatusChange] = useState(false);

  useEffect(() => {
    if (workflow) {
      setName(workflow.name ?? '');
      setDescription(workflow.description ?? '');
      setApprovalMode(
        workflow.approvalMode ??
          HelpdeskDomainApprovalsEnumsApprovalMode.Sequential,
      );
      setIsActive(workflow.isActive ?? true);
      setTriggerOnCreation(workflow.triggerOnCreation ?? false);
      setTriggerOnStatusChange(workflow.triggerOnStatusChange ?? false);
    }
  }, [workflow]);

  if (context?.level !== 'admin') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-xl font-semibold">Access Denied</p>
        <p className="text-default-500 text-sm">
          Approval workflow management requires admin access.
        </p>
      </div>
    );
  }

  const handleSave = useCallback(() => {
    if (!id || !name.trim()) return;
    updateMutation.mutate(
      {
        id,
        command: {
          name: name.trim(),
          description: description.trim() || null,
          approvalMode:
            approvalMode as HelpdeskDomainApprovalsEnumsApprovalMode,
          isActive,
          triggerOnCreation,
          triggerOnStatusChange,
          steps: workflow?.steps ?? [],
        },
      },
      {
        onSuccess: () => {
          toast('Approval workflow updated', { variant: 'success' });
          navigate(`/principal/${principalId}/approvals`);
        },
      },
    );
  }, [
    id,
    name,
    description,
    approvalMode,
    isActive,
    triggerOnCreation,
    triggerOnStatusChange,
    workflow,
    updateMutation,
    navigate,
    principalId,
  ]);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <PageSpinner title="Loading approval workflow..." />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-xl font-semibold">Not Found</p>
        <BaseButton
          variant="light"
          onPress={() => navigate(`/principal/${principalId}/approvals`)}
        >
          Back to Approvals
        </BaseButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div className="flex items-center gap-3">
        <BaseButton
          variant="light"
          onPress={() => navigate(`/principal/${principalId}/approvals`)}
        >
          Back
        </BaseButton>
        <h1 className="text-2xl font-semibold">Edit Approval Workflow</h1>
      </div>

      <div className="flex flex-col gap-4">
        <BaseInput
          label="Name"
          value={name}
          onValueChange={setName}
          isRequired
        />
        <BaseInput
          label="Description"
          value={description}
          onValueChange={setDescription}
        />
        <BaseSelect
          label="Approval mode"
          selectedKey={approvalMode}
          onSelectionChange={keys => {
            const val = keys;
            if (val) setApprovalMode(String(val));
          }}
        >
          {Object.entries(APPROVAL_MODE_LABELS).map(([value, label]) => (
            <BaseSelectItem key={value}>{label}</BaseSelectItem>
          ))}
        </BaseSelect>
        <div className="flex flex-col gap-2">
          <BaseCheckbox isSelected={isActive} onValueChange={setIsActive}>
            Active
          </BaseCheckbox>
          <BaseCheckbox
            isSelected={triggerOnCreation}
            onValueChange={setTriggerOnCreation}
          >
            Trigger on ticket creation
          </BaseCheckbox>
          <BaseCheckbox
            isSelected={triggerOnStatusChange}
            onValueChange={setTriggerOnStatusChange}
          >
            Trigger on status change
          </BaseCheckbox>
        </div>
        {(workflow.steps?.length ?? 0) > 0 && (
          <div className="rounded border p-3 text-sm text-default-500">
            {workflow.steps?.length} step(s) configured. Step editor coming in a
            follow-up iteration.
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <BaseButton
          color="primary"
          onPress={handleSave}

          isDisabled={updateMutation.isPending || !name.trim()}
        >
          Save changes
        </BaseButton>
        <BaseButton
          variant="light"
          onPress={() => navigate(`/principal/${principalId}/approvals`)}
        >
          Cancel
        </BaseButton>
      </div>
    </div>
  );
}

export default withAuthenticationRequired(PrincipalApprovalWorkflowEditPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
