/**
 * Contact your provider: /contact-provider
 *
 * Raises a ticket in the office of this tenant's provider. The server works
 * out which office from the tenant, never from the request, and refuses it
 * where there is no provider above (the owner's own office), so the form is
 * not offered there. Other apps (the identity Relationships page, the navbar
 * help widget) link to this exact path.
 */

import { AppAuthSplash, AppLoadingSplash } from '@/components/AppSplash';
import {
  useProviderCategories,
  useProviderSupportContext,
  useRaiseTicketWithProvider,
} from '@/hooks/useProviderSupport';
import { TicketPriority } from '@/types/ticket';
import { toApiTicketPriority } from '@/utils/typeMappers';
import { RAISED_WITH_PROVIDER_PATH } from '@/views';
import {
  BaseButton,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  BaseTextarea,
} from '@brainforgeau/components';
import {
  EmptyState,
  FormPage,
  useEntityForm,
  usePageTitle,
} from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useNavigate } from '@modern-js/runtime/router';
import { z } from 'zod';

/** "Let the provider choose": no category is sent. */
const NO_CATEGORY = 'none';

const PRIORITIES = [
  TicketPriority.Low,
  TicketPriority.Normal,
  TicketPriority.High,
  TicketPriority.Critical,
] as const;

const contactSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required'),
  description: z.string(),
  priority: z.nativeEnum(TicketPriority),
  categoryId: z.string(),
});

function ContactProviderForm() {
  const navigate = useNavigate();
  const { data: categories = [], isLoading: categoriesLoading } =
    useProviderCategories();
  const raise = useRaiseTicketWithProvider();

  const form = useEntityForm<typeof contactSchema>({
    schema: contactSchema,
    defaultValues: {
      subject: '',
      description: '',
      priority: TicketPriority.Normal,
      categoryId: NO_CATEGORY,
    },
    onSubmit: async values => {
      const id = await raise.mutateAsync({
        subject: values.subject.trim(),
        description: values.description.trim() || undefined,
        priority: toApiTicketPriority(values.priority),
        categoryId:
          values.categoryId === NO_CATEGORY ? undefined : values.categoryId,
        referrerUrl: document.referrer || undefined,
      });
      navigate(`${RAISED_WITH_PROVIDER_PATH}/${id}`);
    },
    toast: {
      success: 'Request sent to your provider',
      error: "Couldn't send your request",
    },
  });
  const f = form.form;

  return (
    <FormPage
      title="Contact your provider"
      breadcrumbsKey="provider.contact"
      form={{
        ...form,
        formActions: {
          ...form.formActions,
          saveLabel: 'Contact your provider',
        },
      }}
      onCancel={() => navigate(RAISED_WITH_PROVIDER_PATH)}
    >
      <FormPage.Section
        title="Your request"
        description="This goes to your provider's helpdesk. You can follow it under Raised with our provider."
        columns={2}
      >
        <f.Field name="subject">
          {field => (
            <BaseInput
              label="Subject"
              isRequired
              className="md:col-span-2"
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
            />
          )}
        </f.Field>

        <f.Field name="categoryId">
          {field => (
            <BaseSelect
              label="Category"
              selectedKey={field.state.value}
              isDisabled={categoriesLoading}
              onSelectionChange={key => {
                if (key) field.handleChange(String(key));
              }}
            >
              {[
                <BaseSelectItem
                  key={NO_CATEGORY}
                  id={NO_CATEGORY}
                  textValue="Let the provider choose"
                >
                  Let the provider choose
                </BaseSelectItem>,
                ...categories.map(category => (
                  <BaseSelectItem
                    key={category.id}
                    id={category.id}
                    textValue={category.name}
                  >
                    {category.name}
                  </BaseSelectItem>
                )),
              ]}
            </BaseSelect>
          )}
        </f.Field>

        <f.Field name="priority">
          {field => (
            <BaseSelect
              label="Priority"
              selectedKey={field.state.value}
              onSelectionChange={key => {
                if (key) field.handleChange(String(key) as TicketPriority);
              }}
            >
              {PRIORITIES.map(priority => (
                <BaseSelectItem
                  key={priority}
                  id={priority}
                  textValue={priority}
                >
                  {priority}
                </BaseSelectItem>
              ))}
            </BaseSelect>
          )}
        </f.Field>

        <f.Field name="description">
          {field => (
            <BaseTextarea
              label="Description"
              placeholder="What do you need help with?"
              className="md:col-span-2"
              minRows={5}
              value={field.state.value}
              onValueChange={field.handleChange}
              onBlur={field.handleBlur}
            />
          )}
        </f.Field>
      </FormPage.Section>
    </FormPage>
  );
}

function ContactProviderPage() {
  usePageTitle('Contact your provider');
  const navigate = useNavigate();
  const { data: context, isLoading } = useProviderSupportContext();

  if (isLoading) return <AppLoadingSplash />;

  // The owner's own office has no provider above it.
  if (!context?.canContactProvider) {
    return (
      <div className="flex w-full flex-1 items-center justify-center p-6">
        <EmptyState
          title="There is no provider to contact"
          description="Your organisation doesn't have a provider above it, so there is nobody to send a request to from here."
          action={
            <BaseButton color="primary" onPress={() => navigate('/tickets')}>
              Back to tickets
            </BaseButton>
          }
        />
      </div>
    );
  }

  return <ContactProviderForm />;
}

export default withAuthenticationRequired(ContactProviderPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
