import { useAttachmentBlobUrl } from '@/components/attachments/hooks/useAttachmentBlobUrl';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { AttachmentDto } from '@/types';
import { Icon } from '@brainforgeau/components/base';
import { AttachmentsApi } from '@brainforgeau/helpdesk-client';
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

/**
 * Download through the API client rather than a plain `<a href>`.
 *
 * Same reason the thumbnails had to change: a link navigation carries no
 * Authorization header, so the endpoint answered 401 and the "download" opened
 * an error page instead of a file.
 */
const downloadAttachment = async (attachment: AttachmentDto) => {
  const client = await createHelpdeskApiClient(AttachmentsApi);
  const response = await client.v1AttachmentsIdGet(attachment.id, {
    responseType: 'blob',
  });
  const objectUrl = URL.createObjectURL(response.data as unknown as Blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = attachment.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};

const AttachmentTile: FC<{
  attachment: AttachmentDto;
  onDelete?: (id: string) => void;
  canDelete: boolean;
}> = ({ attachment, onDelete, canDelete }) => {
  const isImage = attachment.contentType?.startsWith('image/');
  // Only images are fetched. Everything else draws an icon, so pulling the
  // bytes down would be a download nobody asked for.
  const { url: previewUrl, hasFailed } = useAttachmentBlobUrl(
    attachment.id,
    !!isImage,
  );

  // An image whose bytes could not be fetched falls back to the file-type icon.
  // A broken-image glyph tells the viewer nothing about what the file is.
  const showPreview = isImage && previewUrl && !hasFailed;

  return (
    <div
      className="group relative h-24 w-24 shrink-0 rounded-lg border border-default-200 dark:border-default-700 overflow-hidden cursor-pointer"
      title={attachment.fileName}
    >
      {showPreview ? (
        <img
          src={previewUrl}
          alt={attachment.fileName}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-default-50 dark:bg-default-800">
          <Icon
            name={getFileIcon(attachment.contentType, attachment.fileName)}
            className="h-12 w-12 text-default-400 dark:text-default-500"
          />
          <span className="mt-1 text-[11px] font-bold text-default-500 dark:text-default-400">
            {getFileExtLabel(attachment.fileName)}
          </span>
        </div>
      )}

      {/* Hover overlay with actions */}
      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            void downloadAttachment(attachment);
          }}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors"
          title="Download"
        >
          <Icon name="download" className="h-4 w-4" />
        </button>
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
    </div>
  );
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
      {attachments.map(attachment => (
        <AttachmentTile
          key={attachment.id}
          attachment={attachment}
          onDelete={onDelete}
          canDelete={canDelete}
        />
      ))}
    </div>
  );
};
