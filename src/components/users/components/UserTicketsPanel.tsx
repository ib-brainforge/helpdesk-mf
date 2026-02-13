import { useQuery } from '@tanstack/react-query';
import { TicketsApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { TicketListDto } from '@/types/ticket';
import { NavLink } from '@modern-js/runtime/router';
import { Tabs, Tab } from '@heroui/react';
import { StatusBadge } from '@/components/shared';
import { useState } from 'react';
import { PageSpinner } from '@brainforgeau/components';

interface UserTicketsPanelProps {
  userId: string;
}

// REVIEW: Helper function to get status chip color
const getStatusColor = (status?: string) => {
  const colors: Record<string, 'default' | 'primary' | 'success' | 'warning'> = {
    New: 'primary',
    InProgress: 'warning',
    Closed: 'success',
  };
  return colors[status ?? 'New'] || 'default';
};

// REVIEW: Helper function to get priority chip color
const getPriorityColor = (priority?: string) => {
  const colors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
    None: 'default',
    Low: 'success',
    Normal: 'primary',
    High: 'warning',
    Critical: 'danger',
  };
  return colors[priority ?? 'Normal'] || 'default';
};

export const UserTicketsPanel: React.FC<UserTicketsPanelProps> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState<'submitted' | 'assigned'>('submitted');

  // Query for submitted tickets (where user is requester)
  const submittedQuery = useQuery<TicketListDto[]>({
    queryKey: ['user-tickets-submitted', userId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(TicketsApi);
      const { data } = await client.v1TicketsGet(
        undefined, // status
        undefined, // priority
        undefined, // categoryId
        undefined, // assigneeId
        userId, // requesterId
        undefined, // searchTerm
        undefined, // unreadOnly
        1, // page
        10 // pageSize - show last 10 tickets
      );
      return (data.items ?? []) as unknown as TicketListDto[];
    },
    enabled: activeTab === 'submitted',
  });

  // Query for assigned tickets (where user is assignee)
  const assignedQuery = useQuery<TicketListDto[]>({
    queryKey: ['user-tickets-assigned', userId],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(TicketsApi);
      const { data } = await client.v1TicketsGet(
        undefined, // status
        undefined, // priority
        undefined, // categoryId
        userId, // assigneeId
        undefined, // requesterId
        undefined, // searchTerm
        undefined, // unreadOnly
        1, // page
        10 // pageSize - show last 10 tickets
      );
      return (data.items ?? []) as unknown as TicketListDto[];
    },
    enabled: activeTab === 'assigned',
  });

  const currentQuery = activeTab === 'submitted' ? submittedQuery : assignedQuery;
  const tickets = currentQuery.data ?? [];

  return (
    <div className="rounded-lg border border-default-200 bg-white dark:bg-gray-800">
      <div className="border-b border-default-200 p-4">
        <h2 className="text-lg font-semibold text-foreground">Ticket History</h2>
      </div>

      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as 'submitted' | 'assigned')}
        className="px-4 pt-2"
        variant="underlined"
      >
        <Tab key="submitted" title="Submitted Tickets" />
        <Tab key="assigned" title="Assigned Tickets" />
      </Tabs>

      <div className="p-4">
        {currentQuery.isLoading ? (
          <div className="py-8">
            <PageSpinner title="Loading tickets..." />
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-8 text-center text-sm text-default-500">
            No {activeTab === 'submitted' ? 'submitted' : 'assigned'} tickets found
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <NavLink
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="block rounded-lg border border-default-200 p-3 transition-colors hover:border-primary hover:bg-default-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {ticket.subject || 'Untitled Ticket'}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-default-500">
                      <span>#{ticket.id?.slice(0, 8)}</span>
                      {ticket.categoryName && (
                        <>
                          <span>•</span>
                          <span>{ticket.categoryName}</span>
                        </>
                      )}
                      {ticket.createdAt && (
                        <>
                          <span>•</span>
                          <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge
                      color={getPriorityColor(ticket.priority)}
                    >
                      {ticket.priority || 'Normal'}
                    </StatusBadge>
                    <StatusBadge
                      color={getStatusColor(ticket.status)}
                    >
                      {ticket.status || 'New'}
                    </StatusBadge>
                  </div>
                </div>
              </NavLink>
            ))}
          </div>
        )}
      </div>

      {tickets.length > 0 && (
        <div className="border-t border-default-200 p-4 text-center">
          <NavLink
            to="/tickets"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all tickets →
          </NavLink>
        </div>
      )}
    </div>
  );
};
