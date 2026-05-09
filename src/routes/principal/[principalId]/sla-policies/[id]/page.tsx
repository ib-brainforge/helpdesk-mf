/**
 * Principal SLA policy edit page — /principal/[principalId]/sla-policies/[id]
 */

import {
  usePrincipalSlaPolicy,
  useUpdatePrincipalSlaPolicy,
} from '@/hooks/usePrincipalSlaPolicies';
import {
  BaseButton,
  BaseCheckbox,
  BaseInput,
  PageSpinner,
} from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { toast } from '@heroui/react';

import {
  useNavigate,
  useOutletContext,
  useParams,
} from '@modern-js/runtime/router';
import { useCallback, useEffect, useState } from 'react';
import type { PrincipalOutletContext } from '../../layout';

function PrincipalSlaPolicyEditPage() {
  const { principalId, id } = useParams<{ principalId: string; id: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();

  const { data: policy, isLoading } = usePrincipalSlaPolicy(
    principalId ?? '',
    id ?? '',
  );
  const updateMutation = useUpdatePrincipalSlaPolicy(principalId ?? '');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (policy) {
      setName(policy.name ?? '');
      setDescription(policy.description ?? '');
      setIsDefault(policy.isDefault ?? false);
    }
  }, [policy]);

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

  const handleSave = useCallback(() => {
    if (!id || !name.trim()) return;
    updateMutation.mutate(
      {
        id,
        command: {
          name: name.trim(),
          description: description.trim() || null,
          isDefault,
        },
      },
      {
        onSuccess: () => {
          toast('SLA policy updated', { variant: 'success' });
          navigate(`/principal/${principalId}/sla-policies`);
        },
      },
    );
  }, [id, name, description, isDefault, updateMutation, navigate, principalId]);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <PageSpinner title="Loading SLA policy..." />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-xl font-semibold">Not Found</p>
        <BaseButton
          variant="light"
          onPress={() => navigate(`/principal/${principalId}/sla-policies`)}
        >
          Back to SLA Policies
        </BaseButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div className="flex items-center gap-3">
        <BaseButton
          variant="light"
          onPress={() => navigate(`/principal/${principalId}/sla-policies`)}
        >
          Back
        </BaseButton>
        <h1 className="text-2xl font-semibold">Edit SLA Policy</h1>
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
        <BaseCheckbox isSelected={isDefault} onValueChange={setIsDefault}>
          Set as default policy
        </BaseCheckbox>
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
          onPress={() => navigate(`/principal/${principalId}/sla-policies`)}
        >
          Cancel
        </BaseButton>
      </div>
    </div>
  );
}

export default withAuthenticationRequired(PrincipalSlaPolicyEditPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
