// TODO: Replace with types from @brainforgeau/helpdesk-backend-client when available
// These types match the backend DTOs for File Uploads and Attachments

export interface AttachmentDto {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  url: string;
  uploadedById: string;
  uploadedByName?: string;
  uploadedAt: string;
  ticketId?: string;
  commentId?: string;
}

export interface CreateAttachmentDto {
  file: File;
  ticketId?: string;
  commentId?: string;
}

export interface FileUploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}
