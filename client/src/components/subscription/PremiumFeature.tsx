import React from 'react';
import { useCanUseFeature } from '../../hooks/useSubscription';
import { UpgradePrompt } from './UpgradePrompt';

interface PremiumFeatureProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PremiumFeature({ featureKey, children, fallback }: PremiumFeatureProps) {
  const { allowed, reason } = useCanUseFeature(featureKey);

  if (!allowed) {
    return fallback ? <>{fallback}</> : <UpgradePrompt reason={reason} />;
  }

  return <>{children}</>;
}
