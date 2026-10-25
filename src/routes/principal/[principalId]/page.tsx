/**
 * Principal index page — redirects to /tickets.
 */

import { usePageTitle } from '@brainforgeau/components/page';
import { Navigate, useParams } from '@modern-js/runtime/router';

export default function PrincipalIndexPage() {
  usePageTitle('Tickets');
  const { principalId } = useParams<{ principalId: string }>();
  return <Navigate to={`/principal/${principalId}/tickets`} replace />;
}
