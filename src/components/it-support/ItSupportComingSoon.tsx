import { PageBreadcrumbs } from '@/components/Breadcrumbs';
import { workspaceForPath } from '@/workspaces';
import { EmptyState, PageBody } from '@brainforgeau/components/page';
import type { FC } from 'react';

const IT_SUPPORT = workspaceForPath('/it-support');
const ItSupportIcon = IT_SUPPORT.icon;

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
          <ItSupportIcon
            className="h-8 w-8 text-default-500"
            strokeWidth={1.5}
          />
        }
        title={IT_SUPPORT.label}
        description="Remote access to client PCs is coming here. Connect to a client's computer from a ticket and work on it securely."
      />
    </div>
  </PageBody>
);
