import { Helmet } from '@modern-js/runtime/head';
import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { AssetEditorForm } from '@/components/assets';
import { Breadcrumbs } from '@/components/Breadcrumbs';

function NewAssetPage() {
  return (
    <>
      <Helmet>
        <title>Create New Asset</title>
      </Helmet>

      <div className="mb-5">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Assets', href: '/assets' },
            { label: 'Create New Asset', href: '/assets/new', isCurrent: true },
          ]}
        />

        <AssetEditorForm mode="create" />
      </div>
    </>
  );
}

export default withAuthenticationRequired(NewAssetPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
