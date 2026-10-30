import {
  ProviderPermissions,
  createPlatformAccess,
} from '@brainforgeau/security/permissions/rootAccess';
import { describe, expect, it } from 'vitest';

// The provider guards use the flat usePermissions() check: the key is accepted
// from any app entry of the context token (the `provider` entry or the old
// `helpdesk` entry) and by elevated access. These pin the pieces that check
// relies on.
describe('provider.support access', () => {
  it('is spelled identically in the provider and old helpdesk entries', () => {
    expect(ProviderPermissions.Support).toBe('provider.support');
  });

  it.each([
    ['multitenant.admin', true],
    ['principal.admin', true],
    ['multitenant.read', false],
    ['support.access', false],
  ])('elevated bypass for role %s is %s', (role, elevated) => {
    expect(createPlatformAccess({ roles: [role] }).hasElevatedAccess).toBe(
      elevated,
    );
  });
});
