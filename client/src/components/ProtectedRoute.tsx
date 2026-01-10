import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      // Store intended destination for redirect after login
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      setLocation("/login");
    }
  }, [isLoading, user, setLocation]);

  // Prevent back button from showing cached protected pages
  useEffect(() => {
    if (user) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [user]);

  // Show loading state OR redirect immediately if not authenticated
  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
