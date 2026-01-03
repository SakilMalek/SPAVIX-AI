import { cn } from "@/lib/utils";

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-6 space-y-4", className)}>
      <div className="h-6 bg-muted rounded-md w-3/4 animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded-md animate-pulse" />
        <div className="h-4 bg-muted rounded-md w-5/6 animate-pulse" />
      </div>
      <div className="h-32 bg-muted rounded-md animate-pulse" />
    </div>
  );
}

export function TransformationCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="aspect-video bg-muted animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-muted rounded-md w-2/3 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-6 bg-muted rounded-full w-20 animate-pulse" />
          <div className="h-6 bg-muted rounded-full w-24 animate-pulse" />
        </div>
        <div className="h-4 bg-muted rounded-md w-1/3 animate-pulse" />
      </div>
    </div>
  );
}

export function HistoryPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-muted rounded-md w-1/3 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <TransformationCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CardSkeleton className="h-96" />
        <div className="h-96 bg-muted rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

export function FormFieldSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-4 bg-muted rounded-md w-1/4 animate-pulse" />
      <div className="h-10 bg-muted rounded-md animate-pulse" />
    </div>
  );
}
