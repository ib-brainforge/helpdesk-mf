import {
  type HelpdeskScope,
  getHelpdeskScopeToken,
  isNotLicensedError,
} from '@/api/local/scoped';
import { AppLoadingSplash } from '@/components/AppSplash';
import { useHelpdeskAccess } from '@/hooks/useHelpdeskAccess';
import { HelpdeskScopeContext } from '@/hooks/useHelpdeskScope';
import { useScopeNames } from '@/hooks/useScopeNames';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { BaseButton, Icon } from '@brainforgeau/components';
import { PrincipalTicketsApi } from '@brainforgeau/helpdesk-client';
import { useLocation, useNavigate } from '@modern-js/runtime/router';
import { useQuery } from '@tanstack/react-query';
import { type FC, type ReactNode, useMemo } from 'react';

/** What the list row puts in the navigation state when a ticket is opened. */
export interface TicketLinkState {
  tenantId?: string | null;
}

/**
 * A page-level message centred in the content area. The page outlet is a flex
 * row, so without w-full and flex-1 the message hugged the top-left corner.
 */
const PageState: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="mt-16 flex w-full flex-1 justify-center px-4">
    <div className="w-full max-w-[480px] text-center">{children}</div>
  </div>
);

/**
 * Shown instead of the ticket when its company does not have Helpdesk: identity
 * will not issue a Helpdesk token there, and the API refuses one.
 */
export const TicketNotEnabled: FC<{ tenantId?: string | null }> = ({
  tenantId,
}) => {
  const navigate = useNavigate();
  const { byTenantId } = useScopeNames();
  const company =
    (tenantId ? byTenantId.get(tenantId)?.tenantName : undefined) ??
    'this company';
  return (
    <PageState>
      <Icon name="lock" className="mx-auto mb-4 h-12 w-12 text-default-400" />
      <h2 className="mb-2 text-xl font-semibold">
        Helpdesk isn't enabled for {company}
      </h2>
      <p className="mb-4 text-default-600">
        Tickets for this company can't be opened until Helpdesk is licensed.
      </p>
      <BaseButton onPress={() => navigate('/tickets')}>
        Back to tickets
      </BaseButton>
    </PageState>
  );
};

/**
 * Runs the ticket page in the ticket's own company.
 *
 * The list can show every company's tickets (the all-companies view), but a
 * ticket's own calls are answered for the company in the context token. For
 * a ticket in another company this finds the company once, from the list row
 * (navigation state) or, on a direct link, the principal ticket lookup, and
 * has its Helpdesk token issued (cached per company, shared with the list's
 * bulk actions). Every hook on the page then reads that scope through
 * useHelpdeskScope. A ticket in the viewer's own company needs nothing extra
 * and runs exactly as before.
 *
 * Where Helpdesk is not licensed the token is refused. Principal staff then
 * get the ticket through the principal routes, limited to what those routes
 * cover (see TicketDetail's notice); anyone else gets a page saying so
 * instead of failing request by request.
 */
export const TicketScopeProvider: FC<{
  ticketId: string;
  children: ReactNode;
}> = ({ ticketId, children }) => {
  const location = useLocation();
  const fromList = (location.state as TicketLinkState | null)?.tenantId;
  const {
    isLoading: accessLoading,
    isServiceAdmin,
    principalId,
    tenantId: viewerTenantId,
  } = useHelpdeskAccess();

  // Only principal staff see other companies' tickets. Everyone else's
  // tickets are in their own company.
  const crossCompany = isServiceAdmin && !!principalId;

  const lookup = useQuery({
    queryKey: ['ticket-company', ticketId],
    enabled: crossCompany && !fromList && !!ticketId,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
    queryFn: async () => {
      const client = await createHelpdeskApiClient(PrincipalTicketsApi);
      const { data } = await client.v1PrincipalsPrincipalIdTicketsIdGet(
        principalId as string,
        ticketId,
      );
      // TicketDto carries TenantId; the generated type predates it.
      return (data as { tenantId?: string | null }).tenantId ?? null;
    },
  });

  const tenantId = crossCompany ? (fromList ?? lookup.data ?? null) : null;
  const scope = useMemo<HelpdeskScope | null>(
    () => (tenantId && tenantId !== viewerTenantId ? { tenantId } : null),
    [tenantId, viewerTenantId],
  );

  // The same company through the principal routes, for when Helpdesk is not
  // licensed there. Memoised so every hook sees one stable scope.
  const principalScope = useMemo<HelpdeskScope | null>(
    () =>
      scope && principalId ? { tenantId: scope.tenantId, principalId } : null,
    [scope, principalId],
  );

  const token = useQuery({
    queryKey: ['helpdesk-scope-token', scope?.tenantId],
    enabled: !!scope,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    // The token itself stays in the scoped client's cache; this only says
    // whether the company has one.
    queryFn: async () => {
      await getHelpdeskScopeToken(scope as HelpdeskScope);
      return true;
    },
  });

  if (accessLoading || (lookup.isLoading && lookup.fetchStatus !== 'idle')) {
    return <AppLoadingSplash />;
  }
  if (scope && token.isLoading) return <AppLoadingSplash />;
  if (scope && token.isError) {
    if (isNotLicensedError(token.error)) {
      // Netcorp staff still work and close these tickets, through the
      // principal routes (one switch in the scope: see HelpdeskScope).
      // Everyone else gets the not-enabled page.
      if (crossCompany && principalScope) {
        return (
          <HelpdeskScopeContext.Provider value={principalScope}>
            {children}
          </HelpdeskScopeContext.Provider>
        );
      }
      return <TicketNotEnabled tenantId={scope.tenantId} />;
    }
    return (
      <PageState>
        <Icon name="warning" className="mx-auto mb-4 h-12 w-12 text-danger" />
        <h2 className="mb-2 text-xl font-semibold">
          This ticket couldn't be opened
        </h2>
        <p className="mb-4 text-default-600">
          Its company couldn't be reached. Try again in a moment.
        </p>
        <BaseButton onPress={() => token.refetch()}>Try again</BaseButton>
      </PageState>
    );
  }

  return (
    <HelpdeskScopeContext.Provider value={scope}>
      {children}
    </HelpdeskScopeContext.Provider>
  );
};
