/**
 * Principal category create page — /principal/[principalId]/categories/new
 */

import { useCreatePrincipalCategory } from '@/hooks/usePrincipalCategories';
import {
  BaseButton,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  PageSpinner,
} from '@brainforgeau/components';
import { HelpdeskDomainCategoriesEnumsAccessLevel } from '@brainforgeau/helpdesk-client';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { addToast } from '@heroui/react';
import {
  useNavigate,
  useOutletContext,
  useParams,
} from '@modern-js/runtime/router';
import { useCallback, useState } from 'react';
import type { PrincipalOutletContext } from '../../layout';

const ACCESS_LEVEL_LABELS: Record<string, string> = {
  Everyone: 'Everyone',
  AgentsOnly: 'Agents only',
  AdminsOnly: 'Admins only',
};

function PrincipalCategoryNewPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [accessLevel, setAccessLevel] = useState<string>(
    HelpdeskDomainCategoriesEnumsAccessLevel.Everyone,
  );

  const createMutation = useCreatePrincipalCategory(principalId ?? '');

  if (context?.level !== 'admin') {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-xl font-semibold">Access Denied</p>
        <p className="text-default-500 text-sm">
          Category management requires admin access.
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
        accessLevel: accessLevel as HelpdeskDomainCategoriesEnumsAccessLevel,
        sortOrder: 0,
      },
      {
        onSuccess: () => {
          addToast({ title: 'Category created', severity: 'success' });
          navigate(`/principal/${principalId}/categories`);
        },
      },
    );
  }, [name, description, accessLevel, createMutation, navigate, principalId]);

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div className="flex items-center gap-3">
        <BaseButton
          variant="light"
          onPress={() => navigate(`/principal/${principalId}/categories`)}
        >
          Back
        </BaseButton>
        <h1 className="text-2xl font-semibold">New Category</h1>
      </div>

      <div className="flex flex-col gap-4">
        <BaseInput
          label="Name"
          value={name}
          onValueChange={setName}
          placeholder="e.g. Technical Support"
          isRequired
        />
        <BaseInput
          label="Description"
          value={description}
          onValueChange={setDescription}
          placeholder="Optional description"
        />
        <BaseSelect
          label="Access level"
          selectedKeys={[accessLevel]}
          onSelectionChange={keys => {
            const val = Array.from(keys)[0];
            if (val) setAccessLevel(String(val));
          }}
        >
          {Object.entries(ACCESS_LEVEL_LABELS).map(([value, label]) => (
            <BaseSelectItem key={value}>{label}</BaseSelectItem>
          ))}
        </BaseSelect>
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
          onPress={() => navigate(`/principal/${principalId}/categories`)}
        >
          Cancel
        </BaseButton>
      </div>
    </div>
  );
}

export default withAuthenticationRequired(PrincipalCategoryNewPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
