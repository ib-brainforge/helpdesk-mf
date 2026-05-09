/**
 * Principal category edit page — /principal/[principalId]/categories/[id]
 */

import { ACCESS_LEVEL_LABELS } from '@/constants/categoryLabels';
import { toast } from '@heroui/react';
import {
  usePrincipalCategory,
  useUpdatePrincipalCategory,
} from '@/hooks/usePrincipalCategories';
import {
  BaseButton,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  PageSpinner,
} from '@brainforgeau/components';
import { HelpdeskDomainCategoriesEnumsAccessLevel } from '@brainforgeau/helpdesk-client';
import { withAuthenticationRequired } from '@brainforgeau/security';

import {
  useNavigate,
  useOutletContext,
  useParams,
} from '@modern-js/runtime/router';
import { useCallback, useEffect, useState } from 'react';
import type { PrincipalOutletContext } from '../../layout';

function PrincipalCategoryEditPage() {
  const { principalId, id } = useParams<{ principalId: string; id: string }>();
  const context = useOutletContext<PrincipalOutletContext>();
  const navigate = useNavigate();

  const { data: category, isLoading } = usePrincipalCategory(
    principalId ?? '',
    id ?? '',
  );
  const updateMutation = useUpdatePrincipalCategory(principalId ?? '');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [accessLevel, setAccessLevel] = useState<string>(
    HelpdeskDomainCategoriesEnumsAccessLevel.Everyone,
  );

  useEffect(() => {
    if (category) {
      setName(category.name ?? '');
      setDescription(category.description ?? '');
      setAccessLevel(
        category.accessLevel ??
          HelpdeskDomainCategoriesEnumsAccessLevel.Everyone,
      );
    }
  }, [category]);

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

  const handleSave = useCallback(() => {
    if (!id || !name.trim()) return;
    updateMutation.mutate(
      {
        id,
        command: {
          name: name.trim(),
          description: description.trim() || null,
          accessLevel: accessLevel as HelpdeskDomainCategoriesEnumsAccessLevel,
        },
      },
      {
        onSuccess: () => {
          toast('Category updated', { variant: 'success' });
          navigate(`/principal/${principalId}/categories`);
        },
      },
    );
  }, [
    id,
    name,
    description,
    accessLevel,
    updateMutation,
    navigate,
    principalId,
  ]);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <PageSpinner title="Loading category..." />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-xl font-semibold">Not Found</p>
        <BaseButton
          variant="light"
          onPress={() => navigate(`/principal/${principalId}/categories`)}
        >
          Back to Categories
        </BaseButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div className="flex items-center gap-3">
        <BaseButton
          variant="light"
          onPress={() => navigate(`/principal/${principalId}/categories`)}
        >
          Back
        </BaseButton>
        <h1 className="text-2xl font-semibold">Edit Category</h1>
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
          label="Access level"
          selectedKey={accessLevel}
          onSelectionChange={keys => {
            const val = keys;
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
          onPress={handleSave}

          isDisabled={updateMutation.isPending || !name.trim()}
        >
          Save changes
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

export default withAuthenticationRequired(PrincipalCategoryEditPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
