import { useState, useMemo } from 'react';
import { BaseInput, BaseModal } from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { Icon } from '@brainforgeau/components/base';
import { Chip } from '@heroui/react';
import { useCannedResponses } from '../hooks';
import type { CannedResponseDto } from '@/types/canned-response';
import { CannedResponseScope } from '@/types/canned-response';

interface CannedResponsePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (response: CannedResponseDto) => void;
  categoryId?: string;
}

const getScopeColor = (scope: CannedResponseScope) => {
  const colors: Record<CannedResponseScope, 'default' | 'primary' | 'secondary'> = {
    [CannedResponseScope.Personal]: 'default',
    [CannedResponseScope.Team]: 'primary',
    [CannedResponseScope.Global]: 'secondary',
  };
  return colors[scope] || 'default';
};

const getScopeName = (scope: CannedResponseScope): string => {
  const names: Record<CannedResponseScope, string> = {
    [CannedResponseScope.Personal]: 'Personal',
    [CannedResponseScope.Team]: 'Team',
    [CannedResponseScope.Global]: 'Global',
  };
  return names[scope] || 'Unknown';
};

export const CannedResponsePicker: React.FC<CannedResponsePickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  categoryId,
}) => {
  const { cannedResponses, isLoading } = useCannedResponses(categoryId);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResponse, setSelectedResponse] = useState<CannedResponseDto | null>(null);

  const filteredResponses = useMemo(() => {
    if (!searchTerm) return cannedResponses;

    const lowerSearch = searchTerm.toLowerCase();
    return cannedResponses.filter((response) => {
      const title = response.title?.toLowerCase() ?? '';
      const body = response.body?.toLowerCase() ?? '';
      return title.includes(lowerSearch) || body.includes(lowerSearch);
    });
  }, [cannedResponses, searchTerm]);

  const handleSelect = (response: CannedResponseDto) => {
    onSelect(response);
    onClose();
    setSearchTerm('');
    setSelectedResponse(null);
  };

  const handlePreview = (response: CannedResponseDto) => {
    setSelectedResponse(response);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Insert Canned Response"
      size="3xl"
    >
      <div className="flex flex-col gap-4">
        <BaseInput
          placeholder="Search canned responses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          startContent={<Icon name="magnifying-glass" className="h-4 w-4 text-default-400" />}
        />

        <div className="flex gap-4" style={{ height: '400px' }}>
          {/* List of responses */}
          <div className="flex-1 overflow-y-auto border rounded-lg p-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-default-500">Loading...</span>
              </div>
            ) : filteredResponses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Icon name="document-text" className="h-12 w-12 text-default-300 mb-2" />
                <p className="text-default-500 text-sm">No canned responses found</p>
                {searchTerm && (
                  <p className="text-default-400 text-xs mt-1">
                    Try adjusting your search
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredResponses.map((response) => (
                  <div
                    key={response.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedResponse?.id === response.id
                        ? 'bg-primary-50 dark:bg-primary-100/10 border-primary-200 dark:border-primary-800'
                        : 'bg-content1 border-divider hover:bg-content2'
                    }`}
                    onClick={() => handlePreview(response)}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium text-sm">{response.title}</span>
                      <Chip
                        color={getScopeColor(response.scope as any)}
                        variant="flat"
                        size="sm"
                      >
                        {getScopeName(response.scope as any)}
                      </Chip>
                    </div>
                    {response.categoryName && (
                      <div className="text-xs text-default-500">
                        Category: {response.categoryName}
                      </div>
                    )}
                    <div className="text-xs text-default-400 mt-1 line-clamp-2">
                      {response.body?.replace(/<[^>]*>/g, '') ?? ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview panel */}
          <div className="flex-1 border rounded-lg p-4 overflow-y-auto bg-content1">
            {selectedResponse ? (
              <>
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{selectedResponse.title}</h3>
                    <Chip
                      color={getScopeColor(selectedResponse.scope as any)}
                      variant="flat"
                      size="sm"
                    >
                      {getScopeName(selectedResponse.scope as any)}
                    </Chip>
                  </div>
                  {selectedResponse.categoryName && (
                    <div className="text-xs text-default-500 mb-2">
                      Category: {selectedResponse.categoryName}
                    </div>
                  )}
                </div>
                <div className="border-t pt-3">
                  <h4 className="text-xs font-semibold text-default-500 mb-2">PREVIEW</h4>
                  <div
                    className="text-sm prose prose-sm max-w-none dark:prose-invert"
                    // REVIEW: Using dangerouslySetInnerHTML for HTML preview
                    dangerouslySetInnerHTML={{ __html: selectedResponse.body ?? '' }}
                  />
                </div>
                <div className="mt-4 pt-4 border-t">
                  <BaseButton
                    onPress={() => handleSelect(selectedResponse)}
                    className="w-full"
                  >
                    Insert Response
                  </BaseButton>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Icon name="eye" className="h-12 w-12 text-default-300 mb-2" />
                <p className="text-default-500 text-sm">Select a response to preview</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <BaseButton variant="bordered" onPress={onClose}>
            Cancel
          </BaseButton>
        </div>
      </div>
    </BaseModal>
  );
};
