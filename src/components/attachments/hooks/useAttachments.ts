import { requireHelpdeskApiBaseUrl } from '@/state/config';
import {
  createHelpdeskApiClient,
  createHelpdeskApiConfiguration,
} from '@/state/helpdeskApiClient';
import type { AttachmentDto, FileUploadProgress } from '@/types';
import { AttachmentsApi } from '@brainforgeau/helpdesk-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

const getApiBaseUrl = (): string => {
  return requireHelpdeskApiBaseUrl();
};

export const useAttachments = (ticketId?: string) => {
  const { data, isLoading, refetch } = useQuery<AttachmentDto[]>({
    queryKey: ['attachments', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];

      const client = await createHelpdeskApiClient(AttachmentsApi);
      const response = await client.v1AttachmentsTicketTicketIdGet(ticketId);
      const baseUrl = getApiBaseUrl();

      // Map backend DTO fields to frontend AttachmentDto
      return (response.data ?? []).map(item => ({
        id: item.id ?? '',
        fileName: item.fileName ?? '',
        fileSize: item.fileSizeBytes ?? 0,
        contentType: item.contentType ?? '',
        url: `${baseUrl}/v1/attachments/${item.id}`,
        uploadedById: item.uploadedByUserId ?? '',
        // REVIEW: uploadedByName is not on the generated AttachmentDto (backend
        // doesn't project the uploader's display name onto this DTO) — leaving
        // undefined until the backend adds it or the UI enriches by user id.
        uploadedByName: undefined,
        uploadedAt: item.createdAt ?? '',
        ticketId: item.ticketId ?? '',
        commentId: item.commentId ?? undefined,
      }));
    },
    enabled: Boolean(ticketId),
  });

  return {
    attachments: data ?? [],
    isLoading,
    refetch,
  };
};

export const useUploadAttachment = () => {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>(
    [],
  );

  const mutation = useMutation({
    mutationFn: async ({
      file,
      ticketId,
      commentId,
      isInlineImage = false,
    }: {
      file: File;
      ticketId?: string;
      commentId?: string;
      isInlineImage?: boolean;
    }) => {
      const client = await createHelpdeskApiClient(AttachmentsApi);

      // Update progress tracking
      setUploadProgress(prev => [
        ...prev,
        { fileName: file.name, progress: 0, status: 'uploading' },
      ]);

      try {
        // REVIEW: Using single upload endpoint with optional ticketId/commentId
        const response = await client.v1AttachmentsUploadPost(
          ticketId,
          file,
          commentId,
          isInlineImage,
          {
            onUploadProgress: (progressEvent: any) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total,
                );
                setUploadProgress(prev =>
                  prev.map(p =>
                    p.fileName === file.name
                      ? { ...p, progress: percentCompleted }
                      : p,
                  ),
                );
              }
            },
          },
        );

        // Mark as complete
        setUploadProgress(prev =>
          prev.map(p =>
            p.fileName === file.name
              ? { ...p, progress: 100, status: 'complete' }
              : p,
          ),
        );

        return response.data;
      } catch (error) {
        // Mark as error
        setUploadProgress(prev =>
          prev.map(p =>
            p.fileName === file.name
              ? {
                  ...p,
                  status: 'error',
                  error:
                    error instanceof Error ? error.message : 'Upload failed',
                }
              : p,
          ),
        );
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['attachments', variables.ticketId],
      });

      // Clear completed upload from progress after a delay
      setTimeout(() => {
        setUploadProgress(prev =>
          prev.filter(p => p.fileName !== variables.file.name),
        );
      }, 2000);
    },
  });

  const uploadFiles = useCallback(
    async (files: File[], ticketId?: string, commentId?: string) => {
      const uploads = files.map(file =>
        mutation.mutateAsync({ file, ticketId, commentId }),
      );
      return Promise.all(uploads);
    },
    [mutation],
  );

  return {
    uploadFile: mutation.mutateAsync,
    uploadFiles,
    uploadProgress,
    isUploading: mutation.isPending,
  };
};

export const useDownloadAttachment = () => {
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const client = await createHelpdeskApiClient(AttachmentsApi);

      // REVIEW: Backend returns presigned URL directly
      const response = await client.v1AttachmentsIdGet(attachmentId);
      const downloadUrl = response.data;

      if (downloadUrl) {
        // Trigger browser download
        window.open(downloadUrl as string, '_blank');
      }

      return response.data;
    },
  });
};

export const useDeleteAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const client = await createHelpdeskApiClient(AttachmentsApi);
      await client.v1AttachmentsIdDelete(attachmentId);
      return attachmentId;
    },
    onSuccess: () => {
      // REVIEW: Invalidate all attachment queries since we don't know which ticket
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
    },
  });
};
