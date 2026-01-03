import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Starter",
    price: "$0",
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
    name: "Pro",
    price: "$19",
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
    name: "Business",
    price: "$49",
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
  }
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-20">
        <div className="text-center space-y-4 mb-20">
          <Badge className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 border-none">Pricing Plans</Badge>
          <h1 className="text-4xl md:text-6xl font-heading font-bold">Choose your design power</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Unlock the full potential of AI-driven interior design with our flexible pricing options.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {PLANS.map((plan) => (
            <Card 
              key={plan.name} 
              className={cn(
                "relative flex flex-col border-none shadow-2xl glass-panel overflow-hidden",
                plan.popular ? "ring-2 ring-primary relative z-10" : ""
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
                  <span className="text-5xl font-bold tracking-tight">{plan.price}</span>
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
                  className={cn(
                    "w-full h-12 text-base font-semibold transition-all",
                    plan.popular ? "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/30" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {plan.cta}
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
