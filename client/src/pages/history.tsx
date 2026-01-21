import { useState, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TransformationSlider } from "@/components/dashboard/TransformationSlider";
import { 
  Clock, 
  Search, 
  Download, 
  Share2, 
  Trash2, 
  Link2, 
  Loader,
  RefreshCw, 
  Copy, 
  Check, 
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TransformationCardSkeleton } from "@/components/SkeletonLoader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { useSubscription } from "@/hooks/useSubscription";
import { addWatermarkToImage } from "@/lib/watermark";

interface Transformation {
  id: string;
  before_image_url: string;
  after_image_url: string;
  style: string;
  room_type: string;
  created_at: string;
}

interface HistoryResponse {
  generationId: string;
  totalVersions: number;
  currentPage: number;
  pageSize: number;
  history: Array<{
    id: string;
    version_number: number;
    style: string;
    room_type: string;
    status: string;
    created_at: string;
  }>;
}

const fetchTransformations = async (limit: number = 50, offset: number = 0): Promise<Transformation[]> => {
  const { getApiUrl } = await import("@/config/api");
  
  const startTime = performance.now();
  console.log(`[HISTORY] Starting to fetch transformations (limit=${limit}, offset=${offset})`);
  
  // First, get all generations (metadata only, no images)
  const fetchStart = performance.now();
  const response = await fetch(getApiUrl(`/api/generations?limit=${limit}&offset=${offset}`), {
    credentials: 'include',
  });
  const fetchDuration = performance.now() - fetchStart;
  console.log(`[HISTORY] Fetch request completed in ${fetchDuration.toFixed(2)}ms`);

  if (!response.ok) {
    throw new Error("Failed to load transformation history");
  }

  const parseStart = performance.now();
  const data = await response.json();
  const parseDuration = performance.now() - parseStart;
  console.log(`[HISTORY] JSON parsing completed in ${parseDuration.toFixed(2)}ms, received ${data.length} items`);
  
  // Return metadata immediately without waiting for images
  // Images will be loaded on-demand when user views them
  const result = data.map((gen: any) => ({
    id: gen.id,
    style: gen.style,
    room_type: gen.room_type,
    created_at: gen.created_at,
    before_image_url: "", // Will be loaded on-demand
    after_image_url: "", // Will be loaded on-demand
  }));
  
  const totalDuration = performance.now() - startTime;
  console.log(`[HISTORY] Total fetch time: ${totalDuration.toFixed(2)}ms`);
  
  return result;
};

