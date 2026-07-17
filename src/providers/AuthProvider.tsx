import type React from 'react';

import { AppLoading } from '@/components/AppLoading';
import { configAtom, getAppConfig } from '@/state/config';
import { FlexibleAuthProvider } from '@brainforgeau/security';
import { useAtomValue } from 'jotai';

declare const __HELPDESK_STANDALONE__: boolean;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const config = useAtomValue(configAtom);
  const appConfig = getAppConfig();
  // identity-management's own named key, resolved `rc ?? baked` in
  // src/state/config (which console.errors by name if it is missing).
  const identityBaseUrl = appConfig.identityApiBaseUrl;

  // pilot(shell-host): embedded mode is now first-class in
  // @brainforgeau/security (mf-packages PR #290). `detectEmbedded` makes
  // FlexibleAuthProvider force microfrontend mode when the shell host has
  // stamped window.__BF_SHELL_HOST__ === true, and AuthContextProvider now
  // tolerates a missing OIDC provider (separate-React-root safe). This
  // replaces the previous provider-less early-return workaround — the
  // embedded remote mounts a real auth React context again, booting from
  // the window auth bus owned by the shell instead of initializing its own
  // OIDC stack. Without the shell marker, behavior is identical to before:
  // the build-time mode logic below still decides shell vs microfrontend.
  return (
    <FlexibleAuthProvider
      mode={__HELPDESK_STANDALONE__ === true ? 'shell' : 'microfrontend'}
      detectEmbedded
      config={config}
      identityBaseUrl={identityBaseUrl}
      app="helpdesk"
      timeout={30000}
      loadingFallback={<AppLoading />}
    >
      {children}
    </FlexibleAuthProvider>
  );
};
