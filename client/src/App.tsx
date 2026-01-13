import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/hooks/use-auth";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import AuthCallbackPage from "@/pages/auth-callback";
import SharePage from "@/pages/share";
import DashboardPage from "@/pages/dashboard";
import GalleryPage from "@/pages/gallery";
import PricingPage from "@/pages/pricing";
import FAQPage from "@/pages/faq";
import ContactPage from "@/pages/contact";
import HistoryPage from "@/pages/history";
import ProfilePage from "@/pages/profile";
import EditorPage from "@/pages/editor";
import ProjectsPage from "@/pages/projects";
import PaymentSuccessPage from "@/pages/payment-success";
import RazorpayRedirectPage from "@/pages/razorpay-redirect";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/auth/callback" component={AuthCallbackPage} />
      <Route path="/share/:shareId" component={SharePage} />
      <Route path="/dashboard">
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </Route>
      <Route path="/gallery">
        <ProtectedRoute>
          <GalleryPage />
        </ProtectedRoute>
      </Route>
      <Route path="/pricing">
        <ProtectedRoute>
          <PricingPage />
        </ProtectedRoute>
      </Route>
      <Route path="/payment-success">
        <ProtectedRoute>
          <PaymentSuccessPage />
        </ProtectedRoute>
      </Route>
      <Route path="/razorpay-redirect">
        <ProtectedRoute>
          <RazorpayRedirectPage />
        </ProtectedRoute>
      </Route>
      <Route path="/faq">
        <ProtectedRoute>
          <FAQPage />
        </ProtectedRoute>
      </Route>
      <Route path="/contact">
        <ProtectedRoute>
          <ContactPage />
        </ProtectedRoute>
      </Route>
      <Route path="/history">
        <ProtectedRoute>
          <HistoryPage />
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      </Route>
      <Route path="/editor">
        <ProtectedRoute>
          <EditorPage />
        </ProtectedRoute>
      </Route>
      <Route path="/projects">
        <ProtectedRoute>
          <ProjectsPage />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="spavix-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <Toaster />
                <Router />
              </SubscriptionProvider>
            </AuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
