import React, { createContext, useEffect, useState, useCallback } from 'react';
import { GetSubscriptionResponse } from '../../../shared/subscription-schema';

export interface SubscriptionContextType {
  subscription: GetSubscriptionResponse['subscription'] | null;
  usage: GetSubscriptionResponse['usage'];
  features: GetSubscriptionResponse['features'];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: React.ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [subscription, setSubscription] = useState<GetSubscriptionResponse['subscription'] | null>(null);
  const [usage, setUsage] = useState<GetSubscriptionResponse['usage']>({});
  const [features, setFeatures] = useState<GetSubscriptionResponse['features']>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Use /api/auth/me which already returns subscription data
      const { getApiUrl } = await import("@/config/api");
      const response = await fetch(getApiUrl('/api/auth/me'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No subscription yet, this is fine
          setSubscription(null);
          setUsage({});
          setFeatures({});
          setLoading(false);
          return;
        }

        try {
          const error = await response.json();
          throw new Error(error.error || `Failed to fetch subscription (${response.status})`);
        } catch (parseError) {
          throw new Error(`Failed to fetch subscription (${response.status}): ${response.statusText}`);
        }
      }

      const data = await response.json();
      
      // Extract subscription info from /api/auth/me response
      if (data.subscription_plan) {
        setSubscription({
          id: data.id,
          plan: {
            name: data.subscription_plan,
          },
          status: data.subscription_status || 'active',
        } as any);
        setFeatures({});
      } else {
        setSubscription(null);
        setUsage({});
        setFeatures({});
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const value: SubscriptionContextType = {
    subscription,
    usage,
    features,
    loading,
    error,
    refetch: fetchSubscription,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const context = React.useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
