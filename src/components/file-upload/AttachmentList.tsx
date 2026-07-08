import type { AttachmentDto } from '@/types';
import { Icon } from '@brainforgeau/components/base';
import type { FC } from 'react';

interface AttachmentListProps {
  attachments: AttachmentDto[];
  onDelete?: (id: string) => void;
  canDelete?: boolean;
}

const getFileIcon = (contentType: string, fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (contentType.startsWith('image/')) return 'img';
  if (contentType.includes('pdf') || ext === 'pdf') return 'pdf';
  if (contentType.includes('word') || ext === 'doc' || ext === 'docx')
    return 'doc';
  if (
    contentType.includes('excel') ||
    contentType.includes('spreadsheet') ||
    ext === 'xlsx' ||
    ext === 'xls' ||
    ext === 'csv'
  )
    return 'table';
  return 'blank';
};

const getFileExtLabel = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toUpperCase();
  return ext || 'FILE';
};

export const AttachmentList: FC<AttachmentListProps> = ({
  attachments,
  onDelete,
  canDelete = false,
}) => {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {attachments.map(attachment => {
        const isImage = attachment.contentType?.startsWith('image/');

        return (
          <div
            key={attachment.id}
            className="group relative h-24 w-24 shrink-0 rounded-lg border border-default-200 dark:border-default-700 overflow-hidden cursor-pointer"
            title={attachment.fileName}
          >
            {/* Preview content */}
            {isImage ? (
              <img
                src={attachment.url}
                alt={attachment.fileName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-default-50 dark:bg-default-800">
                <Icon
                  name={getFileIcon(
                    attachment.contentType,
                    attachment.fileName,
                  )}
                  className="h-12 w-12 text-default-400 dark:text-default-500"
                />
                <span className="mt-1 text-[11px] font-bold text-default-500 dark:text-default-400">
                  {getFileExtLabel(attachment.fileName)}
                </span>
              </div>
            )}

            {/* Hover overlay with actions */}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors"
                title="Download"
                onClick={e => e.stopPropagation()}
              >
                <Icon name="download" className="h-4 w-4" />
              </a>
              {canDelete && onDelete && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onDelete(attachment.id);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-red-500/80 transition-colors"
                  title="Delete"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* File name tooltip strip at bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <p className="truncate text-[9px] text-white text-center">
                {attachment.fileName}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
