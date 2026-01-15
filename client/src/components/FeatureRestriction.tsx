/**
 * Feature Restriction Components
 * Shows locked/unlocked states for plan features
 */

import React from 'react';
import { Lock, Unlock, AlertCircle } from 'lucide-react';

interface FeatureRestrictionProps {
  featureName: string;
  isEnabled: boolean;
  requiredPlan?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * FeatureRestrictionBadge - Shows if a feature is locked or unlocked
 */
export const FeatureRestrictionBadge: React.FC<FeatureRestrictionProps> = ({
  featureName,
  isEnabled,
  requiredPlan = 'Pro',
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isEnabled ? (
        <>
          <Unlock className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-600">{featureName}</span>
        </>
      ) : (
        <>
          <Lock className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-400">{featureName}</span>
          <span className="text-xs text-gray-500 ml-auto">{requiredPlan}+</span>
        </>
      )}
    </div>
  );
};

/**
 * LockedFeatureOverlay - Shows overlay on disabled features
 */
export const LockedFeatureOverlay: React.FC<{
  isLocked: boolean;
  requiredPlan?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ isLocked, requiredPlan = 'Pro', children, className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLocked && (
        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <Lock className="w-8 h-8 text-white mx-auto mb-2" />
            <p className="text-white text-sm font-medium">Locked</p>
            <p className="text-gray-200 text-xs">{requiredPlan}+ Plan</p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * FeatureGrid - Shows grid of features with lock/unlock status
 */
export const FeatureGrid: React.FC<{
  features: Array<{ name: string; enabled: boolean; requiredPlan?: string }>;
  className?: string;
}> = ({ features, className = '' }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {features.map((feature) => (
        <div
          key={feature.name}
          className={`p-4 rounded-lg border-2 transition-all ${
            feature.enabled
              ? 'border-green-200 bg-green-50'
              : 'border-gray-200 bg-gray-50'
          }`}
        >
          <FeatureRestrictionBadge
            featureName={feature.name}
            isEnabled={feature.enabled}
            requiredPlan={feature.requiredPlan}
          />
        </div>
      ))}
    </div>
  );
};

/**
 * UpgradePrompt - Shows upgrade prompt for locked features
 */
export const UpgradePrompt: React.FC<{
  featureName: string;
  requiredPlan: string;
  onUpgradeClick?: () => void;
  className?: string;
}> = ({ featureName, requiredPlan, onUpgradeClick, className = '' }) => {
  return (
    <div className={`bg-blue-50 border-l-4 border-blue-500 p-4 rounded ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900">{featureName} Locked</h3>
          <p className="text-sm text-blue-700 mt-1">
            This feature is available in the {requiredPlan} plan and above.
          </p>
          {onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
            >
              Upgrade to {requiredPlan}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * DisabledButton - Button with lock icon for disabled features
 */
export const DisabledButton: React.FC<{
  children: React.ReactNode;
  requiredPlan?: string;
  onClick?: () => void;
  className?: string;
}> = ({ children, requiredPlan = 'Pro', onClick, className = '' }) => {
  return (
    <button
      disabled
      onClick={onClick}
      className={`relative px-4 py-2 bg-gray-200 text-gray-500 rounded font-medium flex items-center gap-2 cursor-not-allowed opacity-60 ${className}`}
      title={`Available in ${requiredPlan}+ plans`}
    >
      <Lock className="w-4 h-4" />
      {children}
    </button>
  );
};

/**
 * StyleSelector with lock for premium styles
 */
export const StyleSelectorWithLock: React.FC<{
  styles: Array<{ id: string; name: string; isPremium: boolean }>;
  selectedStyle: string;
  onStyleSelect: (styleId: string) => void;
  userPlan: 'starter' | 'pro' | 'business';
  className?: string;
}> = ({ styles, selectedStyle, onStyleSelect, userPlan, className = '' }) => {
  const canUsePremium = userPlan !== 'starter';

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">Design Styles</label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {styles.map((style) => {
          const isLocked = style.isPremium && !canUsePremium;
          const isSelected = selectedStyle === style.id;

          return (
            <button
              key={style.id}
              onClick={() => !isLocked && onStyleSelect(style.id)}
              disabled={isLocked}
              className={`p-3 rounded-lg border-2 transition-all relative ${
                isLocked
                  ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                  : isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              title={isLocked ? 'Available in Pro+ plans' : ''}
            >
              <span className="text-sm font-medium text-gray-700">{style.name}</span>
              {isLocked && (
                <Lock className="w-4 h-4 text-gray-400 absolute top-2 right-2" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * ChatInputWithLock - Chat input with lock for Starter users
 */
export const ChatInputWithLock: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading?: boolean;
  userPlan: 'starter' | 'pro' | 'business';
  className?: string;
}> = ({ value, onChange, onSend, isLoading = false, userPlan, className = '' }) => {
  const isLocked = userPlan === 'starter';

  return (
    <div className={`flex gap-2 ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLocked}
        placeholder={isLocked ? 'AI Chat available in Pro+ plans' : 'Ask for design advice...'}
        className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
          isLocked
            ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
            : 'border-gray-300 focus:ring-blue-500'
        }`}
      />
      <button
        onClick={onSend}
        disabled={isLocked || isLoading || !value.trim()}
        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
          isLocked
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-60'
            : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60'
        }`}
        title={isLocked ? 'Available in Pro+ plans' : ''}
      >
        {isLocked && <Lock className="w-4 h-4" />}
        {isLoading ? 'Sending...' : 'Send'}
      </button>
    </div>
  );
};

export default {
  FeatureRestrictionBadge,
  LockedFeatureOverlay,
  FeatureGrid,
  UpgradePrompt,
  DisabledButton,
  StyleSelectorWithLock,
  ChatInputWithLock,
};
