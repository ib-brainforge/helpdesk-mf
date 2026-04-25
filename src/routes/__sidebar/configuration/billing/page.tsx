import { Helmet } from '@modern-js/runtime/head';
import { BaseButton, Icon } from '@brainforgeau/components';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Card, CardBody } from '@heroui/react';
import { getAppConfig } from '@/state/config';

/**
 * Billing settings page — helpdesk does not own billing.
 *
 * Billing is managed by the standalone billing service/app. This page acts as
 * a clear hand-off point: it displays the navigation context (breadcrumbs,
 * heading) and a single call-to-action to open the Billing app.
 *
 * billingBaseUrl is read from runtime config. Falls back to /billing which
 * resolves within the MF shell's app-switcher routing.
 */
function BillingPage() {
  const config = getAppConfig();
  const billingUrl: string = (config as any).billingBaseUrl ?? '/billing';

  return (
    <>
      <Helmet>
        <title>Billing - Helpdesk</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Administration', href: '/admin/settings' },
            { label: 'Billing', href: '/configuration/billing', isCurrent: true },
          ]}
        />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-default-500 mt-1">
          Manage your subscription, payment methods, and invoices.
        </p>
      </div>

      <div className="max-w-xl space-y-4">

        {/* Primary hand-off card */}
        <Card>
          <CardBody className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                <Icon name="credit-card" className="w-6 h-6 text-primary-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold">Billing is managed in the Billing app</h2>
                <p className="text-sm text-default-500 mt-1">
                  Your subscription plan, payment methods, usage limits, and invoice history
                  are all managed in the dedicated BrainForge Billing app — not within Helpdesk.
                </p>
                <p className="text-sm text-default-500 mt-2">
                  Changes made in the Billing app take effect across all BrainForge services,
                  including Helpdesk.
                </p>
                <div className="mt-4">
                  <BaseButton
                    color="primary"
                    as="a"
                    href={billingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    endContent={<Icon name="arrow-top-right-on-square" className="w-4 h-4" />}
                  >
                    Open Billing app
                  </BaseButton>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* What you'll find there */}
        <Card>
          <CardBody className="p-5">
            <h3 className="text-sm font-semibold mb-3">What you can manage in the Billing app</h3>
            <ul className="space-y-2">
              {[
                { icon: 'document-text', text: 'Current plan and feature limits' },
                { icon: 'arrow-path', text: 'Subscription renewal date and billing cycle' },
                { icon: 'credit-card', text: 'Payment methods and billing address' },
                { icon: 'receipt-percent', text: 'Invoice history and downloadable receipts' },
                { icon: 'arrow-trending-up', text: 'Plan upgrades and add-ons' },
              ].map(item => (
                <li key={item.text} className="flex items-center gap-3 text-sm text-default-600">
                  <Icon name={item.icon} className="w-4 h-4 text-default-400 flex-shrink-0" />
                  {item.text}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        {/* Support fallback */}
        <p className="text-xs text-default-400 px-1">
          Need help with your plan? Contact{' '}
          <a
            href="mailto:support@brainforge.au"
            className="underline hover:text-default-600"
          >
            support@brainforge.au
          </a>
          .
        </p>

      </div>
    </>
  );
}

export default BillingPage;
