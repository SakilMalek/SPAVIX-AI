import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="mb-8 flex justify-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          {icon}
        </div>
      </div>
      <h3 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">{title}</h3>
      <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-lg">{description}</p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
