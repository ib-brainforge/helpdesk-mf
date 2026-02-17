import React, { useState } from 'react';
import { PageSpinner } from '@brainforgeau/components/base';
import { withAuthenticationRequired, usePermissions } from '@brainforgeau/security';
import { Tabs, Tab } from '@heroui/react';
import { UnifiedTicketGrid } from '@/components/tickets/components/UnifiedTicketGrid';
import { TenantViewerPanel } from '@/components/tickets/components/TenantViewerPanel';

/**
 * Unified Tickets Page with tabbed interface
 *
 * - "My Tickets" tab: Regular tenant tickets
 * - "Platform Tickets" tab: Platform-wide support tickets (requires helpdesk.platform.manage)
 * - "Tenant Viewer" tab: Admin cross-tenant viewer (requires elevated access)
 */
function TicketsPage() {
  const { hasPermission, hasElevatedAccess } = usePermissions();
  const [activeTab, setActiveTab] = useState<string>('regular');

  const hasPlatformManage = hasPermission('helpdesk.platform.manage');
  const hasTenantViewer = hasElevatedAccess;

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
          {hasPlatformManage && <Tab key="platform" title="Platform Tickets" />}
          {hasTenantViewer && <Tab key="tenant" title="Tenant Viewer" />}
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'regular' && <UnifiedTicketGrid source="regular" />}
        {activeTab === 'platform' && hasPlatformManage && <UnifiedTicketGrid source="platform" />}
        {activeTab === 'tenant' && hasTenantViewer && <TenantViewerPanel />}
      </div>
    </div>
  );
}

export default withAuthenticationRequired(TicketsPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
