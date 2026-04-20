/**
 * Principal automation rule create page — /principal/[principalId]/automation/new
 *
 * Creates a rule with name, description, trigger type, and enabled flag.
 * Conditions/actions are set as empty arrays — full builder is a follow-up task.
 * REVIEW: Add condition/action builder UI in a follow-up iteration.
 */

import { useCreatePrincipalAutomationRule } from '@/hooks/usePrincipalAutomation';
import {
  BaseButton,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  PageSpinner,
} from '@brainforgeau/components';
import { HelpdeskDomainAutomationEnumsAutomationTriggerType } from '@brainforgeau/helpdesk-client';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { addToast } from '@heroui/react';
import {
  useNavigate,
  useOutletContext,
  useParams,
} from '@modern-js/runtime/router';
import { useCallback, useState } from 'react';
import type { PrincipalOutletContext } from '../../layout';

const TRIGGER_LABELS: Record<string, string> = {
  TicketCreated: 'Ticket Created',
  TicketOverdue: 'Ticket Overdue',
  TicketNotUpdated: 'Ticket Not Updated',
  TicketClosed: 'Ticket Closed',
  TicketUpdated: 'Ticket Updated',
  TicketCategoryChanged: 'Category Changed',
  TicketAssigneeChanged: 'Assignee Changed',
  TicketStatusChanged: 'Status Changed',
  TicketPriorityChanged: 'Priority Changed',
  TicketUpdatedByCustomer: 'Updated By Customer',
  TicketReopened: 'Ticket Reopened',
  TriggerManually: 'Trigger Manually',
};

function PrincipalAutomationRuleNewPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<string>(
    HelpdeskDomainAutomationEnumsAutomationTriggerType.TicketCreated,
  );
  const [isEnabled, setIsEnabled] = useState(true);

  const createMutation = useCreatePrincipalAutomationRule(principalId ?? '');

  if (context?.level !== 'admin') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-xl font-semibold">Access Denied</p>
        <p className="text-default-500 text-sm">
          Automation management requires admin access.
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
        triggerType:
          triggerType as (typeof HelpdeskDomainAutomationEnumsAutomationTriggerType)[keyof typeof HelpdeskDomainAutomationEnumsAutomationTriggerType],
        isEnabled,
        isNested: false,
        conditions: [],
        actions: [],
        elseActions: [],
      },
      {
        onSuccess: () => {
          addToast({ title: 'Automation rule created', severity: 'success' });
          navigate(`/principal/${principalId}/automation`);
        },
      },
    );
  }, [
    name,
    description,
    triggerType,
    isEnabled,
    createMutation,
    navigate,
    principalId,
  ]);

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div className="flex items-center gap-3">
        <BaseButton
          variant="light"
          onPress={() => navigate(`/principal/${principalId}/automation`)}
        >
          Back
        </BaseButton>
        <h1 className="text-2xl font-semibold">New Automation Rule</h1>
      </div>

      <div className="flex flex-col gap-4">
        <BaseInput
          label="Name"
          value={name}
          onValueChange={setName}
          placeholder="e.g. Auto-assign on create"
          isRequired
        />
        <BaseInput
          label="Description"
          value={description}
          onValueChange={setDescription}
          placeholder="Optional description"
        />
        <BaseSelect
          label="Trigger"
          selectedKeys={[triggerType]}
          onSelectionChange={keys => {
            const val = Array.from(keys)[0];
            if (val) setTriggerType(String(val));
          }}
        >
          {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
            <BaseSelectItem key={value}>{label}</BaseSelectItem>
          ))}
        </BaseSelect>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={e => setIsEnabled(e.target.checked)}
            className="h-4 w-4"
          />
          Enable rule immediately
        </label>
        <p className="text-xs text-default-400">
          Note: Conditions and actions can be added after creation from the edit
          view.
        </p>
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
          onPress={() => navigate(`/principal/${principalId}/automation`)}
        >
          Cancel
        </BaseButton>
      </div>
    </div>
  );
}

export default withAuthenticationRequired(PrincipalAutomationRuleNewPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
