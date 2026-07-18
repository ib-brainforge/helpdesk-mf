/**
 * Principal create ticket page — /principal/[principalId]/tickets/new
 *
 * Create-on-behalf-of form for principal admins/agents.
 * W1-P8: Migrated from raw useState form to <FormPage> with useEntityForm.
 */

import { AppAuthSplash } from '@/components/AppSplash';
import { usePrincipal } from '@/hooks/usePrincipal';
import { useCreatePrincipalTicket } from '@/hooks/usePrincipalTickets';
import { BaseInput, BaseTextarea } from '@brainforgeau/components';
import {
  FormPage,
  PendingCrumb,
  useEntityForm,
} from '@brainforgeau/components/page';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useNavigate, useParams } from '@modern-js/runtime/router';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const principalTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  description: z.string(),
});

type PrincipalTicketFormData = z.infer<typeof principalTicketSchema>;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function NewPrincipalTicketPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const navigate = useNavigate();
  const { data: principal } = usePrincipal(principalId);
  const createMutation = useCreatePrincipalTicket(principalId!);

  const form = useEntityForm<typeof principalTicketSchema>({
    schema: principalTicketSchema,
    defaultValues: {
      subject: '',
      description: '',
    },
    onSubmit: async (values: PrincipalTicketFormData) => {
      await createMutation.mutateAsync({
        subject: values.subject,
        description: values.description,
      });
      navigate(`/principal/${principalId}/tickets`);
    },
    invalidateQueryKeys: [['principal-tickets', principalId]],
    toast: { success: 'Ticket created', error: 'Failed to create ticket' },
  });

  const f = form.form;

  return (
    <FormPage
      title="New Ticket"
      breadcrumbsKey="principal.tickets.new"
      breadcrumbsParams={{
        principalId: principalId!,
        principalName: principal?.name ?? PendingCrumb,
      }}
      form={form}
      onCancel={() => navigate(`/principal/${principalId}/tickets`)}
    >
      <FormPage.Section title="Ticket Details" columns={1}>
        <f.Field name="subject">
          {field => (
            <BaseInput
              label="Subject"
              isRequired
              placeholder="What is this ticket about?"
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
            />
          )}
        </f.Field>

        <f.Field name="description">
          {field => (
            <BaseTextarea
              label="Description"
              placeholder="Describe the issue..."
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              minRows={4}
              isInvalid={field.state.meta.errors.length > 0}
              errorMessage={field.state.meta.errors.map(String).join(', ')}
            />
          )}
        </f.Field>
      </FormPage.Section>
    </FormPage>
  );
}

export default withAuthenticationRequired(NewPrincipalTicketPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
