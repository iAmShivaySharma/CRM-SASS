/**
 * Enhanced Skeleton Loading Components
 *
 * Provides comprehensive skeleton loading patterns for different UI elements.
 * Fully responsive and follows design system patterns.
 */

import { cn } from '@/lib/utils'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}

// Card Skeleton
function CardSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border bg-card p-6 shadow-sm', className)}
      {...props}
    >
      <div className="space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>
      </div>
    </div>
  )
}

// Table Skeleton
function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
  ...props
}: {
  rows?: number
  columns?: number
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-3', className)} {...props}>
      {/* Header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

// Avatar Skeleton
function AvatarSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton className={cn('h-10 w-10 rounded-full', className)} {...props} />
  )
}

// Button Skeleton
function ButtonSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton className={cn('h-10 w-24 rounded-md', className)} {...props} />
  )
}

// Input Skeleton
function InputSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  )
}

// Form Skeleton
function FormSkeleton({
  fields = 3,
  className,
  ...props
}: {
  fields?: number
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-6', className)} {...props}>
      {Array.from({ length: fields }).map((_, i) => (
        <InputSkeleton key={i} />
      ))}
      <div className="flex justify-end space-x-2">
        <ButtonSkeleton className="w-20" />
        <ButtonSkeleton className="w-24" />
      </div>
    </div>
  )
}

// List Item Skeleton
function ListItemSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center space-x-4 p-4', className)}
      {...props}
    >
      <AvatarSkeleton />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <ButtonSkeleton className="h-8 w-16" />
    </div>
  )
}

// Stats Card Skeleton
function StatsCardSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border bg-card p-6 shadow-sm', className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
  )
}

// Page Header Skeleton
function PageHeaderSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-4 border-b pb-6', className)} {...props}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex space-x-2">
          <ButtonSkeleton />
          <ButtonSkeleton />
        </div>
      </div>
    </div>
  )
}

// Workspace Switcher Skeleton
function WorkspaceSwitcherSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-2 p-3', className)} {...props}>
      <Skeleton className="h-3 w-16" />
      <div className="flex items-center space-x-2 rounded-md p-2">
        <Skeleton className="h-4 w-4" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-4 w-4" />
      </div>
    </div>
  )
}

export {
  Skeleton,
  CardSkeleton,
  TableSkeleton,
  AvatarSkeleton,
  ButtonSkeleton,
  InputSkeleton,
  FormSkeleton,
  ListItemSkeleton,
  StatsCardSkeleton,
  PageHeaderSkeleton,
  WorkspaceSwitcherSkeleton,
}
