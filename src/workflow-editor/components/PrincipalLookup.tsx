// PrincipalLookup — displays principal name or a short-id stub.
// TODO(plan-7): wire to real principal lookup hook when available.

interface PrincipalLookupProps {
  principalId: string;
}

export function PrincipalLookup({ principalId }: PrincipalLookupProps) {
  // REVIEW: No usePrincipal hook found in helpdesk-mf — using short-id stub until Plan 7.
  const shortId = principalId.replace(/-/g, '').substring(0, 8);
  return (
    <span className="font-mono text-sm">
      Principal &bull; {shortId || principalId}
    </span>
  );
}