const fetchProjects = async () => {
  const { getApiUrl } = await import("@/config/api");
  const response = await fetch(getApiUrl("/api/projects"), {
    credentials: 'include',
  });
  if (!response.ok) throw new Error("Failed to fetch projects");
  return response.json();
};

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [linkProjectDialogOpen, setLinkProjectDialogOpen] = useState(false);
  const [linkTargetId, setLinkTargetId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isLinking, setIsLinking] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 50;
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStyle, setFilterStyle] = useState<string>("");
  const [filterRoomType, setFilterRoomType] = useState<string>("");

  const { data: transformations = [], isLoading, error, refetch } = useQuery({
    queryKey: ["transformations", currentPage],
    queryFn: () => fetchTransformations(pageSize, currentPage * pageSize),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
    retry: 2,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  // Filter and search transformations
  const filteredTransformations = useMemo(() => {
    return transformations.filter((t) => {
      const matchesSearch = searchQuery === "" || 
        t.style.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.room_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        new Date(t.created_at).toLocaleDateString().includes(searchQuery);
      
      const matchesStyle = filterStyle === "" || t.style === filterStyle;
      const matchesRoomType = filterRoomType === "" || t.room_type === filterRoomType;
      
      return matchesSearch && matchesStyle && matchesRoomType;
    });
  }, [transformations, searchQuery, filterStyle, filterRoomType]);

  // Get unique styles and room types for filter dropdowns
  const uniqueStyles = useMemo(() => {
    return Array.from(new Set(transformations.map(t => t.style)));
  }, [transformations]);

  const uniqueRoomTypes = useMemo(() => {
    return Array.from(new Set(transformations.map(t => t.room_type)));
  }, [transformations]);

  if (error) {
    toast.error("Failed to load transformation history");
  }

  const handleLinkProject = async () => {
    if (!linkTargetId || !selectedProjectId) {
      toast.error("Please select a project");
      return;
    }

    setIsLinking(true);
    const previousData = queryClient.getQueryData(["transformations"]);
    
    try {
      // Optimistically update UI immediately
      queryClient.setQueryData(["transformations"], (oldData: any[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(t => 
          t.id === linkTargetId ? { ...t, project_id: selectedProjectId } : t
        );
      });

      toast.success("Transformation linked to project!");
      setLinkProjectDialogOpen(false);
      setLinkTargetId(null);
      setSelectedProjectId("");

      // Then make the API call in the background
      const { getApiUrl } = await import("@/config/api");
      const response = await fetch(getApiUrl(`/api/generations/${linkTargetId}/project`), {
        method: "PUT",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId: selectedProjectId }),
      });

      if (!response.ok) {
        // Revert on error
        queryClient.setQueryData(["transformations"], previousData);
        toast.error("Failed to link transformation to project");
        return;
      }

      // Invalidate project transformations to refresh project view
      await queryClient.invalidateQueries({ queryKey: ["projectTransformations"] });
    } catch (error) {
      console.error("Error linking project:", error);
      // Revert on error
      queryClient.setQueryData(["transformations"], previousData);
      toast.error("Error linking transformation");
    } finally {
      setIsLinking(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["transformations"] });
      await refetch();
      toast.success("Transformations refreshed");
    } catch (error) {
      console.error("Error refreshing:", error);
      toast.error("Failed to refresh transformations");
    } finally {
      setIsRefreshing(false);
    }
  };

  const openDeleteDialog = (id: string) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;

    try {
      // Optimistically update the UI immediately
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
      
      // Update cache optimistically by removing the item
      queryClient.setQueryData(["transformations"], (oldData: Transformation[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.filter(t => t.id !== deleteTargetId);
      });
      
      toast.success("Transformation deleted successfully");
      
      // Then make the delete request to the server
      const { getApiUrl } = await import("@/config/api");
      const response = await fetch(getApiUrl(`/api/generations/${deleteTargetId}`), {
        method: "DELETE",
        credentials: 'include',
      });

      if (!response.ok) {
        // If delete fails, refetch to restore the old data
        await refetch();
        toast.error("Failed to delete transformation");
      }
    } catch (error) {
      console.error("Error deleting transformation:", error);
      // Refetch on error to restore the old data
      await refetch();
      toast.error("Error deleting transformation");
    }
  };

  const handleDownload = async (id: string, afterImageUrl: string) => {
    try {
      const { subscription } = useSubscription();
      const planName = subscription?.plan?.name?.toLowerCase();
      
      let blobToDownload: Blob;
      
      // Add watermark for Starter plan users
      if (planName === 'starter') {
        toast.info("Adding watermark to your image...");
        blobToDownload = await addWatermarkToImage(afterImageUrl);
      } else {
        const response = await fetch(afterImageUrl);
        blobToDownload = await response.blob();
      }
      
      const url = window.URL.createObjectURL(blobToDownload);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transformation-${id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Image downloaded");
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Error downloading image");
    }
  };

  const handleShare = async (id: string) => {
    try {
      const { getApiUrl } = await import("@/config/api");
      const response = await fetch(getApiUrl(`/api/generations/${id}/share`), {
        method: "POST",
        credentials: 'include',
      });

      if (!response.ok) {
        toast.error("Failed to generate share link");
        return;
      }

      const data = await response.json();
      const shareUrl = `${window.location.origin}/share/${data.shareId}`;
      setShareLink(shareUrl);
      setShareDialogOpen(true);
    } catch (error) {
      console.error("Error generating share link:", error);
      toast.error("Error generating share link");
    }
  };

  const copyToClipboard = async (text: string, shareId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedShareId(shareId);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopiedShareId(null), 2000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast.error("Failed to copy link");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold">Transformation History</h1>
            <p className="text-muted-foreground">Keep track of all your AI designs</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="px-3 py-1">
              <Clock className="w-3 h-3 mr-2" /> {filteredTransformations.length} Transformations
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by style, room type, or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStyle || "none"} onValueChange={(value) => setFilterStyle(value === "none" ? "" : value)}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Filter by style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All Styles</SelectItem>
                {uniqueStyles.map((style) => (
                  <SelectItem key={style} value={style}>
                    {style}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterRoomType || "none"} onValueChange={(value) => setFilterRoomType(value === "none" ? "" : value)}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Filter by room" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All Rooms</SelectItem>
                {uniqueRoomTypes.map((roomType) => (
                  <SelectItem key={roomType} value={roomType}>
                    {roomType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <TransformationCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : transformations.length === 0 ? (
          <Card className="glass-panel border-none shadow-xl">
            <CardContent className="p-12 text-center">
              <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No transformations yet</h3>
              <p className="text-muted-foreground">Start creating transformations to see them here</p>
            </CardContent>
          </Card>
        ) : filteredTransformations.length === 0 ? (
          <Card className="glass-panel border-none shadow-xl">
            <CardContent className="p-12 text-center">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredTransformations.map((item) => (
              <Card key={item.id} className="glass-panel overflow-hidden border-none shadow-xl group">
                <CardContent className="p-0 aspect-video relative">
                  <TransformationSlider 
                    beforeImage={item.before_image_url}
                    afterImage={item.after_image_url}
                    generationId={item.id}
                  />
                </CardContent>
                <CardFooter className="p-6 flex justify-between items-center bg-card/50">
                  <div className="space-y-1">
                    <h3 className="font-bold capitalize">{item.room_type} - {item.style}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{item.style}</span>
                      <span>•</span>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full"
                      onClick={() => {
                        setLinkTargetId(item.id);
                        setLinkProjectDialogOpen(true);
                      }}
                      title="Link to Project"
                    >
                      <Link2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full"
                      onClick={() => handleDownload(item.id, item.after_image_url)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full"
                      onClick={() => handleShare(item.id)}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full text-destructive hover:bg-destructive/10"
                      onClick={() => openDeleteDialog(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
          
        {/* Load More Button */}
        {transformations.length === pageSize && (
          <div className="flex justify-center mt-8">
            <Button 
              variant="outline" 
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              Load More
            </Button>
          </div>
        )}

        {/* Link to Project Dialog */}
        <Dialog open={linkProjectDialogOpen} onOpenChange={setLinkProjectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link to Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select a Project</label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">No projects available</div>
                    ) : (
                      projects.map((project: any) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkProjectDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleLinkProject} 
                disabled={isLinking || !selectedProjectId}
              >
                {isLinking ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Linking...
                  </>
                ) : (
                  "Link"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Transformation?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this transformation? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Share Dialog */}
        {shareLink && (
          <AlertDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Share Transformation</AlertDialogTitle>
                <AlertDialogDescription>
                  Copy this link to share your transformation with others
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex gap-2 mt-4">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-md bg-muted text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(shareLink, deleteTargetId || "")}
                  className="gap-2"
                >
                  {copiedShareId === deleteTargetId ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <AlertDialogFooter className="mt-4">
                <AlertDialogCancel>Close</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Pagination Controls */}
        {transformations.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-12 pt-8 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0 || isLoading}
            >
              Previous
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page <span className="font-semibold">{currentPage + 1}</span>
              </span>
            </div>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={transformations.length < pageSize || isLoading}
            >
              Next
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
