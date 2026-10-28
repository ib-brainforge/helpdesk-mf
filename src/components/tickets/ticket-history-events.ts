/*
 * What a ticket History row says: one plain-English sentence and an icon per
 * event type. Pure, so it can be read and tested without the page.
 *
 * Event types and their `details` keys are agreed with Ben (the backend's
 * ticket history). The list is open ended: a type not handled here still
 * renders, as its humanised name ("DeadlinesRecalculated" reads "Deadlines
 * recalculated"), so the backend can add types without breaking the page.
 */
import type { TicketHistoryItemDto } from '@/api/local/ticket-history';

/** Names the backend does not send, resolved by the caller (batched). */
export interface HistoryNameLookup {
  user: (id: string) => string | undefined;
  company: (id: string) => string | undefined;
  organisation: (id: string) => string | undefined;
  /** An asset's name; the backend stores only the asset id. */
  asset: (id: string) => string | undefined;
  /** An ISO instant as the app shows it ("08/10/2026 4:12 pm"). */
  dateTime: (iso: string) => string;
  /** A deadline as the app shows it ("Fri 09/10 4:00 pm"). */
  deadline: (iso: string) => string;
}

export interface HistoryEventView {
  /** A heroicon name, as the shared Icon takes it. */
  icon: string;
  text: string;
}

/** "InProgress" reads "In Progress", "MarkedSpam" reads "Marked Spam". */
const words = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_.]+/g, ' ')
    .trim();

/** An enum value as a label: "InProgress" reads "In Progress". */
const label = (value: string | null | undefined): string =>
  value ? words(value) : 'none';

/** An event type as a sentence: "DeadlinesRecalculated" reads "Deadlines recalculated". */
export const humaniseEventType = (eventType: string): string => {
  const text = words(eventType).toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Ticket changed';
};

/** "Asset Hino 500 linked", or "Asset linked" when the name is missing. */
const named = (noun: string, name: string | undefined, verb: string): string =>
  name ? `${noun} ${name} ${verb}` : `${noun} ${verb}`;

/** "Sarah Chen <sarah@x.com>" reads "Sarah Chen"; a bare address stays. */
const person = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const match = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(value);
  return match ? match[1] || match[2] : value;
};

const shortId = (id: string | null | undefined): string =>
  id ? `#${id.slice(0, 8)}` : 'another ticket';

/**
 * "X changed from A to B", or "X set to B" and "X cleared" when one side is
 * empty, so a row never reads "from none".
 */
const change = (
  what: string,
  from: string | undefined,
  to: string | undefined,
): string => {
  if (from && to) return `${what} changed from ${from} to ${to}`;
  if (to) return `${what} set to ${to}`;
  if (from) return `${what} ${from} removed`;
  return `${what} changed`;
};

