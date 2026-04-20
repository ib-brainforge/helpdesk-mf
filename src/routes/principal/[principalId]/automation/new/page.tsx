/**
 * Principal automation rule create page — /principal/[principalId]/automation/new
 *
 * Creates a rule with full condition/action builder via AutomationRuleForm.
 */

import { useCreatePrincipalAutomationRule } from '@/hooks/usePrincipalAutomation';
import {
  AutomationRuleForm,
  type AutomationRuleFormValues,
} from '@/components/principal/automation/AutomationRuleForm';
import { BaseButton, PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { addToast } from '@heroui/react';
import {
  useNavigate,
  useOutletContext,
  useParams,
} from '@modern-js/runtime/router';
import type { PrincipalOutletContext } from '../../layout';

function PrincipalAutomationRuleNewPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();

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

  const handleCreate = (values: AutomationRuleFormValues) => {
    createMutation.mutate(
      {
        name: values.name,
        description: values.description || null,
        triggerType: values.triggerType,
        matchType: values.matchType,
        isEnabled: values.isEnabled ?? true,
        isNested: false,
        conditions: values.conditions,
        actions: values.actions,
        elseActions: values.elseActions,
      },
      {
        onSuccess: () => {
          addToast({ title: 'Automation rule created', severity: 'success' });
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
        <h1 className="text-2xl font-semibold">New Automation Rule</h1>
      </div>

      <AutomationRuleForm
        mode="create"
        onSave={handleCreate}
        onCancel={() => navigate(`/principal/${principalId}/automation`)}
        isSaving={createMutation.isPending}
      />
    </div>
  );
}

export default withAuthenticationRequired(PrincipalAutomationRuleNewPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
