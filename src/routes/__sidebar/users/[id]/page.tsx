import { useParams } from '@modern-js/runtime/router';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from '@modern-js/runtime/head';
import { Suspense, useMemo, useState } from 'react';
import {
  PageSpinner,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  BaseTextarea,
} from '@brainforgeau/components';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { addToast, Switch } from '@heroui/react';
import { UsersApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { HelpdeskUserRole, type HelpdeskUserDto, type UpdateHelpdeskUserCommand } from '@/types/user';

const userFormSchema = z.object({
  role: z.nativeEnum(HelpdeskUserRole),
  signature: z.string().nullable().optional(),
  greeting: z.string().nullable().optional(),
  sendEmailNotifications: z.boolean(),
  categoryPermissionIds: z.array(z.string()).optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;

const ROLE_OPTIONS = [
  { id: HelpdeskUserRole.Customer, name: 'Customer' },
  { id: HelpdeskUserRole.Manager, name: 'Manager' },
  { id: HelpdeskUserRole.Technician, name: 'Technician' },
  { id: HelpdeskUserRole.Admin, name: 'Admin' },
];

function PageContent({ user, id }: { user: HelpdeskUserDto; id: string }) {
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      role: user.role,
      signature: user.signature || null,
      greeting: user.greeting || null,
      sendEmailNotifications: user.sendEmailNotifications,
      categoryPermissionIds: user.categoryPermissionIds || [],
    } as UserFormData,
    validators: {
      onChange: userFormSchema,
      onSubmit: userFormSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const client = await createHelpdeskApiClient(UsersApi);
        const updateDto: UpdateHelpdeskUserCommand = {
          role: value.role,
          signature: value.signature || undefined,
          greeting: value.greeting || undefined,
          sendEmailNotifications: value.sendEmailNotifications,
          categoryPermissionIds: value.categoryPermissionIds,
        };

        await client.v1UsersIdProfilePut(id, updateDto as any);
        addToast({ title: 'User updated', severity: 'success' });
        queryClient.invalidateQueries({ queryKey: ['helpdesk-users', id] });
        queryClient.invalidateQueries({ queryKey: ['helpdesk-users'] });
      } catch (error) {
        // Error handled by global axios interceptor
      }
    },
  });

  const formatFormErrors = (errors: any[]): string | undefined => {
    if (!errors || errors.length === 0) return undefined;
    return errors.map(e => (typeof e === 'string' ? e : e.message || String(e))).join(', ');
  };

  const [currentRole, setCurrentRole] = useState(user.role);
  const isTechnician = currentRole === HelpdeskUserRole.Technician;

  return (
    <>
      <Helmet>
        <title>User - {user.name || 'Unknown'}</title>
      </Helmet>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await form.handleSubmit();
        }}
      >
        <div className="mb-5">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Users', href: '/users' },
              {
                label: `User - ${user.name || 'Unknown'}`,
                href: `/users/${id}`,
                isCurrent: true,
              },
            ]}
          />

          <div className="mb-4.5 items-start gap-5 lg:flex">
            <h1 className="text-gray mb-2 flex-1 text-2xl font-semibold md:mb-0 dark:text-white">
              {user.name || 'Unknown User'}
            </h1>
            <div className="flex shrink-0 items-center justify-end gap-2.5 md:ml-auto">
              <BaseButton type="submit">Save</BaseButton>
              <BaseButton
                type="button"
                variant="bordered"
                size="sm"
                onClick={() => form.reset()}
              >
                Reset
              </BaseButton>
            </div>
          </div>

          <div className="flex w-full flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <form.Field name="role">
                {(field) => (
                  <BaseSelect
                    label="Role"
                    placeholder="Select role"
                    isRequired
                    selectedKeys={[String(field.state.value)]}
                    onSelectionChange={(keys) => {
                      const newValue = Number(keys.currentKey) as HelpdeskUserRole;
                      field.handleChange(newValue);
                      setCurrentRole(newValue);
                    }}
                    errorMessage={formatFormErrors(field.state.meta.errors)}
                    isInvalid={field.state.meta.errors.length > 0}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <BaseSelectItem key={String(role.id)}>{role.name}</BaseSelectItem>
                    ))}
                  </BaseSelect>
                )}
              </form.Field>

              <form.Field name="sendEmailNotifications">
                {(field) => (
                  <div className="flex items-center gap-3 pt-6">
                    <Switch
                      isSelected={field.state.value}
                      onValueChange={(checked) => field.handleChange(checked)}
                    >
                      Send Email Notifications
                    </Switch>
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <form.Field name="greeting">
                {(field) => (
                  <BaseTextarea
                    label="Greeting"
                    name={field.name}
                    value={field.state.value ?? ''}
                    onValueChange={(value) => field.handleChange(value || null)}
                    placeholder="Optional greeting message"
                    minRows={3}
                  />
                )}
              </form.Field>

              <form.Field name="signature">
                {(field) => (
                  <BaseTextarea
                    label="Signature"
                    name={field.name}
                    value={field.state.value ?? ''}
                    onValueChange={(value) => field.handleChange(value || null)}
                    placeholder="Optional email signature"
                    minRows={4}
                  />
                )}
              </form.Field>
            </div>

            {isTechnician && (
              <div className="border-t pt-4">
                <h2 className="text-lg font-semibold mb-3">Category Permissions</h2>
                <p className="text-sm text-default-500 mb-3">
                  Select categories this technician can access. Leave empty for all categories.
                </p>
                {/* TODO: Add category multi-select component when categories API is ready */}
                <div className="text-sm text-default-400">
                  Category permissions selector (to be implemented)
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </>
  );
}

const Page = () => {
  const { id } = useParams();

  const query = useQuery<HelpdeskUserDto | undefined>({
    queryKey: ['helpdesk-users', id],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(UsersApi);
      const { data } = await client.v1UsersIdGet(id as string);
      return data as unknown as HelpdeskUserDto;
    },
    enabled: Boolean(id),
  });

  if (query.isLoading || !id) {
    return <PageSpinner title="Loading..." />;
  }

  if (query.error || !query.data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Icon name="warning" className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          User not found
        </h2>
        <p className="text-muted-foreground mb-4">
          The user you're looking for doesn't exist or has been removed.
        </p>
        <BaseButton href="/users" variant="light">
          Back to Users
        </BaseButton>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageSpinner title="Loading..." />}>
      <PageContent key={query.dataUpdatedAt} user={query.data} id={id} />
    </Suspense>
  );
};

export default Page;
