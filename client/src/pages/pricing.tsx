import React, { useState, useEffect } from "react";
import { Check, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface PricingData {
  country: {
    code: string;
    name: string;
    gateway: string;
  };
  gateway: string;
  pricing: {
    starter: number;
    pro: number;
    business: number;
    currency: string;
    symbol: string;
  };
  plans: Record<string, any>;
}

export default function PricingPage() {
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/subscription/pricing");
      if (!response.ok) throw new Error("Failed to fetch pricing");
      const data = await response.json();
      setPricingData(data);
    } catch (error) {
      console.error("Error fetching pricing:", error);
      toast.error("Failed to load pricing information");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planName: string) => {
    if (!user) {
      setLocation("/login");
      return;
    }

    if (planName === "starter") {
      toast.success("You're already on the Starter plan!");
      return;
    }

    try {
      setCheckoutLoading(planName);

      const countryCode = pricingData?.country?.code || "IN";
      const successUrl = `${window.location.origin}/razorpay-redirect`;
      const cancelUrl = `${window.location.origin}/pricing?upgrade=cancelled`;

      const requestBody = {
        planName,
        countryCode,
        successUrl,
        cancelUrl,
      };

      console.log("Sending checkout request:", requestBody);

      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Checkout response status:", response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error("Checkout error response:", error);
        throw new Error(error.error || "Checkout failed");
      }

      const data = await response.json();
      console.log("Checkout success response:", data);

      if (data.gateway === "razorpay" && data.shortUrl) {
        // Store payment link ID for verification after payment
        if (data.subscriptionId) {
          sessionStorage.setItem("razorpay_payment_link_id", data.subscriptionId);
          sessionStorage.setItem("razorpay_plan_name", planName);
          console.log("Stored payment link ID:", data.subscriptionId);
        }
        // Redirect to Razorpay payment link
        console.log("Redirecting to Razorpay:", data.shortUrl);
        window.location.href = data.shortUrl;
      } else if (data.gateway === "stripe" && data.sessionId) {
        // Redirect to Stripe checkout
        console.log("Redirecting to Stripe:", data.sessionId);
        window.location.href = `https://checkout.stripe.com/pay/${data.sessionId}`;
      } else {
        console.error("Invalid response data:", data);
        throw new Error("Invalid checkout response");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error((error as Error).message || "Checkout failed");
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Navbar />
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pricingData) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="container mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Unable to Load Pricing</h2>
          <p className="text-muted-foreground mb-4">Please try refreshing the page</p>
          <Button onClick={fetchPricing}>Retry</Button>
        </main>
      </div>
    );
  }

  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: pricingData.pricing.starter,
      description: "Perfect for casual designers exploring AI room transformation.",
      features: [
        "5 AI transformations / mo",
        "Standard design styles",
        "Basic product detection",
        "Community support",
      ],
      cta: "Start for Free",
      popular: false,
    },
    {
      id: "pro",
      name: "Pro",
      price: pricingData.pricing.pro,
      description: "For enthusiasts and professionals looking for limitless creativity.",
      features: [
        "Unlimited AI transformations",
        "Premium styles & materials",
        "Advanced product matching",
        "High-resolution exports",
        "Priority AI generation",
        "Personalized design advice",
      ],
      cta: "Get Started Pro",
      popular: true,
    },
    {
      id: "business",
      name: "Business",
      price: pricingData.pricing.business,
      description: "Tailored for interior designers and real estate agencies.",
      features: [
        "Everything in Pro",
        "Team collaboration",
        "API access",
        "Custom brand styles",
        "Whitelabel reports",
        "Dedicated account manager",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-20">
        <div className="text-center space-y-4 mb-20">
          <Badge className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 border-none">
            {pricingData.country.name} • {pricingData.pricing.currency}
          </Badge>
          <h1 className="text-4xl md:text-6xl font-heading font-bold">Choose your design power</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Unlock the full potential of AI-driven interior design with our flexible pricing options.
          </p>
          <p className="text-sm text-muted-foreground">
            Powered by {pricingData.gateway === "razorpay" ? "🟠 Razorpay" : "🟦 Stripe"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col border-none shadow-2xl glass-panel overflow-hidden",
                plan.popular ? "ring-2 ring-primary relative z-10 scale-105" : ""
              )}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center">
                    <Sparkles className="w-3 h-3 mr-1" /> MOST POPULAR
                  </div>
                </div>
              )}

              <CardHeader className="pt-8 px-8">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-base mt-2">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="px-8 pb-8 flex-1">
                <div className="flex items-baseline mb-8">
                  <span className="text-5xl font-bold tracking-tight">
                    {pricingData.pricing.symbol}
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground ml-1">/month</span>
                </div>

                <ul className="space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start text-sm">
                      <div className="mr-3 mt-1 h-5 w-5 flex items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="p-8 mt-auto">
                <Button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={checkoutLoading === plan.id}
                  className={cn(
                    "w-full h-12 text-base font-semibold transition-all",
                    plan.popular
                      ? "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/30"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {checkoutLoading === plan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    plan.cta
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-24 text-center p-12 rounded-3xl bg-primary/5 border border-primary/10 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold font-heading mb-4">Questions? We're here to help.</h3>
          <p className="text-muted-foreground mb-8">
            Check out our FAQ or contact our support team for custom enterprise solutions.
          </p>
          <Link href="/faq">
            <Button variant="link" className="text-primary font-bold">
              View FAQ Center →
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
