import {
  Skeleton as LobeSkeleton,
  SkeletonParagraph,
  SkeletonAvatar,
  SkeletonTitle,
} from '@lobehub/ui';
import type { ReactNode } from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  circle?: boolean;
  children?: ReactNode;
}

export function Skeleton({ className = '', width, height, circle = false }: SkeletonProps) {
  if (circle) {
    return <SkeletonAvatar size={typeof width === 'number' ? width : 8} className={className} />;
  }
  return (
    <LobeSkeleton
      active
      paragraph={false}
      title={{ width: width ?? '100%', style: { height: typeof height === 'number' ? height : undefined } }}
      className={className}
    />
  );
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <SkeletonParagraph
      rows={lines}
      active
      className={className}
    />
  );
}

export function SkeletonTaskItem() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-lg">
      <SkeletonAvatar size={8} active />
      <div className="flex-1 flex flex-col gap-1.5">
        <SkeletonTitle style={{ width: '75%', height: 14 }} active />
        <SkeletonTitle style={{ width: '50%', height: 10 }} active />
      </div>
      <SkeletonTitle style={{ width: 40, height: 10 }} active />
    </div>
  );
}

export function SkeletonFeedItem() {
  return (
    <div className="flex flex-col gap-2 pl-6 py-2">
      <SkeletonTitle style={{ width: '33%', height: 14 }} active />
      <SkeletonParagraph rows={2} active />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border-light bg-surface px-5 py-4">
      <SkeletonTitle style={{ width: '60%', height: 14 }} active />
      <div className="mt-2">
        <SkeletonParagraph rows={2} active />
      </div>
    </div>
  );
}
