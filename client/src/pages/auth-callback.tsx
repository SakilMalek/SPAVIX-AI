import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthCallbackPage() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");

    try {
      // Tokens are already set in HTTP-only cookies by the server
      // Wait a moment to ensure cookies are properly set before redirecting
      setTimeout(() => {
        toast.success("Logged in successfully!");
        
        // Get redirect destination or default to dashboard
        const redirect = sessionStorage.getItem('redirectAfterLogin') || '/dashboard';
        sessionStorage.removeItem('redirectAfterLogin');
        
        // Navigate - tokens are in secure cookies
        setLocation(redirect);
      }, 500);
    } catch (e) {
      console.error("Error in auth callback:", e);
      setError("Failed to complete authentication. Please try again.");
    }
  }, [setLocation]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(to bottom right, rgb(245, 243, 255), rgb(219, 234, 254))' }}>
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Authentication Failed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {error}
            </p>
            <div className="text-sm space-y-2">
              <p className="font-medium">This might be because:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>The authentication was cancelled</li>
                <li>The session expired</li>
                <li>There was a network error</li>
              </ul>
            </div>
            <Button onClick={() => setLocation("/login")} className="w-full">
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, rgb(245, 243, 255), rgb(219, 234, 254))' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}
