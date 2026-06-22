import React from 'react';

export const NavbarSkeleton: React.FC = () => {
  return (
    <div className="border-light flex h-[54px] w-full animate-pulse border-b bg-white dark:bg-dark">
      <div className="flex flex-1 items-center gap-x-3 px-4">
        {/* Nav extender button skeleton */}
        <div className="h-5 w-5 rounded bg-default-200 dark:bg-default-700" />

        {/* Grids button skeleton */}
        <div className="h-7 w-7 rounded-md bg-default-200 dark:bg-default-700" />

        {/* Logo skeleton */}
        <div className="h-8 w-32 rounded bg-default-200 dark:bg-default-700" />
      </div>

      <div className="flex items-center gap-3 px-4">
        {/* Icon buttons skeleton */}
        <div className="hidden gap-3 lg:flex">
          <div className="h-6 w-6 rounded bg-default-200 dark:bg-default-700" />
          <div className="h-6 w-6 rounded bg-default-200 dark:bg-default-700" />
          <div className="h-6 w-6 rounded bg-default-200 dark:bg-default-700" />
          <div className="h-6 w-6 rounded bg-default-200 dark:bg-default-700" />
          <div className="mx-1.5 h-7 w-px bg-default-200 dark:bg-default-700" />
          <div className="h-6 w-6 rounded bg-default-200 dark:bg-default-700" />
          <div className="h-6 w-6 rounded bg-default-200 dark:bg-default-700" />
          <div className="h-6 w-6 rounded bg-default-200 dark:bg-default-700" />
        </div>

        {/* User avatar skeleton */}
        <div className="h-8 w-8 rounded-full bg-default-200 dark:bg-default-700" />
      </div>
    </div>
  );
};
