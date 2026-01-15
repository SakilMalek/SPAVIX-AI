import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Download, Home, Loader } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { addWatermarkToImage } from "@/lib/watermark";
import { TransformationSlider } from "@/components/dashboard/TransformationSlider";

interface ShareData {
  id: string;
  before_image_url: string;
  after_image_url: string;
  style: string;
  room_type: string;
  created_at: string;
}

export default function SharePage() {
  const [, params] = useRoute("/share/:shareId");
  const [share, setShare] = useState<ShareData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchShare = async () => {
      try {
        const response = await fetch(`/api/shares/${params?.shareId}`);
        if (!response.ok) {
          toast.error("Share not found");
          setIsLoading(false);
          return;
        }
        const data = await response.json();
        setShare(data);
      } catch (error) {
        console.error("Error fetching share:", error);
        toast.error("Failed to load share");
      } finally {
        setIsLoading(false);
      }
    };

    if (params?.shareId) {
      fetchShare();
    }
  }, [params?.shareId]);

  const handleDownload = async () => {
    if (!share?.after_image_url) return;
    try {
      const { subscription } = useSubscription();
      const planName = subscription?.plan?.name?.toLowerCase();
      
      let blobToDownload: Blob;
      
      // Add watermark for Starter plan users
      if (planName === 'starter') {
        toast.info("Adding watermark to your image...");
        blobToDownload = await addWatermarkToImage(share.after_image_url);
      } else {
        const response = await fetch(share.after_image_url);
        blobToDownload = await response.blob();
      }
      
      const url = window.URL.createObjectURL(blobToDownload);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spavix-shared-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Image downloaded!");
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Failed to download image");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        {isLoading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading shared transformation...</p>
          </div>
        ) : share ? (
          <div className="max-w-4xl w-full space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold font-heading">Shared Room Transformation</h1>
              <p className="text-muted-foreground">Check out this amazing room design from SPAVIX</p>
            </div>

            <div className="rounded-xl overflow-hidden shadow-lg border border-white/10 aspect-video">
              <TransformationSlider 
                beforeImage={share.before_image_url}
                afterImage={share.after_image_url}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Room Type</p>
                <p className="font-semibold capitalize">{share.room_type}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Style</p>
                <p className="font-semibold">{share.style}</p>
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              <Button onClick={handleDownload} className="gap-2">
                <Download className="w-4 h-4" />
                Download Image
              </Button>
              <Link href="/">
                <Button variant="outline" className="gap-2">
                  <Home className="w-4 h-4" />
                  Create Your Own
                </Button>
              </Link>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>Shared on {new Date(share.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Share Not Found</h1>
            <p className="text-muted-foreground">The share link you're looking for doesn't exist or has expired</p>
            <Link href="/">
              <Button>Go Home</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
