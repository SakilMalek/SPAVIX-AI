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

      // Fetch full subscription data from /api/subscriptions/current
      const { getApiUrl } = await import("@/config/api");
      const response = await fetch(getApiUrl('/api/subscriptions/current'), {
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
      
      // Extract subscription info from /api/subscriptions/current response
      if (data.plan) {
        setSubscription({
          id: data.subscription?.id || data.id,
          plan: {
            name: data.plan.name,
            display_name: data.plan.display_name,
            price: data.plan.price,
            features: data.plan.features,
            limits: data.plan.limits,
          },
          status: data.subscription?.status || 'active',
        } as any);
        
        // Set features from the plan
        setFeatures(data.plan.features || {});
        
        // Set usage data
        setUsage(data.usage || {});
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
