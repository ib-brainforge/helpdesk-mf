import { HelpdeskPermissions as P } from '@/constants/permissions';
import { describe, expect, it, vi } from 'vitest';
import { ruleForPath } from './route-permissions';

// The table tests need no browser; the guard is tested in
// route-permissions.guard.test.tsx.
vi.mock('@brainforgeau/security', () => ({
  usePermissions: () => ({}),
}));

// Reading the knowledge base needs kb.read; authoring and settings need
// kb.manage.
describe('knowledge base route rules', () => {
  it.each([
    '/knowledge-base',
    '/knowledge-base/reset-your-password',
    '/knowledge-base/search',
    '/knowledge-base/category/getting-started',
  ])('%s needs kb.read', path => {
    expect(ruleForPath(path)?.anyOf).toEqual([P.KnowledgeBase.Read]);
  });

  it.each([
    '/knowledge-base/new',
    '/knowledge-base/reset-your-password/edit',
    '/knowledge-base/settings',
  ])('%s needs kb.manage', path => {
    expect(ruleForPath(path)?.anyOf).toEqual([P.KnowledgeBase.Manage]);
  });
});
