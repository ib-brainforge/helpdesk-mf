/**
 * IT Support, the workspace's landing page: /it-support
 *
 * A placeholder until remote access to client PCs is built. Principal admins
 * only, enforced for the whole workspace by routes/layout.tsx (workspaces.ts).
 */
import { AppAuthSplash } from '@/components/AppSplash';
import { ItSupportComingSoon } from '@/components/it-support/ItSupportComingSoon';
import { withAuthenticationRequired } from '@/security';

function ItSupportPage() {
  return <ItSupportComingSoon breadcrumbsKey="it-support.overview" />;
}

export default withAuthenticationRequired(ItSupportPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
