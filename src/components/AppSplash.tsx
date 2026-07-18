import { AuthSplash, LoadingSplash } from '@brainforgeau/components';
import type {
  AuthSplashProps,
  LoadingSplashProps,
} from '@brainforgeau/components/base';
import { IconHeadphones } from '@brainforgeau/components/icons/generated';

const appIcon = (
  <IconHeadphones className="h-16 w-16 text-[#6366F1]" fill="currentColor" />
);

export function AppAuthSplash(props: Omit<AuthSplashProps, 'logo'>) {
  return <AuthSplash logo={appIcon} {...props} />;
}

export function AppLoadingSplash(props: Omit<LoadingSplashProps, 'icon'>) {
  return <LoadingSplash icon={appIcon} {...props} />;
}
