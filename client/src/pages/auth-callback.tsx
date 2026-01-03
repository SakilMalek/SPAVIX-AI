import { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AuthCallbackPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const email = params.get("email");
    const name = params.get("name");
    const picture = params.get("picture");

    console.log("Auth callback - token:", !!token, "email:", email);

    if (token) {
      try {
        localStorage.setItem("token", token);
        console.log("Token stored in localStorage");
        
        if (email) {
          localStorage.setItem("userEmail", email);
        }
        if (name) {
          localStorage.setItem("userName", name);
        }
        if (picture) {
          localStorage.setItem("userProfilePicture", picture);
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, rgb(245, 243, 255), rgb(219, 234, 254))' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}
