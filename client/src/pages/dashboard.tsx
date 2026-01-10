import { useState, useEffect } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Navbar } from "@/components/layout/Navbar";
import { UploadPanel } from "@/components/dashboard/UploadPanel";
import { StyleSelector } from "@/components/dashboard/StyleSelector";
import { MaterialSelector } from "@/components/dashboard/MaterialSelector";
import { Button } from "@/components/ui/button";
import { Wand2, ShoppingBag, Download, Share2, Sparkles, RefreshCcw, Edit3, ChevronUp, ChevronDown, Upload, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ProductSidebar } from "@/components/dashboard/ProductSidebar";
import { TransformationSlider } from "@/components/dashboard/TransformationSlider";
import { ShareModal } from "@/components/ShareModal";
import { EmptyState } from "@/components/EmptyState";
import { Link } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

const fetchProjects = async () => {
  const token = localStorage.getItem("token");
  const { getApiUrl } = await import("@/config/api");
  const response = await fetch(getApiUrl("/api/projects"), {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch projects");
  return response.json();
};

export default function DashboardPage() {
  const isMobile = useIsMobile();
  const [selectedStyle, setSelectedStyle] = useState("modern");
  const [wallColor, setWallColor] = useState("white");
  const [floorType, setFloorType] = useState("wood-oak");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
  const [isProductSidebarOpen, setIsProductSidebarOpen] = useState(false);

  // Calculate remaining time for rate limit
  const getRateLimitRemainingTime = () => {
    if (!rateLimitUntil) return null;
    const remaining = Math.ceil((rateLimitUntil - Date.now()) / 1000);
    return remaining > 0 ? remaining : null;
  };

  // Update rate limit every second
  useEffect(() => {
    if (!rateLimitUntil) return;

    const interval = setInterval(() => {
      const remaining = getRateLimitRemainingTime();
      if (!remaining) {
        setRateLimitUntil(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [rateLimitUntil]);
  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  useEffect(() => {
    const editedImage = localStorage.getItem("editedImage");
    if (editedImage) {
      setUploadedImage(editedImage);
      localStorage.removeItem("editedImage");
      toast.success("Edited image loaded!");
    }

    const projectId = localStorage.getItem("selectedProjectId");
    if (projectId) {
      setSelectedProjectId(projectId);
    }
  }, []);

  const handleFileUpload = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setUploadedImage(null);
      setGeneratedImage(null);
    }
  };

  const handleGenerate = async () => {
    if (!uploadedImage) {
      toast.error("Please upload an image first");
      return;
    }

    // Check if rate limited
    const remainingTime = getRateLimitRemainingTime();
    if (remainingTime) {
      const minutes = Math.ceil(remainingTime / 60);
      const seconds = remainingTime % 60;
      toast.error(`Please wait ${minutes}:${seconds.toString().padStart(2, '0')} before trying again`);
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    if (isMobile) {
      setIsMobileControlsOpen(false);
      toast.info("Controls minimized. Tap to expand.");
    }
    
    try {
      const token = localStorage.getItem('token');
      console.log('Sending generation request with token:', !!token);
      
      const { getApiUrl } = await import("@/config/api");
      const requestBody: any = {
        imageUrl: uploadedImage,
        roomType: 'living-room',
        style: selectedStyle,
        materials: {
          wallColor: wallColor,
          floorType: floorType,
          curtainType: 'none',
          lightingMood: 'natural',
          accentWall: 'none',
        },
      };
      
      // Include projectId if one is selected
      if (selectedProjectId) {
        requestBody.projectId = selectedProjectId;
      }
      
      const response = await fetch(getApiUrl('/api/generations'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);

      if (!response.ok) {
        const text = await response.text();
        console.error('Error response:', text);
        
        let errorMessage = text ? text : `Generation failed: ${response.status}`;
        
        // Handle rate limit error specifically
        if (response.status === 429) {
          try {
            const errorData = JSON.parse(text);
            const retryAfter = errorData.retryAfter || 600;
            const minutes = Math.ceil(retryAfter / 60);
            errorMessage = `Rate limit exceeded. Please wait ${minutes} minute(s) before trying again.`;
            // Set rate limit timer
            setRateLimitUntil(Date.now() + (retryAfter * 1000));
          } catch {
            errorMessage = "Rate limit exceeded. Please wait a few minutes before trying again.";
            setRateLimitUntil(Date.now() + (10 * 60 * 1000)); // Default 10 minutes
          }
        }
        
        setGenerationError(errorMessage);
        toast.error(errorMessage);
        setIsGenerating(false);
        return;
      }

      const data = await response.json();
      console.log('Generation response:', data);
      setGeneratedImage(data.afterImage);
      
      if (selectedProjectId) {
        toast.success('Image generated and saved to project!');
      } else {
        toast.success('Image generated successfully!');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    if (!generatedImage) {
      toast.error("No image to export");
      return;
    }
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `spavix-transformation-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Image downloaded!");
  };

  const Controls = ({ isMobileCollapsible = false }: { isMobileCollapsible?: boolean }) => (
    <div className="flex flex-col h-full">
      <div className="p-4 md:p-6 space-y-6 flex-1 overflow-y-auto">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold font-heading">Design Studio</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Customize your transformation</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Room Source</h3>
            </div>
            <Link href="/editor">
              <Button variant="ghost" size="sm" className="h-8 text-[10px] md:text-xs gap-1.5">
                <Edit3 className="w-3.5 h-3.5" /> Edit Mode
              </Button>
            </Link>
          </div>
          <UploadPanel onFileSelect={handleFileUpload} uploadedImage={uploadedImage} />
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Design Style</h3>
          </div>
          <StyleSelector value={selectedStyle} onChange={setSelectedStyle} />
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">3</div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project</h3>
          </div>
          <Select value={selectedProjectId || "none"} onValueChange={(value) => {
            setSelectedProjectId(value === "none" ? "" : value);
            // Prevent scroll jump by maintaining scroll position
            const scrollPos = window.scrollY;
            setTimeout(() => window.scrollTo(0, scrollPos), 0);
          }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a project (optional)" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={5}>
              <SelectItem value="none">No Project</SelectItem>
              {projects.map((project: any) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">Designs will be automatically linked to the selected project</p>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">4</div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customization</h3>
          </div>
          <MaterialSelector type="wall" label="Wall Color" value={wallColor} onChange={setWallColor} />
          <MaterialSelector type="floor" label="Floor Material" value={floorType} onChange={setFloorType} />
        </div>
      </div>

      {!isMobileCollapsible && (
        <div className="p-4 md:p-6 border-t bg-card/50 backdrop-blur-sm shrink-0">
          <Button 
            size="lg" 
            className="w-full h-12 font-semibold rounded-full bg-linear-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all disabled:opacity-50" 
            onClick={handleGenerate} 
            disabled={isGenerating || !uploadedImage || getRateLimitRemainingTime() !== null}
          >
            {isGenerating ? (
              <><Sparkles className="mr-2 h-4 w-4 animate-spin" /> Designing...</>
            ) : getRateLimitRemainingTime() !== null ? (
              <><Clock className="mr-2 h-4 w-4" /> Rate Limited ({Math.ceil(getRateLimitRemainingTime()! / 60)}m)</>
            ) : (
              <><Wand2 className="mr-2 h-4 w-4" /> Generate Transformation</>
            )}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <Navbar />
      
      <main id="main-content" className="flex-1 overflow-hidden relative flex flex-col md:flex-row">
        {isMobile ? (
          <div className="flex-1 flex flex-col overflow-hidden">
             {/* Mobile Preview Area */}
             <div className="flex-1 relative bg-muted/20 flex items-center justify-center p-2 sm:p-4 min-h-[250px] sm:min-h-[300px]">
                {/* Mobile Toolbar */}
                <div className="absolute top-2 right-2 z-20 flex gap-1">
                   {generatedImage && (
                     <Button variant="secondary" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 bg-background/80" onClick={() => setGeneratedImage(null)}>
                       <RefreshCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                     </Button>
                   )}
                   {generatedImage && (
                     <Button 
                       variant="outline" 
                       size="icon" 
                       className="h-8 w-8 sm:h-9 sm:w-9 bg-background/80"
                       onClick={() => setIsShareModalOpen(true)}
                     >
                       <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
                     </Button>
                   )}
                </div>

                {isGenerating ? (
                  <div className="w-full aspect-square sm:aspect-auto sm:h-96 bg-muted animate-pulse rounded-lg flex items-center justify-center">
                    <div className="text-center px-4">
                      <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-primary animate-spin" />
                      <p className="text-xs sm:text-sm text-muted-foreground">Generating your design...</p>
                    </div>
                  </div>
                ) : generationError ? (
                  <div className="w-full aspect-square sm:aspect-auto sm:h-96 flex items-center justify-center p-3 sm:p-4">
                    <div className="text-center space-y-2 sm:space-y-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                        <span className="text-destructive text-lg sm:text-xl">⚠️</span>
                      </div>
                      <p className="text-xs sm:text-sm text-destructive font-medium">{generationError}</p>
                      <Button variant="outline" size="sm" onClick={() => setGenerationError(null)} className="text-xs sm:text-sm h-8 sm:h-9">
                        Try Again
                      </Button>
                    </div>
                  </div>
                ) : generatedImage && uploadedImage ? (
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-xl border border-white/10 group bg-black">
                    <TransformationSlider beforeImage={uploadedImage} afterImage={generatedImage} />
                    <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-30">
                      <Button size="sm" onClick={() => setIsProductSidebarOpen(true)} className="rounded-full bg-white text-black shadow-lg text-xs sm:text-sm h-8 sm:h-9">
                        <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Detect
                      </Button>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={<Upload className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />}
                    title="Design Your Space"
                    description="Upload a photo of your room to get started with AI-powered design transformations"
                  />
                )}
             </div>

             {/* Mobile Controls Drawer */}
             <div className="border-t bg-card shrink-0 flex flex-col gap-2 p-3 sm:p-4">
                <Button 
                  size="lg" 
                  className="w-full h-11 sm:h-12 font-semibold shadow-md rounded-lg bg-linear-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white disabled:opacity-50 text-sm sm:text-base transition-all hover:shadow-lg" 
                  onClick={handleGenerate} 
                  disabled={isGenerating || !uploadedImage || getRateLimitRemainingTime() !== null}
                >
                  {isGenerating ? (
                    <><Sparkles className="mr-2 h-4 w-4 animate-spin" /> Designing...</>
                  ) : getRateLimitRemainingTime() !== null ? (
                    <><Clock className="mr-2 h-4 w-4" /> Rate Limited ({Math.ceil(getRateLimitRemainingTime()! / 60)}m)</>
                  ) : (
                    <><Wand2 className="mr-2 h-4 w-4" /> Generate Transformation</>
                  )}
                </Button>
                <Collapsible open={isMobileControlsOpen} onOpenChange={setIsMobileControlsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full h-10 rounded-lg flex items-center justify-between px-4 text-xs font-semibold uppercase tracking-wide hover:bg-muted/50">
                      <span>Configuration</span>
                      {isMobileControlsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <ScrollArea className="h-[35vh] rounded-lg">
                      <Controls isMobileCollapsible={true} />
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
             </div>
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full rounded-none border-t">
            <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="bg-card border-r z-10 shadow-lg flex flex-col">
              <Controls isMobileCollapsible={false} />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={75} className="relative bg-muted/20">
               <div className="absolute top-4 right-4 z-20 flex space-x-2">
                  {generatedImage && <Button variant="secondary" size="sm" className="bg-background/80 shadow-sm" onClick={() => setGeneratedImage(null)}><RefreshCcw className="w-4 h-4 mr-2" /> Reset</Button>}
                  {generatedImage && <Button variant="outline" size="sm" className="bg-background/80 shadow-sm" onClick={() => setIsShareModalOpen(true)}><Share2 className="w-4 h-4 mr-2" /> Share</Button>}
                  {generatedImage && <Button variant="outline" size="sm" className="bg-background/80 shadow-sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" /> Export</Button>}
               </div>
               <div className="w-full h-full flex flex-col items-center justify-center p-8 overflow-hidden">
                  {isGenerating ? (
                    <div className="w-full h-96 bg-muted animate-pulse rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
                        <p className="text-muted-foreground text-lg">Generating your design...</p>
                      </div>
                    </div>
                  ) : generationError ? (
                    <div className="w-full h-96 flex items-center justify-center p-4">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                          <span className="text-destructive text-2xl">⚠️</span>
                        </div>
                        <p className="text-destructive font-medium">{generationError}</p>
                        <Button variant="outline" onClick={() => setGenerationError(null)}>
                          Try Again
                        </Button>
                      </div>
                    </div>
                  ) : generatedImage && uploadedImage ? (
                    <div className="relative w-full h-full max-h-[80vh] aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 group bg-black">
                      <TransformationSlider beforeImage={uploadedImage} afterImage={generatedImage} />
                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-300 z-30">
                        <Button size="lg" onClick={() => setIsProductSidebarOpen(true)} className="rounded-full px-8 bg-white text-black hover:bg-white/90 shadow-xl border-2 border-transparent hover:border-primary/20 hover:scale-105 transition-all">
                          <ShoppingBag className="w-5 h-5 mr-2" /> Detect Products
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      icon={<Upload className="w-12 h-12 text-primary" />}
                      title="Design Your Dream Space"
                      description="Upload a photo of your room, choose a style, and let our AI reimagine your space in seconds."
                      className="animate-in fade-in zoom-in duration-500"
                    />
                  )}
               </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
        
        <ProductSidebar isOpen={isProductSidebarOpen} onClose={() => setIsProductSidebarOpen(false)} />
        {isProductSidebarOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-55 transition-opacity" onClick={() => setIsProductSidebarOpen(false)} />}
        
        <ShareModal open={isShareModalOpen} onOpenChange={setIsShareModalOpen} imageUrl={generatedImage || undefined} />
      </main>
    </div>
  );
}
