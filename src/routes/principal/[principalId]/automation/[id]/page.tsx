/**
 * Principal automation rule edit page — /principal/[principalId]/automation/[id]
 *
 * Renders name, description, trigger type, and enabled toggle.
 * Condition/action builder is a complex UI outside the scope of this wiring task;
 * those are shown as read-only summaries.
 * REVIEW: Add full condition/action builder UI in a follow-up iteration.
 */

import {
  usePrincipalAutomationRule,
  useUpdatePrincipalAutomationRule,
} from '@/hooks/usePrincipalAutomation';
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
import { useCallback, useEffect, useState } from 'react';
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

function PrincipalAutomationRuleEditPage() {
  const { principalId, id } = useParams<{ principalId: string; id: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();

  const { data: rule, isLoading } = usePrincipalAutomationRule(
    principalId ?? '',
    id ?? '',
  );
  const updateMutation = useUpdatePrincipalAutomationRule(principalId ?? '');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<string>(
    HelpdeskDomainAutomationEnumsAutomationTriggerType.TicketCreated,
  );
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    if (rule) {
      setName(rule.name ?? '');
      setDescription(rule.description ?? '');
      setTriggerType(
        rule.triggerType ??
          HelpdeskDomainAutomationEnumsAutomationTriggerType.TicketCreated,
      );
      setIsEnabled(rule.isEnabled ?? true);
    }
  }, [rule]);

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

  const handleSave = useCallback(() => {
    if (!id || !name.trim()) return;
    updateMutation.mutate(
      {
        id,
        command: {
          name: name.trim(),
          description: description.trim() || null,
          triggerType:
            triggerType as (typeof HelpdeskDomainAutomationEnumsAutomationTriggerType)[keyof typeof HelpdeskDomainAutomationEnumsAutomationTriggerType],
          conditions: rule?.conditions ?? [],
          actions: rule?.actions ?? [],
          elseActions: rule?.elseActions ?? [],
        },
      },
      {
        onSuccess: () => {
          addToast({ title: 'Automation rule updated', severity: 'success' });
          navigate(`/principal/${principalId}/automation`);
        },
      },
    );
  }, [
    id,
    name,
    description,
    triggerType,
    rule,
    updateMutation,
    navigate,
    principalId,
  ]);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <PageSpinner title="Loading automation rule..." />
      </div>
    );
  }

  if (!rule) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-xl font-semibold">Not Found</p>
        <BaseButton
          variant="light"
          onPress={() => navigate(`/principal/${principalId}/automation`)}
        >
          Back to Automation
        </BaseButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div className="flex items-center gap-3">
        <BaseButton
          variant="light"
          onPress={() => navigate(`/principal/${principalId}/automation`)}
        >
          Back
        </BaseButton>
        <h1 className="text-2xl font-semibold">Edit Automation Rule</h1>
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
          Rule enabled
        </label>
        {/* Condition/action builder is read-only here */}
        {(rule.conditions?.length ?? 0) > 0 && (
          <div className="rounded border p-3 text-sm text-default-500">
            {rule.conditions?.length} condition(s) and {rule.actions?.length}{' '}
            action(s) configured. Full condition/action editor coming in a
            follow-up iteration.
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <BaseButton
          color="primary"
          onPress={handleSave}
          isLoading={updateMutation.isPending}
          isDisabled={!name.trim()}
        >
          Save changes
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

export default withAuthenticationRequired(PrincipalAutomationRuleEditPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
