import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

/**
 * This page handles the redirect from Razorpay payment link
 * In test mode, Razorpay doesn't automatically follow callback URLs
 * So we use this as an intermediate page to redirect to payment-success
 */
export default function RazorpayRedirectPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to payment success page
    const timer = setTimeout(() => {
      setLocation("/payment-success");
    }, 500);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Processing your payment...</p>
      </div>
    </div>
  );
}
