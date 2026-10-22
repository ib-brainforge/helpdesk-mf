/**
 * IT Support, Remote sessions: /it-support/remote-sessions
 *
 * Will list remote sessions to client PCs. Until then, the same coming-soon
 * state as the landing page.
 */
import { AppAuthSplash } from '@/components/AppSplash';
import { ItSupportComingSoon } from '@/components/it-support/ItSupportComingSoon';
import { withAuthenticationRequired } from '@brainforgeau/security';

function RemoteSessionsPage() {
  return <ItSupportComingSoon breadcrumbsKey="it-support.remote-sessions" />;
}

export default withAuthenticationRequired(RemoteSessionsPage, {
  OnRedirecting: () => <AppAuthSplash />,
});
