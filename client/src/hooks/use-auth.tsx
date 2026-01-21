import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  profilePicture: string;
  subscription_plan?: string;
  subscription_status?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const authCheckPromise = useRef<Promise<void> | null>(null);

  const checkAuth = useCallback(async (): Promise<void> => {
    // Request deduplication - prevent multiple simultaneous auth checks
    if (authCheckPromise.current) {
      return authCheckPromise.current;
    }

    authCheckPromise.current = (async (): Promise<void> => {
      try {
        const { getApiUrl } = await import("@/config/api");
        
        // Fetch user info using HTTP-only cookies (no token in request needed)
        const response = await fetch(getApiUrl("/api/auth/me"), {
          credentials: "include", // Include cookies in request
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser({
            id: data.id,
            username: data.email,
            email: data.email,
            name: data.name || "",
            profilePicture: data.picture || "avatar-1",
            subscription_plan: data.subscription_plan || "starter",
            subscription_status: data.subscription_status || "active",
          });
        } else if (response.status === 401) {
          // Token expired, try to refresh
          try {
            const refreshResponse = await fetch(getApiUrl("/api/auth/refresh"), {
              method: "POST",
              credentials: "include",
            });
            
            if (refreshResponse.ok) {
              // Retry auth check after refresh
              await checkAuth();
            } else {
              // Refresh failed, user not authenticated
              setUser(null);
            }
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
        authCheckPromise.current = null;
      }
    })();

    return authCheckPromise.current;
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    const toastId = toast.loading("Logging out...");
    const token = localStorage.getItem("token");
    
    try {
      if (token) {
        const { getApiUrl } = await import("@/config/api");
        const response = await fetch(getApiUrl("/api/auth/logout"), { 
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          credentials: "include",
        });
        
        if (!response.ok) {
          console.error("Logout API failed:", response.status);
        }
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Clear ALL storage (localStorage + sessionStorage)
      localStorage.clear();
      sessionStorage.clear();
      
      // Update state
      setUser(null);
      
      // Clear browser history to prevent back button access
      window.history.pushState(null, '', '/login');
      
      toast.success("Logged out successfully", { id: toastId });
      setLocation("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, refreshAuth: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
