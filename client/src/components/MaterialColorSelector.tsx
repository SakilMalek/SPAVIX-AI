/**
 * Material and Color Selector Components
 * Shows locked/unlocked materials and colors based on plan
 */

import React from 'react';
import { Lock, Unlock } from 'lucide-react';

interface Material {
  id: string;
  name: string;
  isPremium: boolean;
  color?: string;
}

interface ColorOption {
  id: string;
  name: string;
  hex: string;
  isPremium: boolean;
}

interface MaterialColorSelectorProps {
  userPlan: 'starter' | 'pro' | 'business';
  selectedMaterial?: string;
  selectedColor?: string;
  onMaterialSelect?: (materialId: string) => void;
  onColorSelect?: (colorId: string) => void;
  className?: string;
}

// Sample materials
const MATERIALS: Material[] = [
  { id: 'wood', name: 'Wood', isPremium: false },
  { id: 'marble', name: 'Marble', isPremium: false },
  { id: 'concrete', name: 'Concrete', isPremium: false },
  { id: 'tile', name: 'Tile', isPremium: false },
  { id: 'velvet', name: 'Velvet', isPremium: true },
  { id: 'leather', name: 'Leather', isPremium: true },
  { id: 'silk', name: 'Silk', isPremium: true },
  { id: 'linen', name: 'Linen', isPremium: true },
];

// Sample colors
const COLORS: ColorOption[] = [
  { id: 'white', name: 'White', hex: '#FFFFFF', isPremium: false },
  { id: 'black', name: 'Black', hex: '#000000', isPremium: false },
  { id: 'gray', name: 'Gray', hex: '#808080', isPremium: false },
  { id: 'beige', name: 'Beige', hex: '#F5F5DC', isPremium: false },
  { id: 'navy', name: 'Navy', hex: '#000080', isPremium: true },
  { id: 'emerald', name: 'Emerald', hex: '#50C878', isPremium: true },
  { id: 'rose', name: 'Rose', hex: '#FF007F', isPremium: true },
  { id: 'gold', name: 'Gold', hex: '#FFD700', isPremium: true },
];

/**
 * MaterialSelector - Shows available materials with lock/unlock status
 */
export const MaterialSelector: React.FC<
  MaterialColorSelectorProps & {
    materials?: Material[];
  }
> = ({
  userPlan,
  selectedMaterial,
  onMaterialSelect,
  materials = MATERIALS,
  className = '',
}) => {
  const canUsePremium = userPlan !== 'starter';

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Floor Materials
        </label>
        {!canUsePremium && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Premium materials locked
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {materials.map((material) => {
          const isLocked = material.isPremium && !canUsePremium;
          const isSelected = selectedMaterial === material.id;

          return (
            <button
              key={material.id}
              onClick={() => !isLocked && onMaterialSelect?.(material.id)}
              disabled={isLocked}
              className={`p-3 rounded-lg border-2 transition-all relative group ${
                isLocked
                  ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                  : isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              title={isLocked ? 'Available in Pro+ plans' : ''}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {material.name}
                </span>
                {isLocked && (
                  <Lock className="w-4 h-4 text-gray-400" />
                )}
                {!isLocked && isSelected && (
                  <Unlock className="w-4 h-4 text-blue-600" />
                )}
              </div>

              {isLocked && (
                <div className="absolute inset-0 rounded-lg bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-semibold text-gray-600 bg-white px-2 py-1 rounded">
                    Pro+
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {!canUsePremium && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            <strong>Starter Plan:</strong> Basic materials only. Upgrade to Pro for premium materials like Velvet, Leather, and Silk.
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * ColorSelector - Shows available colors with lock/unlock status
 */
export const ColorSelector: React.FC<
  MaterialColorSelectorProps & {
    colors?: ColorOption[];
  }
> = ({
  userPlan,
  selectedColor,
  onColorSelect,
  colors = COLORS,
  className = '',
}) => {
  const canUsePremium = userPlan !== 'starter';

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Wall Colors
        </label>
        {!canUsePremium && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Premium colors locked
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {colors.map((color) => {
          const isLocked = color.isPremium && !canUsePremium;
          const isSelected = selectedColor === color.id;

          return (
            <button
              key={color.id}
              onClick={() => !isLocked && onColorSelect?.(color.id)}
              disabled={isLocked}
              className={`w-full aspect-square rounded-lg border-2 transition-all relative group ${
                isLocked
                  ? 'opacity-50 cursor-not-allowed border-gray-300'
                  : isSelected
                  ? 'border-gray-800 shadow-lg scale-105'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              style={{ backgroundColor: color.hex }}
              title={isLocked ? `${color.name} - Available in Pro+ plans` : color.name}
            >
              {isLocked && (
                <div className="absolute inset-0 rounded-lg bg-black/40 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-white" />
                </div>
              )}

              {isSelected && !isLocked && (
                <div className="absolute inset-0 rounded-lg border-2 border-white shadow-inner" />
              )}

              <span className="absolute bottom-1 left-1 right-1 text-xs font-semibold text-gray-700 bg-white/80 rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                {color.name}
              </span>
            </button>
          );
        })}
      </div>

      {!canUsePremium && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            <strong>Starter Plan:</strong> Basic colors only. Upgrade to Pro for premium colors like Navy, Emerald, Rose, and Gold.
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * MaterialColorPanel - Combined material and color selector
 */
export const MaterialColorPanel: React.FC<MaterialColorSelectorProps> = ({
  userPlan,
  selectedMaterial,
  selectedColor,
  onMaterialSelect,
  onColorSelect,
  className = '',
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Customize Your Design
        </h3>

        <MaterialSelector
          userPlan={userPlan}
          selectedMaterial={selectedMaterial}
          onMaterialSelect={onMaterialSelect}
          className="mb-6"
        />

        <div className="border-t border-gray-200 pt-6">
          <ColorSelector
            userPlan={userPlan}
            selectedColor={selectedColor}
            onColorSelect={onColorSelect}
          />
        </div>
      </div>

      {userPlan === 'starter' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Unlock Premium Materials & Colors</h4>
          <p className="text-sm text-blue-800 mb-3">
            Upgrade to Pro to access premium materials like Velvet and Leather, plus exclusive colors like Emerald and Gold.
          </p>
          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors">
            Upgrade to Pro
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * FeatureAvailabilityBadge - Shows which plan a feature is available in
 */
export const FeatureAvailabilityBadge: React.FC<{
  featureName: string;
  availableIn: ('starter' | 'pro' | 'business')[];
  userPlan: 'starter' | 'pro' | 'business';
  className?: string;
}> = ({ featureName, availableIn, userPlan, className = '' }) => {
  const isAvailable = availableIn.includes(userPlan);

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
        isAvailable
          ? 'bg-green-100 text-green-800'
          : 'bg-gray-100 text-gray-600'
      } ${className}`}
    >
      {isAvailable ? (
        <>
          <Unlock className="w-4 h-4" />
          {featureName}
        </>
      ) : (
        <>
          <Lock className="w-4 h-4" />
          {featureName} ({availableIn[0]}+)
        </>
      )}
    </div>
  );
};

export default {
  MaterialSelector,
  ColorSelector,
  MaterialColorPanel,
  FeatureAvailabilityBadge,
};
