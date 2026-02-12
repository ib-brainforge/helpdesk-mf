/**
 * Test IDs for E2E testing
 *
 * Use these constants for data-testid attributes to ensure
 * consistent test selectors across the application.
 */

export const TEST_IDS = {
  navbar: {
    top: 'navbar-top',
    side: 'navbar-side',
  },
  dashboard: {
    page: 'dashboard-page',
  },
  configuration: {
    page: 'configuration-page',
    settings: {
      page: 'settings-page',
      table: 'settings-table',
      createButton: 'settings-create-button',
    },
  },
  appSettings: {
    page: 'app-settings-page',
    table: 'app-settings-table',
    createButton: 'app-settings-create-button',
    createModal: 'app-settings-create-modal',
    editModal: 'app-settings-edit-modal',
    deleteModal: 'app-settings-delete-modal',
  },
} as const;
