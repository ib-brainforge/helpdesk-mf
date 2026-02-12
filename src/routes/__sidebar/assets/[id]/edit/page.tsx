import { useParams } from '@modern-js/runtime/router';
import { Helmet } from '@modern-js/runtime/head';
import { Suspense } from 'react';
import { PageSpinner } from '@brainforgeau/components';
import { withAuthenticationRequired } from '@brainforgeau/security';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { AssetEditorForm } from '@/components/assets';
import { useAsset } from '@/components/assets/hooks/useAssets';
import { Breadcrumbs } from '@/components/Breadcrumbs';

function EditAssetPageContent({ id }: { id: string }) {
  const { data: asset, isLoading, error } = useAsset(id);

  if (isLoading) {
    return <PageSpinner title="Loading asset..." />;
  }

  if (error || !asset) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Icon name="warning" className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Asset not found
        </h2>
        <p className="text-muted-foreground mb-4">
          The asset you're looking for doesn't exist or has been removed.
        </p>
        <BaseButton href="/assets" variant="light">
          Back to Assets
        </BaseButton>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Edit Asset - {asset.name}</title>
      </Helmet>

      <div className="mb-5">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Assets', href: '/assets' },
            { label: asset.name, href: `/assets/${id}/edit`, isCurrent: true },
          ]}
        />

        <AssetEditorForm mode="edit" asset={asset} />
      </div>
    </>
  );
}

function EditAssetPage() {
  const { id } = useParams();

  if (!id) {
    return <PageSpinner title="Loading..." />;
  }

  return (
    <Suspense fallback={<PageSpinner title="Loading..." />}>
      <EditAssetPageContent id={id} />
    </Suspense>
  );
}

export default withAuthenticationRequired(EditAssetPage, {
  OnRedirecting: () => <PageSpinner title="Loading..." />,
});
