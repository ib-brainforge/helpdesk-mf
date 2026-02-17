import React, { useState } from 'react';
import { PageSpinner } from '@brainforgeau/components/base';
import { withAuthenticationRequired, usePermissions } from '@brainforgeau/security';
import { Tabs, Tab } from '@heroui/react';
import { TicketGrid } from '@/components/tickets/components/TicketGrid';
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
      <div className="shrink-0 px-6 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as string)}
          aria-label="Ticket views"
          variant="underlined"
          classNames={{
            tabList:
              'gap-0.5 relative rounded-none p-0 shadow-[inset_0_-1px_0_0_var(--color-white),inset_0_-3px_0_0_var(--color-light)]',
            cursor: 'w-full bg-blue',
            tab: 'max-w-fit h-11.5 px-1 md:px-5 font-medium text-sm relative z-10 span:text-blue !opacity-100 *:min-h-1 hover:*:!text-blue',
            tabContent: 'group-data-[selected=true]:text-blue',
            panel: 'p-0',
          }}
          color="primary"
        >
          <Tab key="regular" title="My Tickets" />
          {hasPlatformManage && <Tab key="platform" title="Platform Tickets" />}
          {hasTenantViewer && <Tab key="tenant" title="Tenant Viewer" />}
        </Tabs>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'regular' && <TicketGrid />}
        {activeTab === 'platform' && hasPlatformManage && <UnifiedTicketGrid source="platform" />}
        {activeTab === 'tenant' && hasTenantViewer && <TenantViewerPanel />}
      </div>
    </div>
  );
}

export default withAuthenticationRequired(TicketsPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
