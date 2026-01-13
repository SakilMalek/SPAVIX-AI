import React from 'react';
import { useUsage } from '../../hooks/useSubscription';

interface UsageCounterProps {
  featureKey: string;
  label?: string;
  showPercentage?: boolean;
}

export function UsageCounter({ featureKey, label, showPercentage = true }: UsageCounterProps) {
  const usage = useUsage(featureKey);

  if (!usage) {
    return null;
  }

  const { used, limit, unlimited } = usage;

  if (unlimited) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">{label || featureKey}</span>
        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
          Unlimited
        </span>
      </div>
    );
  }

  const percentage = limit ? Math.round((used / limit) * 100) : 0;
  const isWarning = percentage > 80;
  const isCritical = percentage > 95;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label || featureKey}</span>
        <span className="text-sm text-gray-600">
          {used} / {limit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showPercentage && (
        <span className={`text-xs ${isCritical ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-gray-600'}`}>
          {percentage}% used
        </span>
      )}
    </div>
  );
}
