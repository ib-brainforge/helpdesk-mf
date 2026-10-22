import type { HelpdeskApplicationTicketsDTOsTicketLinkedEntityDto as LinkedEntity } from '@/api/helpdesk-client';
import type { FC } from 'react';
import { linkedEntityTypeLabel } from '../portal';

interface LinkedRecordsSectionProps {
  linkedEntities: readonly LinkedEntity[] | undefined;
}

/** Read-only list of the records a ticket is linked to (for example a consignment). */
export const LinkedRecordsSection: FC<LinkedRecordsSectionProps> = ({
  linkedEntities,
}) => {
  if (!linkedEntities || linkedEntities.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="block text-sm font-medium text-default-700 mb-1">
        Linked records
      </h3>
      <ul className="space-y-1">
        {linkedEntities.map(link => (
          <li key={link.id ?? `${link.entityType}-${link.entityId}`}>
            <span className="text-xs text-default-500">
              {linkedEntityTypeLabel(link.entityType)}
            </span>{' '}
            <span className="text-sm font-medium">
              {link.displayReference || link.entityId}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
