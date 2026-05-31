import { I18nProvider, RouterProvider, ToastProvider } from '@heroui/react';
import { useHref, useNavigate } from '@modern-js/runtime/router';
import type React from 'react';

/**
 * HeroUI 3 migration: HeroUIProvider was removed in v3.
 * Replaced by composition of:
 *  - <I18nProvider locale=...> for locale handling
 *  - <RouterProvider navigate/useHref> for client-side routing integration
 *  - <ToastProvider /> for the toast queue
 *
 * Both I18nProvider and RouterProvider come from react-aria-components,
 * re-exported by @heroui/react.
 */
export function HeroProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <I18nProvider locale="en-AU">
      <RouterProvider navigate={navigate} useHref={useHref}>
        {children}
        <ToastProvider />
      </RouterProvider>
    </I18nProvider>
  );
}
