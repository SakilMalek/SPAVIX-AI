import { STYLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface StyleSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const INITIAL_DISPLAY = 4;

export function StyleSelector({ value, onChange }: StyleSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayedStyles = isExpanded ? STYLES : STYLES.slice(0, INITIAL_DISPLAY);
  const hasMore = STYLES.length > INITIAL_DISPLAY;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Interior Style
        </label>
        <span className="text-xs text-muted-foreground">{STYLES.length} styles available</span>
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {displayedStyles.map((style) => (
            <button
              key={style.id}
              onClick={() => onChange(style.id)}
              className={cn(
                "group relative flex flex-col items-start overflow-hidden rounded-xl border-2 transition-all hover:border-primary/50 text-left bg-card",
                value === style.id 
                  ? "border-primary shadow-sm" 
                  : "border-transparent shadow-xs hover:shadow-md"
              )}
            >
              <div className="aspect-[4/3] w-full overflow-hidden">
                <img 
                  src={style.image} 
                  alt={style.name}
                  className={cn(
                    "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105",
                    value === style.id ? "scale-105" : ""
                  )}
                />
                <div className={cn(
                  "absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center",
                  value === style.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                  {value === style.id && (
                    <CheckCircle2 className="w-8 h-8 text-white drop-shadow-md" />
                  )}
                </div>
              </div>
              <div className="p-3 w-full bg-card">
                <div className="font-semibold text-sm">{style.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">{style.description}</div>
              </div>
            </button>
          ))}
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
