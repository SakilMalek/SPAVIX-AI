import { WALL_COLORS, FLOOR_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MaterialSelectorProps {
  type: "wall" | "floor";
  value: string;
  onChange: (value: string) => void;
  label: string;
}

export function MaterialSelector({ type, value, onChange, label }: MaterialSelectorProps) {
  const options = type === "wall" ? WALL_COLORS : FLOOR_TYPES;

  return (
    <div className="space-y-3">
       <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
      </label>
      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <Tooltip key={option.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onChange(option.id)}
                className={cn(
                  "relative h-10 w-10 rounded-full border-2 transition-all focus:outline-none",
                  value === option.id 
                    ? "border-primary ring-1 ring-primary ring-offset-1 scale-105" 
                    : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: option.value }}
                aria-label={option.name}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>{option.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
