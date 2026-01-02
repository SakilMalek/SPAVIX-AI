import { useState, useEffect } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Navbar } from "@/components/layout/Navbar";
import { UploadPanel } from "@/components/dashboard/UploadPanel";
import { StyleSelector } from "@/components/dashboard/StyleSelector";
import { MaterialSelector } from "@/components/dashboard/MaterialSelector";
import { Button } from "@/components/ui/button";
import { Wand2, ShoppingBag, Download, Share2, Sparkles, RefreshCcw, Edit3, ChevronUp, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ProductSidebar } from "@/components/dashboard/ProductSidebar";
import { TransformationSlider } from "@/components/dashboard/TransformationSlider";
import { ShareModal } from "@/components/ShareModal";
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
  const [isProductSidebarOpen, setIsProductSidebarOpen] = useState(false);
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
    if (!uploadedImage) return;
    setIsGenerating(true);
    if (isMobile) setIsMobileControlsOpen(false);
    
    try {
      const token = localStorage.getItem('token');
      console.log('Sending generation request with token:', !!token);
      
      const { getApiUrl } = await import("@/config/api");
      const response = await fetch(getApiUrl('/api/generations'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
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
        }),
      });

      console.log('Response status:', response.status);
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);

      if (!response.ok) {
        const text = await response.text();
        console.error('Error response:', text);
        toast.error(`Generation failed: ${response.status}`);
        setIsGenerating(false);
        return;
      }

      const data = await response.json();
      console.log('Generation response:', data);
      setGeneratedImage(data.afterImage);
      
      // Auto-link to project if one is selected
      if (selectedProjectId && data.id) {
        try {
          const linkResponse = await fetch(`/api/generations/${data.id}/project`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ projectId: selectedProjectId }),
          });
          
          if (linkResponse.ok) {
            toast.success('Image generated and linked to project!');
          } else {
            toast.success('Image generated successfully!');
          }
        } catch (linkError) {
          console.error('Error linking to project:', linkError);
          toast.success('Image generated successfully!');
        }
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

  const Controls = () => (
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
          <Select value={selectedProjectId || "none"} onValueChange={(value) => setSelectedProjectId(value === "none" ? "" : value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a project (optional)" />
            </SelectTrigger>
            <SelectContent>
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

      <div className="p-4 md:p-6 border-t bg-card/50 backdrop-blur-sm shrink-0">
        <Button 
          size="lg" 
          className="w-full h-12 font-semibold rounded-full bg-linear-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all disabled:opacity-50" 
          onClick={handleGenerate} 
          disabled={isGenerating || !uploadedImage}
        >
          {isGenerating ? <><Sparkles className="mr-2 h-4 w-4 animate-spin" /> Designing...</> : <><Wand2 className="mr-2 h-4 w-4" /> Generate Transformation</>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <Navbar />
      
      <main className="flex-1 overflow-hidden relative flex flex-col md:flex-row">
        {isMobile ? (
          <div className="flex-1 flex flex-col overflow-hidden">
             {/* Mobile Preview Area */}
             <div className="flex-1 relative bg-muted/20 flex items-center justify-center p-4 min-h-[300px]">
                {/* Mobile Toolbar */}
                <div className="absolute top-2 right-2 z-20 flex space-x-1">
                   {generatedImage && (
                     <Button variant="secondary" size="icon" className="h-8 w-8 bg-background/80" onClick={() => setGeneratedImage(null)}>
                       <RefreshCcw className="w-4 h-4" />
                     </Button>
                   )}
                   {generatedImage && (
                     <Button 
                       variant="outline" 
                       size="icon" 
                       className="h-8 w-8 bg-background/80"
                       onClick={() => setIsShareModalOpen(true)}
                     >
                       <Share2 className="w-4 h-4" />
                     </Button>
                   )}
                </div>

                {generatedImage && uploadedImage ? (
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-xl border border-white/10 group bg-black">
                    <TransformationSlider beforeImage={uploadedImage} afterImage={generatedImage} />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
                      <Button size="sm" onClick={() => setIsProductSidebarOpen(true)} className="rounded-full bg-white text-black shadow-lg">
                        <ShoppingBag className="w-4 h-4 mr-2" /> Detect
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-4 max-w-xs">
                    <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-heading font-bold">Design Your Space</h2>
                    <p className="text-muted-foreground text-xs">Upload a photo to see the AI magic.</p>
                  </div>
                )}
             </div>

             {/* Mobile Controls Drawer */}
             <div className="border-t bg-card shrink-0 flex flex-col p-4">
                <Button 
                  size="lg" 
                  className="w-full h-12 font-bold shadow-lg rounded-full bg-linear-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white disabled:opacity-50" 
                  onClick={handleGenerate} 
                  disabled={isGenerating || !uploadedImage}
                >
                  {isGenerating ? <><Sparkles className="mr-2 h-4 w-4 animate-spin" /> Designing...</> : <><Wand2 className="mr-2 h-4 w-4" /> Generate Transformation</>}
                </Button>
                <Collapsible open={isMobileControlsOpen} onOpenChange={setIsMobileControlsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full h-10 rounded-none border-t flex items-center justify-between px-4">
                      <span className="text-xs font-bold uppercase tracking-widest">Configuration</span>
                      {isMobileControlsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ScrollArea className="h-[40vh]">
                      <Controls />
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
             </div>
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full rounded-none border-t">
            <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="bg-card border-r z-10 shadow-lg flex flex-col">
              <Controls />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={75} className="relative bg-muted/20">
               <div className="absolute top-4 right-4 z-20 flex space-x-2">
                  {generatedImage && <Button variant="secondary" size="sm" className="bg-background/80 shadow-sm" onClick={() => setGeneratedImage(null)}><RefreshCcw className="w-4 h-4 mr-2" /> Reset</Button>}
                  {generatedImage && <Button variant="outline" size="sm" className="bg-background/80 shadow-sm" onClick={() => setIsShareModalOpen(true)}><Share2 className="w-4 h-4 mr-2" /> Share</Button>}
                  {generatedImage && <Button variant="outline" size="sm" className="bg-background/80 shadow-sm" onClick={handleExport}><Download className="w-4 h-4 mr-2" /> Export</Button>}
               </div>
               <div className="w-full h-full flex flex-col items-center justify-center p-8 overflow-hidden">
                  {generatedImage && uploadedImage ? (
                    <div className="relative w-full h-full max-h-[80vh] aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 group bg-black">
                      <TransformationSlider beforeImage={uploadedImage} afterImage={generatedImage} />
                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-300 z-30">
                        <Button size="lg" onClick={() => setIsProductSidebarOpen(true)} className="rounded-full px-8 bg-white text-black hover:bg-white/90 shadow-xl border-2 border-transparent hover:border-primary/20 hover:scale-105 transition-all">
                          <ShoppingBag className="w-5 h-5 mr-2" /> Detect Products
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-6 max-w-lg animate-in fade-in zoom-in duration-500">
                      <div className="w-32 h-32 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-primary/5"><Sparkles className="w-12 h-12 text-primary" /></div>
                      <div className="space-y-2">
                        <h2 className="text-4xl font-heading font-bold text-foreground">Design Your Dream Space</h2>
                        <p className="text-muted-foreground text-lg leading-relaxed">Upload a photo of your room, choose a style, and let our AI reimagine your space in seconds.</p>
                      </div>
                    </div>
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
