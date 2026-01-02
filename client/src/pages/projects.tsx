import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Send, 
  Bot, 
  MoreVertical,
  History as HistoryIcon,
  Menu,
  ChevronLeft,
  Loader,
  Trash2,
  Edit2,
  X,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { TransformationSlider } from "@/components/dashboard/TransformationSlider";

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

const fetchProjects = async (): Promise<Project[]> => {
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

const fetchProjectTransformations = async (projectId: string): Promise<any[]> => {
  const token = localStorage.getItem("token");
  const response = await fetch(`/api/generations/project/${projectId}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch transformations");
  return response.json();
};

interface ProjectListProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredProjects: any[];
  selectedProjectId: string | null;
  isLoading: boolean;
  handleOpenCreateDialog: () => void;
  handleProjectSelect: (projectId: string) => void;
}

const ProjectListComponent = memo(({
  searchQuery,
  setSearchQuery,
  filteredProjects,
  selectedProjectId,
  isLoading,
  handleOpenCreateDialog,
  handleProjectSelect,
}: ProjectListProps) => (
  <div className="h-full flex flex-col bg-card">
    <div className="p-4 border-b space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold font-heading">Projects</h2>
        <Button 
          size="icon" 
          variant="ghost" 
          className="rounded-full h-8 w-8"
          onClick={handleOpenCreateDialog}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input 
          placeholder="Search..." 
          className="pl-9 h-9 text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
        />
      </div>
    </div>
    <ScrollArea className="flex-1">
      {isLoading ? (
        <div className="p-4 flex items-center justify-center">
          <Loader className="w-4 h-4 animate-spin" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          {searchQuery ? "No projects found" : "No projects yet. Create one!"}
        </div>
      ) : (
        <div className="p-2 space-y-1">
          {filteredProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleProjectSelect(project.id)}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left group",
                selectedProjectId === project.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
              )}
            >
              <div className="w-10 h-10 rounded bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold">{project.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs truncate">{project.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{project.description || "No description"}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </ScrollArea>
  </div>
));

ProjectListComponent.displayName = "ProjectList";

interface ChatInterfaceProps {
  chatMessage: string;
  setChatMessage: (message: string) => void;
  chatMessages: Array<{ role: "user" | "bot"; content: string }>;
  isSendingMessage: boolean;
  handleSendChatMessage: () => void;
  isMobile: boolean;
  handleCloseChat: () => void;
}

const ChatInterfaceComponent = memo(({
  chatMessage,
  setChatMessage,
  chatMessages,
  isSendingMessage,
  handleSendChatMessage,
  isMobile,
  handleCloseChat,
}: ChatInterfaceProps) => (
  <div className="h-full flex flex-col bg-card border-l">
    <div className="p-3 border-b flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4 text-primary" />
        <span className="font-bold text-xs">Project Assistant</span>
      </div>
      {isMobile && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCloseChat}><ChevronLeft className="w-4 h-4" /></Button>}
    </div>
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4 text-xs">
        {chatMessages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`p-2.5 rounded-xl max-w-[85%] ${msg.role === "bot" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isSendingMessage && (
          <div className="flex gap-2">
            <div className="p-2.5 rounded-xl bg-muted flex items-center gap-1">
              <span className="animate-pulse">●</span>
              <span className="animate-pulse">●</span>
              <span className="animate-pulse">●</span>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
    <div className="p-3 border-t">
      <div className="relative flex gap-2">
        <Input 
          placeholder="Ask advice..." 
          className="h-9 text-xs rounded-lg" 
          value={chatMessage} 
          onChange={(e) => setChatMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !isSendingMessage) {
              handleSendChatMessage();
            }
          }}
          disabled={isSendingMessage}
          autoComplete="off"
        />
        <Button 
          size="icon" 
          className="h-9 w-9 shrink-0" 
          disabled={!chatMessage.trim() || isSendingMessage}
          onClick={handleSendChatMessage}
        >
          {isSendingMessage ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  </div>
));

ChatInterfaceComponent.displayName = "ChatInterface";

export default function ProjectsPage() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [isProjectListOpen, setIsProjectListOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "bot"; content: string }>>([
    { role: "bot", content: "Hello! I'm here to help you with your project. Ask me anything about design, materials, or transformations!" }
  ]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [selectedTransformation, setSelectedTransformation] = useState<any | null>(null);
  const [isTransformationModalOpen, setIsTransformationModalOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameProjectName, setRenameProjectName] = useState("");
  const [isRenamingProject, setIsRenamingProject] = useState(false);
  const [isRefreshingTransformations, setIsRefreshingTransformations] = useState(false);

  const { data: projects = [], isLoading, refetch } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  const { data: transformations = [], isLoading: isLoadingTransformations, refetch: refetchTransformations } = useQuery({
    queryKey: ["projectTransformations", selectedProjectId],
    queryFn: () => selectedProjectId ? fetchProjectTransformations(selectedProjectId) : Promise.resolve([]),
    enabled: !!selectedProjectId,
  });

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  
  const filteredProjects = useMemo(() => 
    projects.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [projects, searchQuery]
  );

  const handleCreateProject = useCallback(async () => {
    if (!newProjectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsCreating(true);
    try {
      const token = localStorage.getItem("token");
      const { getApiUrl } = await import("@/config/api");
      const response = await fetch(getApiUrl("/api/projects"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
        }),
      });

      if (!response.ok) {
        toast.error("Failed to create project");
        return;
      }

      const newProject = await response.json();
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      setSelectedProjectId(newProject.id);
      setNewProjectName("");
      setNewProjectDescription("");
      setIsCreateDialogOpen(false);
      toast.success("Project created successfully!");
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Error creating project");
    } finally {
      setIsCreating(false);
    }
  }, [newProjectName, newProjectDescription, queryClient]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      const token = localStorage.getItem("token");
      const { getApiUrl } = await import("@/config/api");
      const response = await fetch(getApiUrl(`/api/projects/${projectId}`), {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        toast.error("Failed to delete project");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (selectedProjectId === projectId) {
        setSelectedProjectId(projects.length > 1 ? projects[0].id : null);
      }
      toast.success("Project deleted successfully!");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Error deleting project");
    }
  }, [selectedProjectId, projects, queryClient]);

  const handleOpenRenameDialog = useCallback(() => {
    if (selectedProject) {
      setRenameProjectName(selectedProject.name);
      setIsRenameDialogOpen(true);
    }
  }, [selectedProject]);

  const handleRenameProject = useCallback(async () => {
    if (!selectedProjectId || !renameProjectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsRenamingProject(true);
    try {
      const token = localStorage.getItem("token");
      const { getApiUrl } = await import("@/config/api");
      const response = await fetch(getApiUrl(`/api/projects/${selectedProjectId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: renameProjectName,
          description: selectedProject?.description || "",
        }),
      });

      if (!response.ok) {
        toast.error("Failed to rename project");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      setIsRenameDialogOpen(false);
      toast.success("Project renamed successfully!");
    } catch (error) {
      console.error("Error renaming project:", error);
      toast.error("Error renaming project");
    } finally {
      setIsRenamingProject(false);
    }
  }, [selectedProjectId, renameProjectName, selectedProject, queryClient]);

  const handleShareProject = useCallback(async () => {
    if (!selectedProjectId) {
      toast.error("Please select a project first");
      return;
    }

    setIsCreatingShare(true);
    try {
      const token = localStorage.getItem("token");
      const { getApiUrl } = await import("@/config/api");
      const response = await fetch(getApiUrl(`/api/projects/${selectedProjectId}/share`), {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        toast.error("Failed to create share link");
        return;
      }

      const data = await response.json();
      const shareUrl = `${window.location.origin}/shared-project/${data.shareId}`;
      setShareLink(shareUrl);
      toast.success("Share link created!");
    } catch (error) {
      console.error("Error creating share link:", error);
      toast.error("Error creating share link");
    } finally {
      setIsCreatingShare(false);
    }
  }, [selectedProjectId]);

  const handleCopyShareLink = useCallback(async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopiedShareId("link");
      setTimeout(() => setCopiedShareId(null), 2000);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  }, [shareLink]);

  const handleSendChatMessage = useCallback(async () => {
    if (!chatMessage.trim() || !selectedProjectId) return;

    const userMessage = chatMessage;
    setChatMessage("");
    
    // Add user message to chat
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsSendingMessage(true);

    try {
      const token = localStorage.getItem("token");
      const { getApiUrl } = await import("@/config/api");
      const response = await fetch(getApiUrl("/api/chat"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          message: userMessage,
        }),
      });

      if (!response.ok) {
        toast.error("Failed to send message");
        return;
      }

      const data = await response.json();
      
      // Add bot response to chat
      setChatMessages(prev => [...prev, { role: "bot", content: data.response }]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Error sending message");
    } finally {
      setIsSendingMessage(false);
    }
  }, [chatMessage, selectedProjectId]);

  const handleProjectSelect = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setIsProjectListOpen(false);
  }, []);

  const handleOpenCreateDialog = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  const handleCloseChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  const handleRefreshTransformations = useCallback(async () => {
    setIsRefreshingTransformations(true);
    try {
      await refetchTransformations();
      toast.success("Transformations refreshed!");
    } catch (error) {
      console.error("Error refreshing transformations:", error);
      toast.error("Failed to refresh transformations");
    } finally {
      setIsRefreshingTransformations(false);
    }
  }, [refetchTransformations]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Navbar />
      <main className="flex-1 flex overflow-hidden">
        {/* Desktop Project List */}
        {!isMobile && (
          <div className="w-64 shrink-0">
            <ProjectListComponent
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filteredProjects={filteredProjects}
              selectedProjectId={selectedProjectId}
              isLoading={isLoading}
              handleOpenCreateDialog={handleOpenCreateDialog}
              handleProjectSelect={handleProjectSelect}
            />
          </div>
        )}

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between bg-card">
            <div className="flex items-center gap-3">
              {isMobile && (
                <Sheet open={isProjectListOpen} onOpenChange={setIsProjectListOpen}>
                  <SheetTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Menu className="w-4 h-4" /></Button></SheetTrigger>
                  <SheetContent side="left" className="p-0 w-72">
                    <ProjectListComponent
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      filteredProjects={filteredProjects}
                      selectedProjectId={selectedProjectId}
                      isLoading={isLoading}
                      handleOpenCreateDialog={handleOpenCreateDialog}
                      handleProjectSelect={handleProjectSelect}
                    />
                  </SheetContent>
                </Sheet>
              )}
              <div>
                <h2 className="text-lg md:text-xl font-bold font-heading truncate max-w-[150px] md:max-w-none">{selectedProject?.name || "Select a project"}</h2>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                  <HistoryIcon className="w-3 h-3" /> {selectedProject?.description || "No description"}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              {isMobile && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsChatOpen(true)}><Bot className="w-4 h-4" /></Button>}
              <Button 
                variant="outline" 
                size="icon"
                className="h-8 w-8 hidden sm:flex"
                onClick={handleRefreshTransformations}
                disabled={isRefreshingTransformations}
                title="Refresh transformations"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshingTransformations ? 'animate-spin' : ''}`} />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs hidden sm:flex"
                onClick={() => setIsShareDialogOpen(true)}
              >
                Share
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleOpenRenameDialog}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => selectedProjectId && handleDeleteProject(selectedProjectId)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <ScrollArea className="flex-1 bg-muted/20">
            <div className="p-4 md:p-8">
              {isLoadingTransformations ? (
                <div className="flex items-center justify-center py-20">
                  <Loader className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                  <button 
                    onClick={() => {
                      localStorage.setItem('selectedProjectId', selectedProjectId || '');
                      window.location.href = '/dashboard';
                    }}
                    className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 transition-all group"
                  >
                    <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-[10px] md:text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">New Design</span>
                  </button>
                  {transformations.length === 0 ? (
                    <div className="col-span-2 lg:col-span-2 flex flex-col items-center justify-center py-20 text-center">
                      <p className="text-muted-foreground">No transformations yet</p>
                      <p className="text-sm text-muted-foreground/60">Click "New Design" to create one</p>
                    </div>
                  ) : (
                    transformations.map((transformation: any) => (
                      <Card 
                        key={transformation.id} 
                        className="aspect-square overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative"
                        onClick={() => {
                          setSelectedTransformation(transformation);
                          setIsTransformationModalOpen(true);
                        }}
                      >
                        <img 
                          src={transformation.after_image_url} 
                          alt={`${transformation.style} - ${transformation.room_type}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end p-2">
                          <div className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="capitalize">{transformation.room_type}</p>
                            <p className="text-[10px] text-white/80">{transformation.style}</p>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Desktop/Mobile Chat */}
        {!isMobile && (
          <div className="w-80 shrink-0">
            <ChatInterfaceComponent
              chatMessage={chatMessage}
              setChatMessage={setChatMessage}
              chatMessages={chatMessages}
              isSendingMessage={isSendingMessage}
              handleSendChatMessage={handleSendChatMessage}
              isMobile={isMobile}
              handleCloseChat={handleCloseChat}
            />
          </div>
        )}
        {isMobile && (
          <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
            <SheetContent side="right" className="p-0 w-full sm:w-[400px]">
              <ChatInterfaceComponent
                chatMessage={chatMessage}
                setChatMessage={setChatMessage}
                chatMessages={chatMessages}
                isSendingMessage={isSendingMessage}
                handleSendChatMessage={handleSendChatMessage}
                isMobile={isMobile}
                handleCloseChat={handleCloseChat}
              />
            </SheetContent>
          </Sheet>
        )}
      </main>

      {/* Create Project Modal */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="e.g., Living Room Redesign"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description (Optional)</Label>
              <Textarea
                id="project-description"
                placeholder="Describe your project..."
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={isCreating || !newProjectName.trim()}
            >
              {isCreating ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Project Modal */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Share Project</DialogTitle>
          </DialogHeader>
          {!shareLink ? (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Generate a shareable link for this project so others can view all transformations.
              </p>
              <Button
                onClick={handleShareProject}
                disabled={isCreatingShare}
                className="w-full"
              >
                {isCreatingShare ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Creating Link...
                  </>
                ) : (
                  "Generate Share Link"
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Share this link with others to let them view your project:
              </p>
              <div className="flex gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="text-sm"
                />
                <Button
                  size="icon"
                  onClick={handleCopyShareLink}
                  variant={copiedShareId === "link" ? "default" : "outline"}
                >
                  {copiedShareId === "link" ? "✓" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can view the project and all its transformations.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsShareDialogOpen(false);
                setShareLink(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transformation Detail Modal */}
      <Dialog open={isTransformationModalOpen} onOpenChange={setIsTransformationModalOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="capitalize">
                {selectedTransformation?.room_type} - {selectedTransformation?.style}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedTransformation && new Date(selectedTransformation.created_at).toLocaleDateString()}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsTransformationModalOpen(false)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogHeader>
          
          {selectedTransformation && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <TransformationSlider
                beforeImage={selectedTransformation.before_image_url}
                afterImage={selectedTransformation.after_image_url}
                className="h-full"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rename Project Modal */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-project-name">Project Name</Label>
              <Input
                id="rename-project-name"
                placeholder="Enter new project name"
                value={renameProjectName}
                onChange={(e) => setRenameProjectName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !isRenamingProject) {
                    handleRenameProject();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRenameDialogOpen(false)}
              disabled={isRenamingProject}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameProject}
              disabled={isRenamingProject || !renameProjectName.trim()}
            >
              {isRenamingProject ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Renaming...
                </>
              ) : (
                "Rename"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
