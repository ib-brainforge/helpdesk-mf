import { CustomFieldsApi } from '@/api/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { useQuery } from '@tanstack/react-query';
import type { FC } from 'react';
import { answerText } from './request-answers';

interface Props {
  ticketId: string;
}

/**
 * The answers the requester gave to the category's questions when raising the
 * ticket (and any set since), read only.
 *
 * They are the ticket's custom field values, saved in the helpdesk that works
 * the ticket. Nothing shows when the ticket has none.
 */
export const RequestAnswersSection: FC<Props> = ({ ticketId }) => {
  const { data } = useQuery({
    queryKey: ['ticket-field-values', ticketId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(CustomFieldsApi);
      const { data } = await client.v1CustomFieldsValuesGet(ticketId, 'Ticket');
      return data ?? [];
    },
    enabled: !!ticketId,
  });
  const rows = (data ?? [])
    .map(v => ({
      id: v.customFieldDefinitionId,
      label: v.fieldName,
      text: answerText(v),
    }))
    .filter(r => r.text.trim().length > 0);

  if (rows.length === 0) return null;

  return (
    <div className="mb-4">
      <span className="mb-2 block text-sm font-medium text-default-700">
        Request details
      </span>
      <dl className="space-y-1.5">
        {rows.map(row => (
          <div key={row.id}>
            <dt className="text-xs text-default-500">{row.label}</dt>
            <dd className="text-sm break-words">{row.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};
