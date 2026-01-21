import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    google: any;
  }
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { refreshAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleGoogleClick = async () => {
    try {
      const { getApiUrl } = await import("@/config/api");
      
      // Redirect to server-side OAuth endpoint (fixes cross-domain session issue)
      window.location.href = getApiUrl("/api/auth/google/redirect");
    } catch (error) {
      console.error("Google login error:", error);
      toast.error("Failed to start Google login");
    }
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Form submitted');

    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    try {
      setIsLoading(true);
      setErrors({});
      const { getApiUrl } = await import("@/config/api");
      const apiUrl = getApiUrl("/api/auth/login");
      console.log('🔐 Attempting login to:', apiUrl);
      console.log('📧 Email:', email);
      console.log('🔒 Password length:', password.length);
      console.log('📌 Remember me:', rememberMe);
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, rememberMe }),
      });

      console.log('📊 Login response status:', response.status);
      console.log('📊 Response headers:', response.headers);
      
      if (!response.ok) {
        let errorMessage = "Login failed";
        try {
          const error = await response.json();
          console.error('❌ Login error response:', error);
          errorMessage = error.error || error.message || "Login failed";
        } catch (e) {
          console.error('❌ Failed to parse error response:', e);
          errorMessage = `Login failed (${response.status})`;
        }
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      console.log('✅ Login successful, tokens set in HTTP-only cookies');
      console.log('📦 Response data:', data);
      
      // Tokens are in HTTP-only cookies, no need to store in localStorage
      console.log('🔄 Calling refreshAuth()...');
      toast.success("Logged in successfully!");
      try {
        await refreshAuth();
        console.log('✅ refreshAuth() completed');
      } catch (authError) {
        console.error('❌ refreshAuth() failed:', authError);
        throw authError;
      }
      
      // Redirect to intended destination or dashboard
      const redirect = sessionStorage.getItem('redirectAfterLogin') || '/dashboard';
      sessionStorage.removeItem('redirectAfterLogin');
      console.log('🔀 Redirecting to:', redirect);
      console.log('🔀 Current location before redirect:', window.location.pathname);
      
      try {
        // Use window.location.href for hard redirect to ensure page loads with new auth state
        window.location.href = redirect;
        console.log('✅ Redirect initiated');
      } catch (redirectError) {
        console.error('❌ Redirect failed:', redirectError);
        throw redirectError;
      }
    } catch (error: any) {
      console.error('❌ Login exception:', error);
      toast.error(error.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/logo-light.png" 
              alt="SPAVIX Logo" 
              className="h-12 w-auto"
            />
          </div>
          <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            Sign in to your SPAVIX account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                disabled={isLoading}
                className={errors.email ? "border-destructive" : ""}
                required
              />
              {errors.email && (
                <p className="text-xs text-destructive font-medium">{errors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                disabled={isLoading}
                className={errors.password ? "border-destructive" : ""}
                required
              />
              {errors.password && (
                <p className="text-xs text-destructive font-medium">{errors.password}</p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input 
                  type="checkbox" 
                  className="rounded" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me for 30 days</span>
              </label>
              <a href="/forgot-password" className="text-sm text-purple-600 hover:text-purple-700">
                Forgot password?
              </a>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGoogleClick}
              className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <svg className="w-5 h-5 mr-2 inline" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </Button>
          </div>

          <div className="mt-4 text-center text-sm">
            Don't have an account?{" "}
            <button
              onClick={() => setLocation("/signup")}
              className="text-purple-600 hover:text-purple-700 font-semibold"
            >
              Sign up
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
