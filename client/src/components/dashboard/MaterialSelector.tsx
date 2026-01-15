import { WALL_COLORS, FLOOR_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock } from "lucide-react";
import { useSubscription } from "@/context/SubscriptionContext";

interface MaterialSelectorProps {
  type: "wall" | "floor";
  value: string;
  onChange: (value: string) => void;
  label: string;
}

// Premium materials for Starter plan restriction
const PREMIUM_WALL_COLORS = ["navy", "sage", "terracotta"];
const PREMIUM_FLOOR_TYPES = ["marble-white", "marble-gray", "marble-black", "tile-porcelain-white", "tile-porcelain-gray", "tile-porcelain-beige"];

export function MaterialSelector({ type, value, onChange, label }: MaterialSelectorProps) {
  const options = type === "wall" ? WALL_COLORS : FLOOR_TYPES;
  const { subscription } = useSubscription();
  const isPremium = subscription?.plan?.name !== "starter";
  const premiumOptions = type === "wall" ? PREMIUM_WALL_COLORS : PREMIUM_FLOOR_TYPES;

  return (
    <div className="space-y-3 w-full">
       <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {options.map((option) => {
          const isLocked = !isPremium && premiumOptions.includes(option.id);
          
          return (
            <Tooltip key={option.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => !isLocked && onChange(option.id)}
                  disabled={isLocked}
                  className={cn(
                    "relative h-12 w-12 sm:h-10 sm:w-10 rounded-full border-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                    isLocked
                      ? "opacity-50 cursor-not-allowed border-gray-300"
                      : value === option.id 
                      ? "border-primary ring-1 ring-primary ring-offset-1 scale-105" 
                      : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: option.value }}
                  aria-label={option.name}
                >
                  {isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                      <Lock className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{option.name}</p>
                {isLocked && <p className="text-xs text-amber-300">Pro+ only</p>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
