import type { FC } from 'react';
import { useCallback, useState } from 'react';
import { Icon } from '@brainforgeau/components/base';
import { Card, Progress } from '@heroui/react';
import type { FileUploadProgress } from '@/types';

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  multiple?: boolean;
  progress?: FileUploadProgress[];
}

export const FileUploadZone: FC<FileUploadZoneProps> = ({
  onFilesSelected,
  maxFileSize = 25 * 1024 * 1024, // 25MB default
  acceptedTypes = [],
  multiple = true,
  progress = [],
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = (files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (file.size > maxFileSize) {
        errors.push(`${file.name} exceeds maximum size of ${maxFileSize / 1024 / 1024}MB`);
        continue;
      }

      if (acceptedTypes.length > 0 && !acceptedTypes.some(type => file.type.includes(type))) {
        errors.push(`${file.name} has an unsupported file type`);
        continue;
      }

      valid.push(file);
    }

    return { valid, errors };
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setError(null);

      const files = Array.from(e.dataTransfer.files);
      const { valid, errors } = validateFiles(files);

      if (errors.length > 0) {
        setError(errors.join(', '));
      }

      if (valid.length > 0) {
        onFilesSelected(valid);
      }
    },
    [onFilesSelected, maxFileSize, acceptedTypes],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const files = e.target.files ? Array.from(e.target.files) : [];
      const { valid, errors } = validateFiles(files);

      if (errors.length > 0) {
        setError(errors.join(', '));
      }

      if (valid.length > 0) {
        onFilesSelected(valid);
      }

      // Reset input
      e.target.value = '';
    },
    [onFilesSelected, maxFileSize, acceptedTypes],
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed p-8 text-center transition-colors ${
          isDragOver
            ? 'border-primary bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-4">
          <Icon name="cloud-arrow-up" className="h-12 w-12 text-gray-400" />
          <div>
            <p className="text-lg font-medium">
              Drop files here or{' '}
              <label className="cursor-pointer text-primary hover:underline">
                browse
                <input
                  type="file"
                  multiple={multiple}
                  accept={acceptedTypes.join(',')}
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </label>
            </p>
            <p className="text-sm text-gray-500">
              Maximum file size: {formatFileSize(maxFileSize)}
            </p>
          </div>
        </div>
      </Card>

      {error && (
        <div className="rounded bg-danger-50 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {progress.length > 0 && (
        <div className="space-y-2">
          {progress.map((file) => (
            <div key={file.fileName} className="rounded border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium truncate">{file.fileName}</span>
                <span className="text-xs text-gray-500">{file.progress}%</span>
              </div>
              <Progress
                value={file.progress}
                color={file.status === 'error' ? 'danger' : 'primary'}
                size="sm"
              />
              {file.error && (
                <p className="mt-1 text-xs text-danger">{file.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
