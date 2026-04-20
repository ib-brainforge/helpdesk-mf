/**
 * Principal index page — redirects to /tickets.
 */

import { Navigate, useParams } from '@modern-js/runtime/router';

export default function PrincipalIndexPage() {
  const { principalId } = useParams<{ principalId: string }>();
  return <Navigate to={`/principal/${principalId}/tickets`} replace />;
}
