import React, { useState } from 'react';
import { PageSpinner } from '@brainforgeau/components/base';
import { withAuthenticationRequired, useAuth } from '@brainforgeau/security';
import { Tabs, Tab } from '@heroui/react';
import { UnifiedTicketGrid } from '@/components/tickets/components/UnifiedTicketGrid';

/**
 * Unified Tickets Page with tabbed interface
 *
 * Phase 2: Frontend Unification
 * - "My Tickets" tab: Regular tenant tickets
 * - "Platform Tickets" tab: Platform-wide support tickets (visible to platform.support role)
 * - "Tenant Viewer" tab: Admin cross-tenant viewer (visible to platform.admin role)
 */
function TicketsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('regular');

  // Check role-based tab visibility
  const userRoles = user?.profile?.role ?? [];
  const hasPlatformSupport = Array.isArray(userRoles)
    ? userRoles.includes('platform.support')
    : userRoles === 'platform.support';
  const hasPlatformAdmin = Array.isArray(userRoles)
    ? userRoles.includes('platform.admin')
    : userRoles === 'platform.admin';

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-6 pt-6 pb-4">
        <h1 className="text-2xl font-semibold mb-4">Tickets</h1>
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as string)}
          aria-label="Ticket views"
        >
          <Tab key="regular" title="My Tickets" />
          {hasPlatformSupport && <Tab key="platform" title="Platform Tickets" />}
          {hasPlatformAdmin && <Tab key="tenant" title="Tenant Viewer" />}
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'regular' && <UnifiedTicketGrid source="regular" />}
        {activeTab === 'platform' && hasPlatformSupport && <UnifiedTicketGrid source="platform" />}
        {activeTab === 'tenant' && hasPlatformAdmin && (
          <div className="px-6">
            <p className="text-sm text-muted-foreground mb-4">
              Select a tenant to view their tickets:
            </p>
            {/* TODO: Add tenant dropdown selector and pass tenantId to UnifiedTicketGrid */}
            <p className="text-sm text-muted-foreground">Tenant viewer coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuthenticationRequired(TicketsPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
