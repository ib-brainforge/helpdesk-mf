import type { FC } from 'react';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import type { AttachmentDto } from '@/types';

interface AttachmentListProps {
  attachments: AttachmentDto[];
  onDelete?: (id: string) => void;
  canDelete?: boolean;
}

export const AttachmentList: FC<AttachmentListProps> = ({
  attachments,
  onDelete,
  canDelete = false,
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return 'photo';
    if (contentType.includes('pdf')) return 'document-text';
    if (contentType.includes('word')) return 'document';
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return 'table-cells';
    if (contentType.includes('zip') || contentType.includes('archive')) return 'archive-box';
    return 'document';
  };

  const isImagePreviewable = (contentType: string) => {
    return contentType.startsWith('image/');
  };

  if (attachments.length === 0) {
    return (
      <div className="rounded border border-dashed p-6 text-center text-gray-500">
        No attachments
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center gap-3 rounded border p-3 hover:bg-gray-50"
        >
          {isImagePreviewable(attachment.contentType) ? (
            <img
              src={attachment.url}
              alt={attachment.fileName}
              className="h-12 w-12 rounded object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-100">
              <Icon name={getFileIcon(attachment.contentType)} className="h-6 w-6 text-gray-600" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <a
              href={attachment.url}
              download={attachment.fileName}
              className="block truncate font-medium text-primary hover:underline"
            >
              {attachment.fileName}
            </a>
            <p className="text-xs text-gray-500">
              {formatFileSize(attachment.fileSize)} •{' '}
              {attachment.uploadedByName || 'Unknown'} •{' '}
              {new Date(attachment.uploadedAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex gap-2">
            <a
              href={attachment.url}
              download={attachment.fileName}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-gray-100"
            >
              <Icon name="arrow-down-tray" className="h-4 w-4" />
              Download
            </a>
            {canDelete && onDelete && (
              <BaseButton
                size="sm"
                variant="light"
                color="danger"
                onPress={() => onDelete(attachment.id)}
                icon={<Icon name="trash" className="h-4 w-4" />}
              >
                Delete
              </BaseButton>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
