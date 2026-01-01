import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Shield, Zap, CreditCard, Loader } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getAvatarImage } from "@/config/avatars";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, refreshAuth } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      // Only set username on initial load, not on every user change
      if (!username) {
        setUsername(user.name || "");
      }
    }
  }, []);

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
      const response = await fetch("/api/auth/update-profile", {
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-6">
            <Avatar className="w-24 h-24 border-4 border-primary/10 overflow-hidden">
              <img
                src={getAvatarUrl()}
                alt="User avatar"
                className="w-full h-full object-cover"
              />
              <AvatarFallback>{getInitials()}</AvatarFallback>
            </Avatar>
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
        </div>
      </main>
    </div>
  );
}
