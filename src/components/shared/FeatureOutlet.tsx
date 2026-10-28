import { Navigate, Outlet, useOutletContext } from '@modern-js/runtime/router';
import type { FC } from 'react';

interface FeatureOutletProps {
  /** A flag from constants/features.ts. */
  enabled: boolean;
  /** Where the section's URLs go while the feature is off. */
  fallback: string;
}

/**
 * The layout for a route section that belongs to a switchable feature. While
 * the feature is on it is a plain outlet (passing the parent's outlet context
 * through); while off, every URL in the
 * section redirects, so an old bookmark or link never opens a page whose data
 * is not wanted, and none of the section's pages mount or fetch.
 */
export const FeatureOutlet: FC<FeatureOutletProps> = ({
  enabled,
  fallback,
}) => {
  const context = useOutletContext();
  if (!enabled) return <Navigate to={fallback} replace />;
  return <Outlet context={context} />;
};
