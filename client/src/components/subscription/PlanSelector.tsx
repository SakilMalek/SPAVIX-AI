import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useSubscription, useSelectPlan } from '../../hooks/useSubscription';
import { Plan } from '../../../shared/subscription-schema';

interface PlanSelectorProps {
  onSuccess?: () => void;
}

export function PlanSelector({ onSuccess }: PlanSelectorProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { subscription } = useSubscription();
  const selectPlan = useSelectPlan();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch('/api/subscription/plans');
        if (response.ok) {
          const data = await response.json();
          setPlans(data.plans);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleSelectPlan = async (planSlug: string) => {
    try {
      setSubmitting(true);
      await selectPlan(planSlug);
      onSuccess?.();
    } catch (error) {
      console.error('Error selecting plan:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading plans...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => {
        const isCurrentPlan = subscription?.plan.id === plan.id;
        const features = plan.features as Record<string, boolean>;
        const limits = plan.limits as Record<string, number | null>;

        return (
          <div
            key={plan.id}
            className={`relative rounded-lg border-2 p-6 transition-all ${
              isCurrentPlan
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            {isCurrentPlan && (
              <div className="absolute top-4 right-4 flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                <Check className="w-3 h-3" />
                Current
              </div>
            )}

            <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>

            <div className="mb-4">
              <span className="text-3xl font-bold text-gray-900">
                ${(plan.price_monthly / 100).toFixed(2)}
              </span>
              <span className="text-gray-600 ml-2">/month</span>
            </div>

            <p className="text-sm text-gray-600 mb-6">{plan.description}</p>

            <div className="space-y-3 mb-6">
              {Object.entries(features).map(([key, enabled]) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded ${
                      enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <span className={`text-sm ${enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                    {formatFeatureName(key)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2 mb-6 p-4 bg-gray-50 rounded">
              <h4 className="font-semibold text-sm text-gray-900">Limits</h4>
              {Object.entries(limits).map(([key, value]) => (
                <div key={key} className="text-xs text-gray-600">
                  <span className="font-medium">{formatFeatureName(key)}:</span>{' '}
                  {value === null ? 'Unlimited' : value}
                </div>
              ))}
            </div>

            {!isCurrentPlan && (
              <button
                onClick={() => handleSelectPlan(plan.slug)}
                disabled={submitting}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
              >
                {submitting ? 'Selecting...' : 'Select Plan'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatFeatureName(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
