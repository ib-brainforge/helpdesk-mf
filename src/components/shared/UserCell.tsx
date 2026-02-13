import { BaseAvatar } from '@brainforgeau/components';
import type { UserInfo } from '@/hooks/useUserEnrichment';

interface UserCellProps {
  userInfo?: UserInfo | null;
  fallbackName?: string;
  fallbackEmail?: string;
}

export const UserCell: React.FC<UserCellProps> = ({
  userInfo,
  fallbackName = 'Unknown',
  fallbackEmail,
}) => {
  const displayName = userInfo?.name ?? fallbackName;
  const displayEmail = userInfo?.email ?? fallbackEmail;

  return (
    <div className="flex items-center gap-2">
      <BaseAvatar
        src={userInfo?.avatarUrl}
        name={displayName}
        size="sm"
      />
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {displayName}
        </span>
        {displayEmail && (
          <span className="text-xs text-muted-foreground">{displayEmail}</span>
        )}
      </div>
    </div>
  );
};
