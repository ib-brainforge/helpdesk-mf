/**
 * Principal SLA policy create page — /principal/[principalId]/sla-policies/new
 */

import { useCreatePrincipalSlaPolicy } from '@/hooks/usePrincipalSlaPolicies';
import {
  BaseButton,
  BaseCheckbox,
  BaseInput,
  PageSpinner,
} from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { addToast } from '@heroui/react';
import {
  useNavigate,
  useOutletContext,
  useParams,
} from '@modern-js/runtime/router';
import { useCallback, useState } from 'react';
import type { PrincipalOutletContext } from '../../layout';

function PrincipalSlaPolicyNewPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const createMutation = useCreatePrincipalSlaPolicy(principalId ?? '');

  if (context?.level !== 'admin') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-xl font-semibold">Access Denied</p>
        <p className="text-default-500 text-sm">
          SLA policy management requires admin access.
        </p>
      </div>
    );
  }

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;
    createMutation.mutate(
      { name: name.trim(), description: description.trim() || null, isDefault },
      {
        onSuccess: () => {
          addToast({ title: 'SLA policy created', severity: 'success' });
          navigate(`/principal/${principalId}/sla-policies`);
        },
      },
    );
  }, [name, description, isDefault, createMutation, navigate, principalId]);

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div className="flex items-center gap-3">
        <BaseButton
          variant="light"
          onPress={() => navigate(`/principal/${principalId}/sla-policies`)}
        >
          Back
        </BaseButton>
        <h1 className="text-2xl font-semibold">New SLA Policy</h1>
      </div>

      <div className="flex flex-col gap-4">
        <BaseInput
          label="Name"
          value={name}
          onValueChange={setName}
          placeholder="e.g. Standard SLA"
          isRequired
        />
        <BaseInput
          label="Description"
          value={description}
          onValueChange={setDescription}
          placeholder="Optional description"
        />
        <BaseCheckbox isSelected={isDefault} onValueChange={setIsDefault}>
          Set as default policy
        </BaseCheckbox>
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
          onPress={() => navigate(`/principal/${principalId}/sla-policies`)}
        >
          Cancel
        </BaseButton>
      </div>
    </div>
  );
}

export default withAuthenticationRequired(PrincipalSlaPolicyNewPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
