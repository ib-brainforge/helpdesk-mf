import { IconHeadphones } from '@brainforgeau/components/icons/generated';

interface AppLoadingProps {
  message?: string;
}

export function AppLoading({ message }: AppLoadingProps) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-background">
      <div className="animate-pulse">
        <IconHeadphones className="h-16 w-16 text-[#6366F1]" fill="currentColor" />
      </div>
      {message && (
        <span className="text-sm text-gray-500 dark:text-gray-400">{message}</span>
      )}
    </div>
  );
}
