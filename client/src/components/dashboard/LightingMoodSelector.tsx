import { LIGHTING_MOODS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, Sun, Coffee, Cloud, Sunset, Lightbulb, Monitor, Moon, Zap } from "lucide-react";
import { useSubscription } from "@/context/SubscriptionContext";

interface LightingMoodSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const MOOD_ICONS: Record<string, React.ReactNode> = {
  "natural-daylight": <Sun className="w-6 h-6" />,
  "warm-indoor": <Coffee className="w-6 h-6" />,
  "soft-neutral": <Cloud className="w-6 h-6" />,
  "golden-hour": <Sunset className="w-6 h-6" />,
  "luxury-hotel": <Lightbulb className="w-6 h-6" />,
  "studio-bright": <Monitor className="w-6 h-6" />,
  "cozy-evening": <Moon className="w-6 h-6" />,
  "dramatic-accent": <Zap className="w-6 h-6" />,
};

export function LightingMoodSelector({ value, onChange }: LightingMoodSelectorProps) {
  const { subscription } = useSubscription();
  const isPremium = subscription?.plan?.name !== "starter";

  return (
    <div className="space-y-3 w-full">
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Lighting Mood
      </label>

      <div className="space-y-2 w-full pt-2">
        {LIGHTING_MOODS.map((mood) => {
          const isLocked = !isPremium && mood.premium;
          const isSelected = value === mood.id;

          return (
            <Tooltip key={mood.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => !isLocked && onChange(mood.id)}
                  disabled={isLocked}
                  className={cn(
                    "relative w-full p-4 rounded-3xl border-2 transition-all text-left flex items-center gap-4",
                    isLocked
                      ? "opacity-50 cursor-not-allowed border-gray-300 bg-muted/30"
                      : isSelected
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-muted hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    isSelected && !isLocked
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {MOOD_ICONS[mood.id] || <Sun className="w-5 h-5" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{mood.name}</div>
                    <div className="text-xs text-muted-foreground">{mood.description}</div>
                  </div>

                  {isLocked && (
                    <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                  {isSelected && !isLocked && (
                    <div className="w-2 h-2 bg-primary rounded-full shrink-0" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">{mood.name}</p>
                <p className="text-xs text-muted-foreground">{mood.description}</p>
                {isLocked && <p className="text-xs text-amber-300 mt-1">Pro+ only</p>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
