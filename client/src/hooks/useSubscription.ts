import { useContext } from 'react';
import { SubscriptionContext } from '../context/SubscriptionContext';

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
}

export function useFeature(featureKey: string) {
  const { features } = useSubscription();
  return features[featureKey] || false;
}

export function useUsage(featureKey: string) {
  const { usage } = useSubscription();
  return usage[featureKey] || null;
}

export function usePlan() {
  const { subscription } = useSubscription();
  return subscription?.plan || null;
}

export function useCanUseFeature(featureKey: string): { allowed: boolean; reason?: string } {
  const { subscription } = useSubscription();

  if (!subscription) {
    return { allowed: false, reason: 'No active subscription' };
  }

  const features = subscription.plan.features as Record<string, boolean>;
  if (!features[featureKey]) {
    return { allowed: false, reason: `Feature not included in ${subscription.plan.name} plan` };
  }

  return { allowed: true };
}

export function useHasQuota(featureKey: string, amount: number = 1): {
  allowed: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
} {
  const { usage } = useSubscription();
  const usageData = usage[featureKey];

  if (!usageData) {
    return { allowed: false, used: 0, limit: null, remaining: null };
  }

  const { used, limit, unlimited } = usageData;

  if (unlimited) {
    return { allowed: true, used, limit: null, remaining: null };
  }

  const remaining = Math.max(0, (limit || 0) - used);
  const allowed = remaining >= amount;

  return { allowed, used, limit, remaining };
}

export function useUpgradePlan() {
  const { refetch } = useSubscription();

  const upgradePlan = async (planSlug: string) => {
    try {
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan_slug: planSlug }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upgrade plan');
      }

      const data = await response.json();
      await refetch();
      return data;
    } catch (error) {
      console.error('Error upgrading plan:', error);
      throw error;
    }
  };

  return upgradePlan;
}

export function useSelectPlan() {
  const { refetch } = useSubscription();

  const selectPlan = async (planSlug: string) => {
    try {
      const response = await fetch('/api/subscription/select-plan', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan_slug: planSlug }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to select plan');
      }

      const data = await response.json();
      await refetch();
      return data;
    } catch (error) {
      console.error('Error selecting plan:', error);
      throw error;
    }
  };

  return selectPlan;
}

export function useCancelSubscription() {
  const { refetch } = useSubscription();

  const cancelSubscription = async (reason?: string) => {
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel subscription');
      }

      const data = await response.json();
      await refetch();
      return data;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  };

  return cancelSubscription;
}

export function useRecordUsage() {
  const recordUsage = async (featureKey: string, amount: number = 1) => {
    try {
      const response = await fetch('/api/usage/record', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feature_key: featureKey, amount }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to record usage');
      }

      return await response.json();
    } catch (error) {
      console.error('Error recording usage:', error);
      throw error;
    }
  };

  return recordUsage;
}

export function useCheckUsage() {
  const checkUsage = async (featureKey: string, amount: number = 1) => {
    try {
      const response = await fetch('/api/usage/check', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feature_key: featureKey, amount }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to check usage');
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking usage:', error);
      throw error;
    }
  };

  return checkUsage;
}
