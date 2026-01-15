import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  message?: string;
  feature?: string;
  currentUsage?: number;
  limit?: number;
}

export function UpgradeModal({
  open,
  onOpenChange,
  title = "Upgrade to Pro",
  description = "You've reached your monthly transformation limit",
  message = "Upgrade to Pro plan for unlimited transformations and more features.",
  feature = "transformations",
  currentUsage,
  limit,
}: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600 to-purple-500">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-xl">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {currentUsage !== undefined && limit !== undefined && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monthly {feature}</span>
                <span className="font-semibold">{currentUsage} / {limit}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-600 to-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((currentUsage / limit) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {message}
          </p>

          <div className="bg-gradient-to-br from-purple-600/10 to-purple-500/10 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-sm">Pro Plan includes:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                <span>Unlimited transformations</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                <span>Unlimited projects</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                <span>Priority support</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                <span>High-resolution exports</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Continue with Starter
          </Button>
          <Link href="/pricing" className="flex-1">
            <Button className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white">
              Upgrade Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
