import { useRef, useState } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { BaseButton, Icon } from '@brainforgeau/components';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Card, CardContent, toast } from '@heroui/react';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { AdminImportExportApi } from '@brainforgeau/helpdesk-client';

const NOT_IMPLEMENTED_COPY =
  'This feature is coming in a future release. For immediate data migration or export needs, ' +
  'contact BrainForge support at support@brainforge.au — our team will work with you directly.';

function ImportExportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importFileName, setImportFileName] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFileName(file.name);
    }
  };

  const handleImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast('No file selected', { description: 'Please select a .zip file to import.', variant: 'warning' });
      return;
    }

    setIsImporting(true);
    try {
      const client = await createHelpdeskApiClient(AdminImportExportApi);
      await client.v1AdminImportPost(file);

      // Should not reach here — backend returns 501
      toast('Unexpected response', { description: 'Please contact support.', variant: 'warning' });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { detail?: string } } })?.response?.status;
      const detail = (err as { response?: { status?: number; data?: { detail?: string } } })?.response?.data?.detail;

      if (status === 501) {
        // Expected — endpoint is not yet implemented
        toast('Coming in a future release', { description: detail ?? NOT_IMPLEMENTED_COPY, variant: 'warning' });
      } else if (status === 400) {
        toast('Invalid file', { description: detail ?? 'Please upload a valid .zip archive.', variant: 'danger' });
      } else {
        toast('Error', { description: 'Something went wrong. Please try again or contact support.', variant: 'danger' });
      }
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
      setImportFileName(null);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const client = await createHelpdeskApiClient(AdminImportExportApi);
      await client.v1AdminExportGet();

      // Should not reach here — backend returns 501
      toast('Unexpected response', { description: 'Please contact support.', variant: 'warning' });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { detail?: string } } })?.response?.status;
      const detail = (err as { response?: { status?: number; data?: { detail?: string } } })?.response?.data?.detail;

      if (status === 501) {
        toast('Coming in a future release', { description: detail ?? NOT_IMPLEMENTED_COPY, variant: 'warning' });
      } else {
        toast('Error', { description: 'Something went wrong. Please try again or contact support.', variant: 'danger' });
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Import and Export - Helpdesk</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Administration', href: '/admin/settings' },
            { label: 'Import and Export', href: '/configuration/import-export', isCurrent: true },
          ]}
        />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Import and Export</h1>
        <p className="text-default-500 mt-1">
          Bulk import or export your helpdesk ticket data and configuration.
        </p>
      </div>

      {/* Honest deferral notice — not a "coming soon" stub, but an admission with a path forward */}
      <div className="mb-6 rounded-lg bg-warning-50 border border-warning-200 px-4 py-4 max-w-2xl">
        <div className="flex gap-3">
          <Icon name="information-circle" className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-warning-800">Self-service import/export is coming in a future release</p>
            <p className="text-sm text-warning-700 mt-1">
              The infrastructure for bulk data operations is in place, but the processing pipeline
              that handles large datasets safely (conflict resolution, schema migration, streaming
              downloads) is still being built.
            </p>
            <p className="text-sm text-warning-700 mt-2">
              For immediate needs — migrating from another system or extracting a full data copy —
              contact{' '}
              <a
                href="mailto:support@brainforge.au"
                className="font-medium underline hover:text-warning-900"
              >
                support@brainforge.au
              </a>
              . Our team will work with you directly.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl space-y-4">

        {/* Export card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                <Icon name="arrow-up-tray" className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold">Export tenant data</h2>
                <p className="text-sm text-default-500 mt-1">
                  Download a full export of your tickets, contacts, custom fields, and configuration
                  as a structured archive. Useful for backups or migrating to another platform.
                </p>
                <div className="mt-4">
                  <BaseButton
                    color="primary"
                    variant="bordered"
                    onPress={handleExport}
                    isDisabled={isExporting}
                    startContent={!isExporting ? <Icon name="arrow-down-tray" className="w-4 h-4" /> : undefined}
                  >
                    Request export
                  </BaseButton>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-success-50 flex items-center justify-center flex-shrink-0">
                <Icon name="arrow-down-tray" className="w-5 h-5 text-success-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold">Import tenant data</h2>
                <p className="text-sm text-default-500 mt-1">
                  Upload a .zip archive to import tickets and configuration into this tenant.
                  Only archives exported from BrainForge Helpdesk are supported.
                </p>

                {/* Hidden native file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  className="hidden"
                  onChange={handleFileSelect}
                  aria-label="Select .zip file to import"
                />

                <div className="mt-4 flex items-center gap-3">
                  <BaseButton
                    variant="bordered"
                    onPress={() => fileInputRef.current?.click()}
                    startContent={<Icon name="folder-open" className="w-4 h-4" />}
                  >
                    {importFileName ?? 'Select .zip file'}
                  </BaseButton>

                  {importFileName && (
                    <BaseButton
                      color="primary"
                      onPress={handleImport}
                      isDisabled={isImporting}
                      startContent={!isImporting ? <Icon name="arrow-up-tray" className="w-4 h-4" /> : undefined}
                    >
                      Upload and import
                    </BaseButton>
                  )}
                </div>

                {importFileName && (
                  <p className="text-xs text-default-400 mt-2">
                    Selected: <span className="font-mono">{importFileName}</span>
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </>
  );
}

export default ImportExportPage;
