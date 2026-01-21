import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Shield, Zap, CreditCard, Loader, Camera, Edit2, Check, Key, Sparkles, TrendingUp, Crown, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/context/SubscriptionContext";
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
import { Progress } from "@/components/ui/progress";

export default function ProfilePage() {
  const { user, refreshAuth } = useAuth();
  const subscription = useSubscription();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [usageData, setUsageData] = useState({ transformations: 0, limit: 5 });
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      // Only set username on initial load, not on every user change
      if (!username) {
        setUsername(user.name || "");
      }
      // Set selected avatar (only if it's a preset avatar ID, not a URL or data URL)
      if (!selectedAvatar && user.profilePicture && !user.profilePicture.startsWith("http") && !user.profilePicture.startsWith("data:")) {
        setSelectedAvatar(user.profilePicture);
      }
      // Fetch usage data
      fetchUsageData();
    }
  }, [user, username, selectedAvatar]);

  // Force re-render when subscription changes and update usage data
  useEffect(() => {
    // Refetch usage data when plan changes
    if (subscription.subscription?.plan?.name) {
      fetchUsageData();
    }
  }, [subscription.subscription?.plan?.name]);

  const fetchUsageData = async () => {
    try {
      const { getApiUrl } = await import("@/config/api");
      
      const response = await fetch(getApiUrl("/api/auth/usage"), {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUsageData({
          transformations: data.transformations || 0,
          limit: data.limit || 5,
        });
      }
    } catch (error) {
      console.error("Failed to fetch usage data:", error);
    }
  };

  const getAvatarUrl = () => {
    if (!user?.profilePicture) return getAvatarImage("avatar-1");
    // Check if it's a URL (http/https) or base64 data URL
    if (user.profilePicture.startsWith("http") || user.profilePicture.startsWith("data:")) {
      return user.profilePicture;
    }
    // Otherwise it's a preset avatar ID
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
      const { getApiUrl } = await import("@/config/api");
      const response = await fetch(getApiUrl("/api/auth/update-profile"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
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
      const { getApiUrl } = await import("@/config/api");
      
      const response = await fetch(getApiUrl("/api/auth/profile"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
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
      const { getApiUrl } = await import("@/config/api");
      
      const response = await fetch(getApiUrl("/api/auth/change-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
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

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setIsUploadingPicture(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64String = event.target?.result as string;

        const { getApiUrl } = await import("@/config/api");

        const response = await fetch(getApiUrl("/api/auth/upload-picture"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'include',
          body: JSON.stringify({ file: base64String }),
        });

        if (!response.ok) {
          throw new Error("Failed to upload picture");
        }

        const data = await response.json();
        await refreshAuth();
        toast.success("Profile picture updated successfully!");
        setIsAvatarDialogOpen(false);
        setIsUploadingPicture(false);
      };

      reader.onerror = () => {
        toast.error("Failed to read file");
        setIsUploadingPicture(false);
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload picture");
      setIsUploadingPicture(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getTransformationUsage = () => {
    if (!subscription.subscription) return { used: 0, limit: 5 };
    
    const planName = subscription.subscription.plan?.name || "starter";
    if (planName === "pro" || planName === "business") {
      return { used: 0, limit: -1 }; // Unlimited
    }
    
    // For starter plan, get usage from subscription context
    // This would need to be fetched from the API
    return { used: 0, limit: 5 };
  };

  const handleUpgradePlan = async (planName: string) => {
    setUpgradingPlan(planName);
    try {
      const { getApiUrl } = await import("@/config/api");

      const response = await fetch(getApiUrl("/api/subscriptions/change-plan"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({ planName }),
      });

      if (!response.ok) {
        try {
          const error = await response.json();
          throw new Error(error.error || `Failed to change plan (${response.status})`);
        } catch (parseError) {
          throw new Error(`Failed to change plan (${response.status}): ${response.statusText}`);
        }
      }

      // Wait a brief moment for the backend to process
      await new Promise(resolve => setTimeout(resolve, 500));

      // Refresh auth first to update user context
      await refreshAuth();
      
      // Then refetch subscription data - this will trigger UI update
      await subscription.refetch();
      
      // Small delay to ensure state updates are processed
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const actionText = planName === "starter" ? "downgraded to" : "upgraded to";
      toast.success(`Successfully ${actionText} ${planName} plan!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to change plan");
    } finally {
      setUpgradingPlan(null);
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
              <DialogContent className="max-w-2xl" aria-describedby="avatar-dialog-description">
                <DialogHeader>
                  <DialogTitle>Choose Avatar or Upload Picture</DialogTitle>
                  <p id="avatar-dialog-description" className="sr-only">
                    Upload a profile picture from your device or choose from preset avatars
                  </p>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}>
                    <Camera className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Upload from Device</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureUpload}
                      className="hidden"
                      disabled={isUploadingPicture}
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-muted"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or choose preset</span>
                    </div>
                  </div>
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
                </div>
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

          {/* Plan Upgrade Section */}
          <Card className="glass-panel border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                Upgrade Your Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Starter Plan */}
                <div 
                  key={`starter-${subscription.subscription?.plan?.name}`}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all",
                    subscription.subscription?.plan?.name?.toLowerCase() === "starter" 
                      ? "border-primary bg-primary/5" 
                      : "border-muted hover:border-primary/50"
                  )}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Starter</h3>
                    {subscription.subscription?.plan?.name?.toLowerCase() === "starter" && (
                      <Badge className="bg-primary/20 text-primary">Current</Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold mb-2">Free</p>
                  <ul className="text-sm space-y-2 mb-4 text-muted-foreground">
                    <li>✓ 5 transformations/month</li>
                    <li>✓ Basic features</li>
                    <li>✓ Standard support</li>
                  </ul>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleUpgradePlan("starter")}
                    disabled={subscription.subscription?.plan?.name === "starter" || upgradingPlan !== null}
                  >
                    {upgradingPlan === "starter" ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Downgrading...
                      </>
                    ) : subscription.subscription?.plan?.name === "starter" ? (
                      "Current Plan"
                    ) : (
                      <>
                        Downgrade <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Pro Plan */}
                <div 
                  key={`pro-${subscription.subscription?.plan?.name}`}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all relative",
                    subscription.subscription?.plan?.name?.toLowerCase() === "pro" 
                      ? "border-primary bg-primary/5" 
                      : "border-muted hover:border-primary/50"
                  )}>
                  <div className="absolute -top-3 left-4">
                    <Badge className="bg-primary text-primary-foreground">Popular</Badge>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Pro</h3>
                    {subscription.subscription?.plan?.name?.toLowerCase() === "pro" && (
                      <Badge className="bg-primary/20 text-primary">Current</Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold mb-2">$9<span className="text-sm text-muted-foreground">/month</span></p>
                  <ul className="text-sm space-y-2 mb-4 text-muted-foreground">
                    <li>✓ Unlimited transformations</li>
                    <li>✓ Advanced features</li>
                    <li>✓ Priority support</li>
                    <li>✓ HD exports</li>
                  </ul>
                  <Button 
                    className="w-full"
                    onClick={() => handleUpgradePlan("pro")}
                    disabled={subscription.subscription?.plan?.name === "pro" || upgradingPlan !== null}
                  >
                    {upgradingPlan === "pro" ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Upgrading...
                      </>
                    ) : subscription.subscription?.plan?.name === "pro" ? (
                      "Current Plan"
                    ) : (
                      <>
                        Upgrade <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Business Plan */}
                <div 
                  key={`business-${subscription.subscription?.plan?.name}`}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all",
                    subscription.subscription?.plan?.name?.toLowerCase() === "business" 
                      ? "border-primary bg-primary/5" 
                      : "border-muted hover:border-primary/50"
                  )}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Business</h3>
                    {subscription.subscription?.plan?.name?.toLowerCase() === "business" && (
                      <Badge className="bg-primary/20 text-primary">Current</Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold mb-2">$29<span className="text-sm text-muted-foreground">/month</span></p>
                  <ul className="text-sm space-y-2 mb-4 text-muted-foreground">
                    <li>✓ Unlimited transformations</li>
                    <li>✓ All Pro features</li>
                    <li>✓ Team collaboration</li>
                    <li>✓ API access</li>
                  </ul>
                  <Button 
                    className="w-full"
                    onClick={() => handleUpgradePlan("business")}
                    disabled={subscription.subscription?.plan?.name === "business" || upgradingPlan !== null}
                  >
                    {upgradingPlan === "business" ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Upgrading...
                      </>
                    ) : subscription.subscription?.plan?.name === "business" ? (
                      "Current Plan"
                    ) : (
                      <>
                        Upgrade <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Status Section */}
          {subscription.subscription && (
            <Card className="glass-panel border-none shadow-xl bg-linear-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Subscription Status
                  </CardTitle>
                  <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none">
                    {subscription.subscription.plan?.name || "starter"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-background/50 border border-primary/10">
                    <p className="text-xs text-muted-foreground mb-1">Plan</p>
                    <p className="text-lg font-semibold capitalize">{subscription.subscription.plan?.name || "starter"}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border border-primary/10">
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <p className="text-lg font-semibold capitalize">{subscription.subscription.status || "active"}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border border-primary/10">
                    <p className="text-xs text-muted-foreground mb-1">Billing Cycle</p>
                    <p className="text-sm font-semibold">Monthly</p>
                  </div>
                </div>

                {/* Transformation Tracker for Starter Plan */}
                {subscription.subscription.plan?.name === "starter" && (
                  <div className="space-y-3 p-4 rounded-lg bg-background/50 border border-primary/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <p className="text-sm font-semibold">Transformations This Month</p>
                      </div>
                      <Badge variant="outline" className="text-primary">{usageData.transformations} / {usageData.limit}</Badge>
                    </div>
                    <Progress value={(usageData.transformations / usageData.limit) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      You have {usageData.limit - usageData.transformations} transformation{usageData.limit - usageData.transformations !== 1 ? 's' : ''} remaining this month
                    </p>
                  </div>
                )}

                {(subscription.subscription.plan?.name === "pro" || subscription.subscription.plan?.name === "business") && (
                  <div className="space-y-3 p-4 rounded-lg bg-background/50 border border-primary/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <p className="text-sm font-semibold">Transformations</p>
                      </div>
                      <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none">Unlimited</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Enjoy unlimited transformations with your plan</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
