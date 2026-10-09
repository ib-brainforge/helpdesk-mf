import { PageBreadcrumbs } from '@/components/Breadcrumbs';
import { workspaceForPath } from '@/workspaces';
import { Icon } from '@brainforgeau/components/base';
import { EmptyState, PageBody } from '@brainforgeau/components/page';
import type { FC } from 'react';

const IT_SUPPORT = workspaceForPath('/it-support');

/**
 * The IT Support workspace's placeholder, shown by every page in it until
 * remote access to client PCs is built. Who may open these pages is checked
 * once for the whole workspace (workspaces.ts), not here.
 */
export const ItSupportComingSoon: FC<{ breadcrumbsKey: string }> = ({
  breadcrumbsKey,
}) => (
  <PageBody>
    <PageBreadcrumbs breadcrumbsKey={breadcrumbsKey} />
    <div className="flex min-h-[60vh] w-full flex-1 items-center justify-center p-6">
      <EmptyState
        size="lg"
        icon={
          <Icon name={IT_SUPPORT.icon} className="h-8 w-8 text-default-500" />
        }
        title={IT_SUPPORT.label}
        description="Remote access to client PCs is coming here. Connect to a client's computer from a ticket and work on it securely."
      />
    </div>
  </PageBody>
);
