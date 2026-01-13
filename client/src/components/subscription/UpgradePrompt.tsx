import React from 'react';
import { Lock } from 'lucide-react';

interface UpgradePromptProps {
  reason?: string;
}

export function UpgradePrompt({ reason }: UpgradePromptProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <Lock className="w-12 h-12 text-blue-600 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Feature</h3>
      <p className="text-sm text-gray-600 text-center mb-4">
        {reason || 'This feature is not available in your current plan.'}
      </p>
      <button
        onClick={() => window.location.href = '/settings/subscription'}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        Upgrade Plan
      </button>
    </div>
  );
}
