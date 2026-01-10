import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  profilePicture: string;
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

  const checkAuth = useCallback(async () => {
    // Request deduplication - prevent multiple simultaneous auth checks
    if (authCheckPromise.current) {
      return authCheckPromise.current;
    }

    authCheckPromise.current = (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Validate token expiration before API call
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            console.log('Token expired, clearing auth');
            localStorage.clear();
            sessionStorage.clear();
            setUser(null);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error('Invalid token format', e);
          localStorage.clear();
          sessionStorage.clear();
          setUser(null);
          setIsLoading(false);
          return;
        }

        const { getApiUrl } = await import("@/config/api");
        const response = await fetch(getApiUrl("/api/auth/me"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser({
            id: data.id,
            username: data.email,
            email: data.email,
            name: data.name || "",
            profilePicture: data.picture || "avatar-1",
          });
        } else {
          // Token invalid on server
          localStorage.clear();
          sessionStorage.clear();
          setUser(null);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.clear();
        sessionStorage.clear();
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
