import React from 'react';
import { PageSpinner } from '@brainforgeau/components';

import { configAtom, getAppConfig } from '@/state/config';
import { useAtomValue } from 'jotai';
import { FlexibleAuthProvider } from '@brainforgeau/security';

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
      loadingFallback={
        <div
          className="flex flex-1 h-screen bg-background justify-center items-center"
          data-loader="auth-provider"
        >
          <PageSpinner title="Loading..." />
        </div>
      }
    >
      {children}
    </FlexibleAuthProvider>
  );
};
