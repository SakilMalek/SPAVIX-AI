import { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AuthCallbackPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const userStr = params.get("user");

    console.log("Auth callback - token:", !!token, "user:", !!userStr);

    if (token) {
      try {
        localStorage.setItem("token", token);
        console.log("Token stored in localStorage");
        
        if (userStr) {
          try {
            const user = JSON.parse(decodeURIComponent(userStr));
            console.log("User data parsed:", user);
            if (user.name) {
              localStorage.setItem("userName", user.name);
            }
            if (user.picture) {
              localStorage.setItem("userProfilePicture", user.picture);
            }
          } catch (e) {
            console.error("Failed to parse user data:", e);
          }
        }

        toast.success("Logged in successfully!");
        console.log("Redirecting to dashboard...");
        // Use a small delay to ensure localStorage is written
        setTimeout(() => {
          setLocation("/dashboard");
        }, 100);
      } catch (e) {
        console.error("Error in auth callback:", e);
        toast.error("Authentication error");
        setLocation("/login");
      }
    } else {
      console.log("No token found in URL");
      toast.error("Authentication failed - no token received");
      // Redirect after a short delay
      setTimeout(() => {
        setLocation("/login");
      }, 1000);
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}
