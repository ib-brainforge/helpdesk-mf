import { useState } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { BaseInput } from '@brainforgeau/components';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { useCannedResponses, useDeleteCannedResponse } from '@/components/canned-responses/hooks/useCannedResponses';
import { CannedResponseEditorModal } from '@/components/canned-responses/components/CannedResponseEditorModal';
import type { CannedResponseDto } from '@/types/canned-response';
import { addToast } from '@heroui/react';
import { CannedResponseScope } from '@/types/canned-response';

function CannedResponsesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<CannedResponseDto | undefined>();

  const { cannedResponses, isLoading } = useCannedResponses(undefined, searchTerm);
  const deleteMutation = useDeleteCannedResponse();

  const handleCreate = () => {
    setEditingResponse(undefined);
    setIsEditorOpen(true);
  };

  const handleEdit = (response: CannedResponseDto) => {
    setEditingResponse(response);
    setIsEditorOpen(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteMutation.mutateAsync(id);
        addToast({
          title: 'Deleted',
          description: 'Canned response deleted successfully',
          severity: 'success',
        });
      } catch (error) {
        addToast({
          title: 'Error',
          description: 'Failed to delete canned response',
          severity: 'danger',
        });
      }
    }
  };

  const handleExportCSV = () => {
    // REVIEW: Export functionality to be implemented
    addToast({
      title: 'Coming soon',
      description: 'CSV export will be available soon',
      severity: 'warning',
    });
  };

  const getScopeBadge = (scope: CannedResponseScope) => {
    const colors: Record<CannedResponseScope, string> = {
      [CannedResponseScope.Personal]: 'bg-default-100 text-default-800',
      [CannedResponseScope.Team]: 'bg-primary-100 text-primary-800',
      [CannedResponseScope.Global]: 'bg-secondary-100 text-secondary-800',
    };
    const labels: Record<CannedResponseScope, string> = {
      [CannedResponseScope.Personal]: 'Personal',
      [CannedResponseScope.Team]: 'Team',
      [CannedResponseScope.Global]: 'Global',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs ${colors[scope]}`}>
        {labels[scope]}
      </span>
    );
  };

  return (
    <>
      <Helmet>
        <title>Canned Responses - Helpdesk</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Configuration', href: '/configuration' },
            { label: 'Canned Responses', href: '/configuration/canned-responses', isCurrent: true },
          ]}
        />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Canned Responses</h1>
          <p className="text-default-500 mt-1">Manage pre-written responses for common questions</p>
        </div>
        <div className="flex gap-2">
          <BaseButton
            variant="bordered"
            onClick={handleExportCSV}
            icon={<Icon name="arrow-down-tray" className="h-4 w-4" />}
          >
            Export (CSV)
          </BaseButton>
          <BaseButton
            color="primary"
            onClick={handleCreate}
            icon={<Icon name="plus" className="h-4 w-4" />}
          >
            Create
          </BaseButton>
        </div>
      </div>

      <div className="mb-4">
        <BaseInput
          placeholder="Search canned responses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          startContent={<Icon name="magnifying-glass" className="h-4 w-4 text-default-400" />}
          className="max-w-md"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <span className="text-default-500">Loading...</span>
        </div>
      ) : cannedResponses.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-lg">
          <Icon name="document-text" className="h-12 w-12 text-default-300 mb-3" />
          <p className="text-default-500 mb-1">No canned responses yet</p>
          <p className="text-default-400 text-sm mb-4">Create your first canned response to get started</p>
          <BaseButton color="primary" onClick={handleCreate}>
            Create Canned Response
          </BaseButton>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-default-100 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold">Name</th>
                <th className="text-left px-4 py-3 text-sm font-semibold">Scope</th>
                <th className="text-left px-4 py-3 text-sm font-semibold">Category</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cannedResponses.map((response) => (
                <tr key={response.id} className="border-b hover:bg-default-50 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(response)}
                      className="text-primary hover:underline font-medium"
                    >
                      {response.title}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {getScopeBadge(response.scope as CannedResponseScope)}
                  </td>
                  <td className="px-4 py-3 text-sm text-default-600">
                    {response.categoryName || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(response)}
                        className="p-1 hover:bg-default-100 rounded"
                        title="Edit"
                      >
                        <Icon name="pencil" className="h-4 w-4 text-default-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(response.id!, response.title!)}
                        className="p-1 hover:bg-danger-50 rounded"
                        title="Delete"
                      >
                        <Icon name="trash" className="h-4 w-4 text-danger" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CannedResponseEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingResponse(undefined);
        }}
        cannedResponse={editingResponse}
      />
    </>
  );
}

export default CannedResponsesPage;
