import React, { useState } from 'react';
import { useNavigate } from '@modern-js/runtime/router';
import { Card, CardBody, CardHeader, Input, Spinner } from '@heroui/react';
import { useTenantTicketsData } from '@/components/admin/hooks/useTenantViewer';

/**
 * Tenant Ticket Viewer Page
 *
 * For users with platform.admin role to view tickets from any tenant for debugging/support.
 */
export default function TenantViewerPage() {
  const navigate = useNavigate();
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const { items, totalCount, isLoading } = useTenantTicketsData(selectedTenantId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Tenant Ticket Viewer</h1>
        <p className="text-gray-600 mt-1">
          View tickets from any tenant for debugging and support purposes
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="w-full max-w-md">
            <Input
              label="Tenant ID"
              placeholder="Enter tenant GUID to view tickets"
              value={selectedTenantId ?? ''}
              onValueChange={(value: string) => setSelectedTenantId(value || null)}
              description="Enter the tenant's GUID to view their tickets"
            />
          </div>
        </CardHeader>
        <CardBody>
          {!selectedTenantId ? (
            <div className="text-center py-12 text-gray-500">
              <p>Enter a tenant ID above to view their tickets</p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No tickets found for this tenant</p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-600">
                Showing {items.length} of {totalCount} tickets
              </div>
              <div className="space-y-2">
                {items.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-gray-500">
                            {ticket.id?.substring(0, 8)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              ticket.status === 'New'
                                ? 'bg-blue-100 text-blue-800'
                                : ticket.status === 'InProgress'
                                ? 'bg-yellow-100 text-yellow-800'
                                : ticket.status === 'Closed'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {ticket.status?.replace('InProgress', 'In Progress')}
                          </span>
                          <span
                            className={`font-medium text-xs ${
                              ticket.priority === 'Critical'
                                ? 'text-red-600'
                                : ticket.priority === 'High'
                                ? 'text-orange-600'
                                : 'text-blue-600'
                            }`}
                          >
                            {ticket.priority}
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900 truncate">{ticket.subject}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span>Requester: {ticket.requesterName ?? 'Unknown'}</span>
                          <span>
                            Assigned: {ticket.assigneeName ?? <span className="text-gray-400">Unassigned</span>}
                          </span>
                          {ticket.createdAt && (
                            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