export const describeHistoryEvent = (
  item: TicketHistoryItemDto,
  names: HistoryNameLookup,
): HistoryEventView => {
  const d = item.details ?? {};
  const v = (key: string): string | undefined => d[key] ?? undefined;
  const user = (key: string): string | undefined => {
    const id = v(key);
    return id ? (names.user(id) ?? 'a former user') : undefined;
  };
  const asset = (): string | undefined => {
    const id = v('assetId');
    return id ? names.asset(id) : undefined;
  };
  const when = (key: string): string | undefined => {
    const iso = v(key);
    return iso ? names.dateTime(iso) : undefined;
  };

  switch (item.eventType) {
    case 'Created': {
      const via = v('origin') ? ` via ${label(v('origin'))}` : '';
      const priority = v('priority')
        ? `, ${label(v('priority'))} priority`
        : '';
      return {
        icon: 'PlusCircleIcon',
        text: `Ticket created${via}${priority}`,
      };
    }
    case 'StatusChanged': {
      const to = v('to');
      return {
        icon:
          to === 'Closed'
            ? 'CheckCircleIcon'
            : v('from') === 'Closed'
              ? 'ArrowUturnLeftIcon'
              : 'ArrowsRightLeftIcon',
        text: `Status changed from ${label(v('from'))} to ${label(to)}`,
      };
    }
    case 'PriorityChanged': {
      // The deadlines the change caused. Null once replied, without a policy
      // and on a closed ticket, so the clause only says what still applies.
      const reply = v('replyDueAt');
      const fix = v('fixDueAt');
      const r = reply ? names.deadline(reply) : '';
      const f = fix ? names.deadline(fix) : '';
      const clause =
        r && f
          ? `. Reply by now ${r}, fix by ${f}`
          : r
            ? `. Reply by now ${r}`
            : f
              ? `. Fix by now ${f}`
              : '';
      return {
        icon: 'FlagIcon',
        text: `Priority changed from ${label(v('from'))} to ${label(v('to'))}${clause}`,
      };
    }
    case 'Assigned': {
      const from = user('fromUserId');
      const to = user('toUserId');
      if (from && to)
        return {
          icon: 'UserPlusIcon',
          text: `Reassigned from ${from} to ${to}`,
        };
      if (to) return { icon: 'UserPlusIcon', text: `Assigned to ${to}` };
      if (from) return { icon: 'UserIcon', text: `Unassigned from ${from}` };
      return { icon: 'UserIcon', text: 'Assignee changed' };
    }
    case 'RequesterChanged':
      return {
        icon: 'UserCircleIcon',
        text: change('Requester', user('fromUserId'), user('toUserId')),
      };
    case 'CategoryChanged':
      return {
        icon: 'FolderIcon',
        text: change('Category', v('from'), v('to')),
      };
    case 'CompanyChanged': {
      const name = (key: string) => {
        const id = v(key);
        return id ? (names.company(id) ?? 'another tenant') : undefined;
      };
      return {
        icon: 'BuildingOfficeIcon',
        text: change('Tenant', name('fromId'), name('toId')),
      };
    }
    case 'OrganisationChanged': {
      const name = (key: string) => {
        const id = v(key);
        return id
          ? (names.organisation(id) ?? 'another organisation')
          : undefined;
      };
      return {
        icon: 'BuildingOffice2Icon',
        text: change('Organisation', name('fromId'), name('toId')),
      };
    }
    case 'DueDateChanged': {
      const from = when('from');
      const to = when('to');
      if (from && to)
        return {
          icon: 'CalendarIcon',
          text: `Due date changed from ${from} to ${to}`,
        };
      if (to) return { icon: 'CalendarIcon', text: `Due date set to ${to}` };
      return { icon: 'CalendarIcon', text: 'Due date cleared' };
    }
    case 'DeadlinesRecalculated': {
      const reply = when('replyDueAt');
      const fix = when('fixDueAt');
      const parts = [
        reply ? `reply by ${reply}` : '',
        fix ? `fix by ${fix}` : '',
      ].filter(Boolean);
      return {
        icon: 'ClockIcon',
        text: parts.length
          ? `Deadlines recalculated: ${parts.join(', ')}`
          : 'Deadlines recalculated',
      };
    }
    case 'SubjectChanged':
      return { icon: 'PencilSquareIcon', text: 'Subject edited' };
    case 'DescriptionChanged':
      return { icon: 'PencilSquareIcon', text: 'Description edited' };
    case 'TagAdded':
      return { icon: 'TagIcon', text: `Tag "${v('tag') ?? ''}" added` };
    case 'TagRemoved':
      return { icon: 'TagIcon', text: `Tag "${v('tag') ?? ''}" removed` };
    case 'AssetLinked':
      return {
        icon: 'TruckIcon',
        text: named('Asset', asset(), 'linked'),
      };
    case 'AssetUnlinked':
      return {
        icon: 'TruckIcon',
        text: named('Asset', asset(), 'unlinked'),
      };
    case 'AttachmentAdded':
      return {
        icon: 'PaperClipIcon',
        text: named('Attachment', v('fileName'), 'added'),
      };
    case 'AttachmentRemoved':
      return {
        icon: 'PaperClipIcon',
        text: named('Attachment', v('fileName'), 'removed'),
      };
    case 'EmailSent':
      return {
        icon: 'EnvelopeIcon',
        text: `Email reply sent to ${person(v('to')) ?? 'the contact'}`,
      };
    case 'EmailReceived':
      return {
        icon: 'EnvelopeOpenIcon',
        text: `Email received from ${person(v('from')) ?? 'the contact'}`,
      };
    case 'EmailFailed': {
      // No recipient when it never got that far (no mailbox, no contact).
      const to = person(v('to'));
      const reason = v('reason') ? ` (${v('reason')})` : '';
      return {
        icon: 'ExclamationTriangleIcon',
        text: to ? `Email to ${to} failed${reason}` : `Email not sent${reason}`,
      };
    }
    case 'CustomFieldChanged':
      return {
        icon: 'PencilSquareIcon',
        text: v('field') ? `${v('field')} changed` : 'Custom field changed',
      };
    case 'Forwarded':
      return {
        icon: 'ArrowUturnRightIcon',
        text: v('to') ? `Ticket forwarded to ${v('to')}` : 'Ticket forwarded',
      };
    case 'ForwardedToProvider': {
      const toId = v('toTenantId');
      const provider = toId ? names.company(toId) : undefined;
      return {
        icon: 'ArrowUturnRightIcon',
        text: provider
          ? `Ticket forwarded to provider ${provider}`
          : 'Ticket forwarded to the provider',
      };
    }
    case 'ContactChanged': {
      const to = person(v('to'));
      return {
        icon: 'UserCircleIcon',
        text: to
          ? `Contact changed to ${to}`
          : v('toContactId')
            ? 'Contact changed'
            : 'Contact removed',
      };
    }
    case 'ConfirmationEmailed':
      return {
        icon: 'EnvelopeIcon',
        text: `Confirmation emailed to ${person(v('to')) ?? 'the contact'}`,
      };
    case 'ConfirmationFailed': {
      // No recipient when it never got that far (no mailbox, no contact).
      const to = person(v('to'));
      const reason = v('reason') ? ` (${v('reason')})` : '';
      return {
        icon: 'ExclamationTriangleIcon',
        text: to
          ? `Confirmation email to ${to} failed${reason}`
          : `Confirmation email not sent${reason}`,
      };
    }
    case 'Merged':
      return {
        icon: 'ArrowsPointingInIcon',
        text: `Ticket ${shortId(v('otherTicketId'))} merged into this one`,
      };
    case 'MergedInto':
      return {
        icon: 'ArrowsPointingInIcon',
        text: `Merged into ticket ${shortId(v('otherTicketId'))}`,
      };
    case 'LinkAdded': {
      const type = v('linkType') ? ` (${label(v('linkType'))})` : '';
      return {
        icon: 'LinkIcon',
        text: `Linked to ticket ${shortId(v('otherTicketId'))}${type}`,
      };
    }
    case 'LinkRemoved':
      return {
        icon: 'LinkIcon',
        text: `Link to ticket ${shortId(v('otherTicketId'))} removed`,
      };
    case 'SubtaskCreated':
      return {
        icon: 'PlusCircleIcon',
        text: `Subtask ${shortId(v('otherTicketId'))} created`,
      };
    case 'MarkedSpam':
      return { icon: 'NoSymbolIcon', text: 'Marked as spam' };
    case 'UnmarkedSpam':
      return { icon: 'NoSymbolIcon', text: 'Spam mark removed' };
    case 'MarkedProblem':
      return { icon: 'BugAntIcon', text: 'Marked as a problem' };
    case 'UnmarkedProblem':
      return { icon: 'BugAntIcon', text: 'Problem mark removed' };
    case 'PublishedAsIdea':
      return { icon: 'LightBulbIcon', text: 'Published as an idea' };
    case 'UnpublishedAsIdea':
      return { icon: 'LightBulbIcon', text: 'Idea unpublished' };
    case 'Deleted':
      return { icon: 'TrashIcon', text: 'Ticket deleted' };
    case 'Restored':
      return { icon: 'ArrowUturnLeftIcon', text: 'Ticket restored' };
    default:
      return {
        icon: 'InformationCircleIcon',
        text: humaniseEventType(item.eventType),
      };
  }
};
