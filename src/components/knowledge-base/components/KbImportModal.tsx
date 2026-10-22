import { ModalHeader } from '@/components/shared';
import {
  BaseButton,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
} from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { type FC, useRef, useState } from 'react';
import { type KbImportResult, useImportKb } from '../hooks/useKnowledgeBase';

interface KbImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KbImportModal: FC<KbImportModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<KbImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportKb();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setResult(null);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    try {
      const importResult = await importMutation.mutateAsync(selectedFile);
      setResult(importResult);
    } catch {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const fileSizeMb = selectedFile
    ? (selectedFile.size / 1024 / 1024).toFixed(2)
    : null;

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} size="lg">
      <BaseModalContent>
        <ModalHeader>Import Knowledge Base</ModalHeader>
        <BaseModalBody>
          <div className="space-y-4">
            <p className="text-sm text-default-600">
              Upload a <strong>.zip</strong> or <strong>.json</strong> file to
              import KB categories and articles. Maximum file size: 10 MB.
            </p>

            {/* File picker */}
            <div
              className="border-2 border-dashed border-default-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={e =>
                e.key === 'Enter' && fileInputRef.current?.click()
              }
              role="button"
              tabIndex={0}
            >
              <Icon
                name="upload"
                className="h-8 w-8 text-default-400 mx-auto mb-2"
              />
              {selectedFile ? (
                <div>
                  <p className="font-medium text-default-700">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-default-500">{fileSizeMb} MB</p>
                </div>
              ) : (
                <div>
                  <p className="text-default-600">Click to select a file</p>
                  <p className="text-xs text-default-400 mt-1">
                    .zip or .json only, max 10 MB
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.json"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Import result */}
            {result && (
              <div
                className={`rounded-lg p-4 ${result.isPartial ? 'bg-warning-50 border border-warning-200' : 'bg-success-50 border border-success-200'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon
                    name={
                      result.isPartial ? 'exclamation-triangle' : 'check-circle'
                    }
                    className={`h-5 w-5 ${result.isPartial ? 'text-warning' : 'text-success'}`}
                  />
                  <span className="font-semibold text-sm">
                    {result.isPartial ? 'Partial import' : 'Import successful'}
                  </span>
                </div>
                <ul className="text-sm space-y-1 text-default-700">
                  <li>
                    Categories imported:{' '}
                    <strong>{result.categoriesImported}</strong>
                  </li>
                  <li>
                    Articles imported:{' '}
                    <strong>{result.articlesImported}</strong>
                  </li>
                </ul>
                {result.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-warning-700 mb-1">
                      Errors ({result.errors.length}):
                    </p>
                    <ul className="text-xs text-warning-800 space-y-0.5 max-h-32 overflow-y-auto">
                      {result.errors.map((err, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: stable list
                        <li key={i} className="truncate">
                          • {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton variant="bordered" color="light" onPress={handleClose}>
            {result ? 'Close' : 'Cancel'}
          </BaseButton>
          {!result && (
            <BaseButton
              color="primary"
              onPress={handleImport}
              isDisabled={
                importMutation.isPending ||
                !selectedFile ||
                importMutation.isPending
              }
            >
              Import
            </BaseButton>
          )}
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
