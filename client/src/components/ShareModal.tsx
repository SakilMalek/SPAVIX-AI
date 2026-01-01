import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl?: string;
}

export function ShareModal({ open, onOpenChange, imageUrl }: ShareModalProps) {
  const [shareLink, setShareLink] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateShareLink = async () => {
    if (!imageUrl) {
      toast.error("No image to share");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) {
        toast.error("Failed to create share link");
        return;
      }

      const data = await response.json();
      const fullShareLink = `${window.location.origin}/share/${data.shareId}`;
      setShareLink(fullShareLink);
      toast.success("Share link created!");
    } catch (error) {
      toast.error("Failed to create share link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Your Design
          </DialogTitle>
          <DialogDescription>
            Generate a shareable link for your room transformation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!shareLink ? (
            <Button
              onClick={handleGenerateShareLink}
              disabled={isLoading || !imageUrl}
              className="w-full"
            >
              {isLoading ? "Generating..." : "Generate Share Link"}
            </Button>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Share Link</label>
              <div className="flex gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="flex-1"
                />
                <Button
                  size="icon"
                  onClick={handleCopyLink}
                  variant="outline"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can view your transformation
              </p>
              <Button
                onClick={() => {
                  setShareLink("");
                  onOpenChange(false);
                }}
                variant="outline"
                className="w-full"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
