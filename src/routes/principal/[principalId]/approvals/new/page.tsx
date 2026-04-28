/**
 * Principal approval workflow create page — /principal/[principalId]/approvals/new
 */

import { useCreatePrincipalApprovalWorkflow } from '@/hooks/usePrincipalApprovalWorkflows';
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
import { addToast } from '@heroui/react';
import {
  useNavigate,
  useOutletContext,
  useParams,
} from '@modern-js/runtime/router';
import { useCallback, useState } from 'react';
import type { PrincipalOutletContext } from '../../layout';
import { APPROVAL_MODE_LABELS } from '@/constants/approvalLabels';

function PrincipalApprovalWorkflowNewPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [approvalMode, setApprovalMode] = useState<string>(
    HelpdeskDomainApprovalsEnumsApprovalMode.Sequential,
  );
  const [isActive, setIsActive] = useState(true);
  const [triggerOnCreation, setTriggerOnCreation] = useState(false);

  const createMutation = useCreatePrincipalApprovalWorkflow(principalId ?? '');

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

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;
    createMutation.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        approvalMode: approvalMode as HelpdeskDomainApprovalsEnumsApprovalMode,
        isActive,
        triggerOnCreation,
        triggerOnStatusChange: false,
        steps: [],
      },
      {
        onSuccess: () => {
          addToast({ title: 'Approval workflow created', severity: 'success' });
          navigate(`/principal/${principalId}/approvals`);
        },
      },
    );
  }, [
    name,
    description,
    approvalMode,
    isActive,
    triggerOnCreation,
    createMutation,
    navigate,
    principalId,
  ]);

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div className="flex items-center gap-3">
        <BaseButton
          variant="light"
          onPress={() => navigate(`/principal/${principalId}/approvals`)}
        >
          Back
        </BaseButton>
        <h1 className="text-2xl font-semibold">New Approval Workflow</h1>
      </div>

      <div className="flex flex-col gap-4">
        <BaseInput
          label="Name"
          value={name}
          onValueChange={setName}
          placeholder="e.g. Manager Approval"
          isRequired
        />
        <BaseInput
          label="Description"
          value={description}
          onValueChange={setDescription}
          placeholder="Optional description"
        />
        <BaseSelect
          label="Approval mode"
          selectedKeys={[approvalMode]}
          onSelectionChange={keys => {
            const val = Array.from(keys)[0];
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
        </div>
      </div>

      <div className="flex gap-3">
        <BaseButton
          color="primary"
          onPress={handleCreate}
          isLoading={createMutation.isPending}
          isDisabled={!name.trim()}
        >
          Create
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

export default withAuthenticationRequired(PrincipalApprovalWorkflowNewPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
