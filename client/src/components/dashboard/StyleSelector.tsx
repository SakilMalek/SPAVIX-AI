import { STYLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/context/SubscriptionContext";

interface StyleSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const INITIAL_DISPLAY = 4;
const PREMIUM_STYLES = ["art-deco", "mediterranean", "traditional", "transitional", "coastal", "mid-century"];

export function StyleSelector({ value, onChange }: StyleSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { subscription } = useSubscription();
  const isPremium = subscription?.plan?.name !== "starter";
  
  const displayedStyles = isExpanded ? STYLES : STYLES.slice(0, INITIAL_DISPLAY);
  const hasMore = STYLES.length > INITIAL_DISPLAY;

  return (
    <div className="space-y-3 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Interior Style
        </label>
        <span className="text-xs text-muted-foreground">{STYLES.length} styles available</span>
      </div>
      
      <div className="space-y-3 w-full">
        <div className="grid grid-cols-2 gap-3 w-full auto-rows-max">
          {displayedStyles.map((style) => {
            const isLocked = !isPremium && PREMIUM_STYLES.includes(style.id);
            
            return (
              <button
                key={style.id}
                onClick={() => !isLocked && onChange(style.id)}
                disabled={isLocked}
                className={cn(
                  "group relative flex flex-col items-start overflow-hidden rounded-3xl border-2 transition-all text-left bg-card h-full min-w-0",
                  isLocked
                    ? "border-gray-200 opacity-50 cursor-not-allowed"
                    : value === style.id 
                    ? "border-primary shadow-md hover:border-primary/50" 
                    : "border-transparent shadow-sm hover:shadow-lg hover:border-primary/50"
                )}
              >
                <div className="aspect-square w-full overflow-hidden relative shrink-0">
                  <img 
                    src={style.image} 
                    alt={style.name}
                    className={cn(
                      "h-full w-full object-cover transition-transform duration-300",
                      value === style.id && !isLocked ? "scale-105" : "",
                      isLocked ? "blur-sm" : "group-hover:scale-105"
                    )}
                  />
                  <div className={cn(
                    "absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center",
                    value === style.id && !isLocked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}>
                    {value === style.id && !isLocked && (
                      <CheckCircle2 className="w-10 h-10 text-white drop-shadow-md" />
                    )}
                    {isLocked && (
                      <Lock className="w-10 h-10 text-white drop-shadow-md" />
                    )}
                  </div>
                </div>
                <div className="p-3 w-full bg-card flex-1 flex flex-col justify-between min-w-0">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="font-semibold text-sm overflow-wrap">{style.name}</div>
                    {isLocked && <Lock className="w-4 h-4 text-gray-400 shrink-0" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground line-clamp-2 overflow-wrap">{style.description}</div>
                    {isLocked && <div className="text-xs text-amber-600 mt-1">Pro+ only</div>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {hasMore && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "w-full h-10 rounded-lg border-2 transition-all font-medium text-sm flex items-center justify-center gap-2",
              isExpanded
                ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                : "border-border bg-muted/30 text-foreground hover:bg-muted/50 hover:border-primary/50"
            )}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                See Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                See More ({STYLES.length - INITIAL_DISPLAY} more)
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
