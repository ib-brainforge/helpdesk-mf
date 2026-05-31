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
  const identityBaseUrl = appConfig?.identityBaseUrl || '';

  return (
    <FlexibleAuthProvider
      mode={__HELPDESK_STANDALONE__ === true ? 'shell' : 'microfrontend'}
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
