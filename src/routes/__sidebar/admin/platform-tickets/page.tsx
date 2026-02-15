import React from 'react';
import { Card, CardBody, CardHeader, Checkbox, Spinner } from '@heroui/react';
import { usePlatformTicketsData } from '@/components/admin/hooks/usePlatformTickets';
import type { PlatformTicketStatus, PlatformTicketPriority } from '@/types/admin';

const statusStyles: Record<PlatformTicketStatus, string> = {
  Open: 'bg-blue-100 text-blue-800',
  InProgress: 'bg-yellow-100 text-yellow-800',
  Resolved: 'bg-green-100 text-green-800',
  Closed: 'bg-gray-100 text-gray-800',
};

const priorityStyles: Record<PlatformTicketPriority, string> = {
  Critical: 'text-red-600',
  High: 'text-orange-600',
  Medium: 'text-blue-600',
  Low: 'text-gray-600',
};

/**
 * Platform Tickets Management Page
 *
 * For users with platform.support role to view and manage all platform tickets across tenants.
 */
export default function PlatformTicketsPage() {
  const { items, totalCount, filters, setFilters, isLoading } = usePlatformTicketsData();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Platform Support Tickets</h1>
          <p className="text-gray-600 mt-1">
            Manage platform-wide support tickets across all tenants
          </p>
        </div>
        <Checkbox
          isSelected={filters.mine ?? false}
          onValueChange={(checked: boolean) => setFilters({ ...filters, mine: checked })}
        >
          My Tickets Only
        </Checkbox>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">All Platform Tickets ({totalCount})</h2>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No platform tickets found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((ticket) => (
                <div
                  key={ticket.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-gray-500">
                          {ticket.id?.substring(0, 8)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${statusStyles[ticket.status] ?? 'bg-gray-100 text-gray-800'}`}
                        >
                          {ticket.status === 'InProgress' ? 'In Progress' : ticket.status}
                        </span>
                        <span
                          className={`font-medium text-xs ${priorityStyles[ticket.priority] ?? 'text-gray-600'}`}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 truncate">{ticket.subject}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span>{ticket.submitterEmail}</span>
                        <span className="text-gray-400">|</span>
                        <span>Tenant: {ticket.submitterTenantName}</span>
                        {ticket.categoryName && (
                          <>
                            <span className="text-gray-400">|</span>
                            <span>{ticket.categoryName}</span>
                          </>
                        )}
                        <span className="text-gray-400">|</span>
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
