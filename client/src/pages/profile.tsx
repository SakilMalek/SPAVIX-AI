import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Shield, Zap, CreditCard, Loader, Camera, Edit2, Check, Key } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getAvatarImage } from "@/config/avatars";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ProfilePage() {
  const { user, refreshAuth } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      // Only set username on initial load, not on every user change
      if (!username) {
        setUsername(user.name || "");
      }
      // Set selected avatar
      if (!selectedAvatar && user.profilePicture && !user.profilePicture.startsWith("http")) {
        setSelectedAvatar(user.profilePicture);
      }
    }
  }, [user, username, selectedAvatar]);

  const getAvatarUrl = () => {
    if (!user?.profilePicture) return getAvatarImage("avatar-1");
    if (user.profilePicture.startsWith("http")) {
      return user.profilePicture;
    }
    return getAvatarImage(user.profilePicture);
  };

  const getInitials = () => {
    if (!user?.username) return "U";
    const parts = user.username.split("@")[0].split(".");
    return parts.map(p => p[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleSaveProfile = async () => {
    if (!username.trim()) {
      toast.error("Username cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const { getApiUrl } = await import("@/config/api");
      const response = await fetch(getApiUrl("/api/auth/update-profile"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ name: username }),
      });

      if (!response.ok) {
        toast.error("Failed to update profile");
        return;
      }

      // Refresh auth to update the user context
      await refreshAuth();
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Error updating profile");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (avatarId: string) => {
    try {
      const token = localStorage.getItem("token");
      const { getApiUrl } = await import("@/config/api");
      
      const response = await fetch(getApiUrl("/api/auth/profile"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ profilePicture: avatarId }),
      });

      if (!response.ok) {
        toast.error("Failed to update avatar");
        return;
      }

      setSelectedAvatar(avatarId);
      await refreshAuth();
      toast.success("Avatar updated successfully!");
      setIsAvatarDialogOpen(false);
    } catch (error) {
      toast.error("Error updating avatar");
      console.error(error);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setIsChangingPassword(true);
    try {
      const token = localStorage.getItem("token");
      const { getApiUrl } = await import("@/config/api");
      
      const response = await fetch(getApiUrl("/api/auth/change-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to change password");
      }

      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-6">
            <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
              <DialogTrigger asChild>
                <div className="relative group cursor-pointer">
                  <Avatar className="w-24 h-24 border-4 border-primary/10 overflow-hidden">
                    <img
                      src={getAvatarUrl()}
                      alt="User avatar"
                      className="w-full h-full object-cover"
                    />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Choose Avatar</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-96">
                  <div className="grid grid-cols-4 gap-4 p-4">
                    {Array.from({ length: 24 }, (_, i) => {
                      const avatarId = `avatar-${i + 1}`;
                      const isSelected = selectedAvatar === avatarId;
                      return (
                        <button
                          key={avatarId}
                          onClick={() => handleAvatarChange(avatarId)}
                          className={cn(
                            "relative group rounded-lg overflow-hidden border-2 transition-all",
                            isSelected ? "border-primary" : "border-transparent hover:border-primary/50"
                          )}
                        >
                          <img
                            src={getAvatarImage(avatarId)}
                            alt={`Avatar ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <Check className="w-6 h-6 text-primary" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
            <div>
              <h1 className="text-3xl font-heading font-bold">{username || email.split("@")[0]}</h1>
              <div className="flex gap-2 mt-2">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none">
                  <Zap className="w-3 h-3 mr-1" /> Member
                </Badge>
                <Badge variant="outline">Active</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="md:col-span-2 glass-panel border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl">Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="username" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        className="pl-10" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="email" 
                        value={email} 
                        disabled
                        className="pl-10 bg-muted" 
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Email address cannot be changed. Contact support if you need to update it.
                    </p>
                  </div>
                </div>
                <Button 
                  className="w-full md:w-auto"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Update Profile"
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-panel border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl">Account Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-sm font-semibold mb-1">Email</p>
                  <p className="text-sm break-all text-primary">{email}</p>
                  <p className="text-xs text-muted-foreground mt-2">Your registered email address</p>
                </div>
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-sm font-semibold mb-1">Avatar</p>
                  <p className="text-sm text-primary">
                    {user?.profilePicture?.startsWith("http") ? "Google Profile" : "Custom Avatar"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Your profile picture</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Password Change Section */}
          <Card className="glass-panel border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Key className="w-5 h-5" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Changing Password...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
