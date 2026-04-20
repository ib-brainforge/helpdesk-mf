/**
 * Principal automation rule edit page — /principal/[principalId]/automation/[id]
 *
 * Renders name, description, trigger type, and condition/action builder.
 * isEnabled is NOT editable on the update command (UpdatePrincipalAutomationRuleCommand
 * does not carry IsEnabled). Enable/disable is done from the list page via dedicated
 * enable/disable endpoints.
 *
 * See: helpdesk-backend issue "Add IsEnabled to UpdatePrincipalAutomationRuleCommand"
 */

import { AutomationRuleForm } from '@/components/principal/automation/AutomationRuleForm';
import {
  usePrincipalAutomationRule,
  useUpdatePrincipalAutomationRule,
} from '@/hooks/usePrincipalAutomation';
import { BaseButton, PageSpinner } from '@brainforgeau/components';
import type {
  HelpdeskApplicationAutomationDTOsAutomationActionDto,
  HelpdeskApplicationAutomationDTOsAutomationConditionDto,
  HelpdeskDomainAutomationEnumsAutomationTriggerType,
  HelpdeskDomainAutomationEnumsConditionMatchType,
} from '@brainforgeau/helpdesk-client';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { addToast } from '@heroui/react';
import {
  useNavigate,
  useOutletContext,
  useParams,
} from '@modern-js/runtime/router';
import type { PrincipalOutletContext } from '../../layout';

function PrincipalAutomationRuleEditPage() {
  const { principalId, id } = useParams<{ principalId: string; id: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();

  const { data: rule, isLoading } = usePrincipalAutomationRule(
    principalId ?? '',
    id ?? '',
  );
  const updateMutation = useUpdatePrincipalAutomationRule(principalId ?? '');

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

  const handleSave = (values: {
    name: string;
    description: string;
    triggerType: HelpdeskDomainAutomationEnumsAutomationTriggerType;
    matchType: HelpdeskDomainAutomationEnumsConditionMatchType;
    conditions: HelpdeskApplicationAutomationDTOsAutomationConditionDto[];
    actions: HelpdeskApplicationAutomationDTOsAutomationActionDto[];
    elseActions: HelpdeskApplicationAutomationDTOsAutomationActionDto[];
  }) => {
    if (!id) return;
    updateMutation.mutate(
      {
        id,
        command: {
          name: values.name,
          description: values.description || null,
          triggerType: values.triggerType,
          matchType: values.matchType,
          conditions: values.conditions,
          actions: values.actions,
          elseActions: values.elseActions,
        },
      },
      {
        onSuccess: () => {
          addToast({ title: 'Automation rule updated', severity: 'success' });
          navigate(`/principal/${principalId}/automation`);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <BaseButton
          variant="light"
          onPress={() => navigate(`/principal/${principalId}/automation`)}
        >
          Back
        </BaseButton>
        <h1 className="text-2xl font-semibold">Edit Automation Rule</h1>
      </div>

      <AutomationRuleForm
        mode="edit"
        initialValues={{
          name: rule.name ?? '',
          description: rule.description ?? '',
          triggerType: rule.triggerType,
          matchType: rule.matchType,
          conditions: rule.conditions ?? [],
          actions: (
            rule.actions ??
            ([] as HelpdeskApplicationAutomationDTOsAutomationActionDto[])
          ).filter(
            (a: HelpdeskApplicationAutomationDTOsAutomationActionDto) =>
              !a.isElseAction,
          ),
          elseActions: (
            rule.elseActions ??
            ([] as HelpdeskApplicationAutomationDTOsAutomationActionDto[])
          ).filter(
            (a: HelpdeskApplicationAutomationDTOsAutomationActionDto) =>
              a.isElseAction,
          ),
        }}
        onSave={handleSave}
        onCancel={() => navigate(`/principal/${principalId}/automation`)}
        isSaving={updateMutation.isPending}
      />
    </div>
  );
}

export default withAuthenticationRequired(PrincipalAutomationRuleEditPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
