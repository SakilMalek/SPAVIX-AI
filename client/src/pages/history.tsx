import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TransformationSlider } from "@/components/dashboard/TransformationSlider";
import { Clock, Download, Share2, Trash2, Loader, RefreshCw, Copy, Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

interface Transformation {
  id: string;
  before_image_url: string;
  after_image_url: string;
  style: string;
  room_type: string;
  created_at: string;
}

const fetchTransformations = async (): Promise<Transformation[]> => {
  const token = localStorage.getItem("token");
  const response = await fetch("/api/generations", {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load transformation history");
  }

  return response.json();
};

const fetchProjects = async () => {
  const token = localStorage.getItem("token");
  const response = await fetch("/api/projects", {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
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

  const { data: transformations = [], isLoading, error, refetch } = useQuery({
    queryKey: ["transformations"],
    queryFn: fetchTransformations,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
    retry: 2,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

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
      const token = localStorage.getItem("token");
      
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
      const response = await fetch(`/api/generations/${linkTargetId}/project`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
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
      const token = localStorage.getItem("token");
      
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
      const response = await fetch(`/api/generations/${deleteTargetId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
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
      const response = await fetch(afterImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
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
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/generations/${id}/share`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
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
              <Clock className="w-3 h-3 mr-2" /> {transformations.length} Transformations
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

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : transformations.length === 0 ? (
          <Card className="glass-panel border-none shadow-xl">
            <CardContent className="p-12 text-center">
              <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No transformations yet</h3>
              <p className="text-muted-foreground">Start creating transformations to see them here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {transformations.map((item) => (
              <Card key={item.id} className="glass-panel overflow-hidden border-none shadow-xl group">
                <CardContent className="p-0 aspect-video relative">
                  <TransformationSlider 
                    beforeImage={item.before_image_url}
                    afterImage={item.after_image_url}
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
      </main>
    </div>
  );
}
