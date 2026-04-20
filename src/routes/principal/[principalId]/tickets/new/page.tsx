/**
 * Create ticket page — /principal/[principalId]/tickets/new
 *
 * Create-on-behalf-of form for principal admins/agents.
 */

import { useState } from 'react';
import { PageSpinner, BaseButton, BaseInput, BaseTextarea } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { useNavigate, useParams } from '@modern-js/runtime/router';
import { useCreatePrincipalTicket } from '@/hooks/usePrincipalTickets';
import { addToast } from '@heroui/react';

function NewPrincipalTicketPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const navigate = useNavigate();
  const createMutation = useCreatePrincipalTicket(principalId!);

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;

    try {
      await createMutation.mutateAsync({ subject, description });
      addToast({ title: 'Ticket created', color: 'success' });
      navigate(`/principal/${principalId}/tickets`);
    } catch {
      addToast({ title: 'Failed to create ticket', color: 'danger' });
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Ticket</h1>
        <BaseButton
          variant="light"
          size="sm"
          onPress={() => navigate(`/principal/${principalId}/tickets`)}
        >
          Cancel
        </BaseButton>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <BaseInput
          label="Subject"
          placeholder="What is this ticket about?"
          value={subject}
          onValueChange={setSubject}
          isRequired
        />
        <BaseTextarea
          label="Description"
          placeholder="Describe the issue..."
          value={description}
          onValueChange={setDescription}
          minRows={4}
        />
        <div className="flex justify-end">
          <BaseButton
            type="submit"
            color="primary"
            isDisabled={!subject.trim()}
            isLoading={createMutation.isPending}
          >
            Create Ticket
          </BaseButton>
        </div>
      </form>
    </div>
  );
}

export default withAuthenticationRequired(NewPrincipalTicketPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
