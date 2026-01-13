import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/use-auth";

export default function PaymentSuccessPage() {
  const [, setLocation] = useLocation();
  const [isRedirecting, setIsRedirecting] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [planName, setPlanName] = React.useState<string | null>(null);
  const { user, refreshAuth } = useAuth();

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setLocation("/login");
          return;
        }

        // Get payment link ID from session storage
        const paymentLinkId = sessionStorage.getItem("razorpay_payment_link_id");
        const planNameStored = sessionStorage.getItem("razorpay_plan_name");
        
        console.log("Payment success page - Payment link ID:", paymentLinkId);

        // Verify payment success on backend
        const response = await fetch("/api/subscription/payment-success", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            paymentLinkId: paymentLinkId || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to verify payment");
        }

        const data = await response.json();
        setPlanName(data.subscription?.plan_name || planNameStored || "Pro");

        // Clear session storage
        sessionStorage.removeItem("razorpay_payment_link_id");
        sessionStorage.removeItem("razorpay_plan_name");

        // Refresh auth to get updated subscription status
        await refreshAuth();
        
        // Auto-redirect to dashboard after 2 seconds
        const timer = setTimeout(() => {
          setLocation("/dashboard");
        }, 2000);

        return () => clearTimeout(timer);
      } catch (err) {
        setError((err as Error).message || "Payment completed but there was an issue updating your subscription. Please refresh the page.");
        setIsRedirecting(false);
        console.error("Payment success error:", err);
      }
    };

    handlePaymentSuccess();
  }, [setLocation, refreshAuth]);

  const handleRedirectNow = () => {
    setIsRedirecting(true);
    setLocation("/dashboard");
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertCircle className="w-16 h-16 text-yellow-500" />
              </div>
              <CardTitle className="text-2xl">Payment Completed</CardTitle>
              <CardDescription>But there was an issue updating your subscription</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                {error}
              </p>
              <Button
                onClick={handleRedirectNow}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
            <CardDescription>Your subscription has been activated</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Your payment was successful. You now have access to your upgraded plan.
            </p>
            {planName && (
              <p className="text-center text-sm font-medium">
                Plan: <span className="text-green-600 capitalize">{planName}</span>
              </p>
            )}
            <p className="text-center text-xs text-muted-foreground">
              Redirecting to dashboard in 2 seconds...
            </p>
            {isRedirecting && (
              <div className="flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
            <Button
              onClick={handleRedirectNow}
              className="w-full"
              disabled={isRedirecting}
            >
              {isRedirecting ? "Redirecting..." : "Go to Dashboard Now"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
