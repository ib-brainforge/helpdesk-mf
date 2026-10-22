import { AccessDenied } from '@brainforgeau/security';
import type { FC } from 'react';

/** Every Tenant Deadlines page, for anyone but Netcorp's helpdesk admins. */
export const DeadlinesAccessDenied: FC = () => (
  <div className="flex min-h-[60vh] w-full flex-1 items-center justify-center p-6">
    <AccessDenied
      title="You don't have access to this page"
      message="Tenant deadlines are set by Netcorp's helpdesk admins."
    />
  </div>
);
