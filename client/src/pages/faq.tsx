import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "How do I get started with SPAVIX Vision?",
        a: "Simply sign up for an account, upload a room photo, select your desired design style, and let our AI reimagine your space. You'll get instant transformations in seconds!",
      },
      {
        q: "Do I need any design experience?",
        a: "No! SPAVIX Vision is designed for everyone. Our AI handles all the complex design work. Just upload your photo and choose a style you love.",
      },
      {
        q: "What types of rooms can I transform?",
        a: "You can transform any indoor space - bedrooms, living rooms, kitchens, bathrooms, offices, and more. Our AI works best with well-lit photos.",
      },
    ],
  },
  {
    category: "Features & Capabilities",
    questions: [
      {
        q: "What design styles are available?",
        a: "We offer Modern Minimalist, Scandinavian, Industrial, Bohemian, and more styles. Each comes with customizable colors and materials.",
      },
      {
        q: "Can I customize the floor and wall materials?",
        a: "Yes! Choose from hardwood, marble, porcelain tile, laminate, luxury vinyl, and many wall colors to perfectly match your vision.",
      },
      {
        q: "What does the Product Detection feature do?",
        a: "Our AI identifies furniture and decor items in your room and suggests where to find similar products. It helps you shop for pieces that match your new design.",
      },
      {
        q: "Can I edit images before transformation?",
        a: "Absolutely! Use our built-in Image Editor to crop, adjust brightness, contrast, saturation, and rotate images before transformation.",
      },
    ],
  },
  {
    category: "Sharing & Exporting",
    questions: [
      {
        q: "How do I share my designs?",
        a: "Click the Share button on any transformation to generate a shareable link. Anyone can view it without needing an account.",
      },
      {
        q: "What image formats are supported for export?",
        a: "You can export transformations as high-quality JPG images. Simply click the Export button to download.",
      },
      {
        q: "Can I use exported images commercially?",
        a: "For Pro and Business plans, yes. Starter plan exports are for personal use only.",
      },
    ],
  },
  {
    category: "Undo & History",
    questions: [
      {
        q: "How do I undo changes in the editor?",
        a: "Use the Undo button (or Ctrl+Z) to revert your last change. Use Redo to reapply it. You have full history of all edits.",
      },
      {
        q: "Can I view my past transformations?",
        a: "Yes! Go to the History page to see all your previous transformations. You can regenerate, delete, or share them anytime.",
      },
    ],
  },
  {
    category: "Plans & Pricing",
    questions: [
      {
        q: "What's the difference between Starter and Pro plans?",
        a: "Starter (Free): 5 transformations/month with basic features. Pro ($19/mo): Unlimited transformations with premium styles and advanced features.",
      },
      {
        q: "Can I upgrade or downgrade my plan?",
        a: "Yes! You can change your plan anytime. Changes take effect immediately on your next billing cycle.",
      },
      {
        q: "Is there a free trial for Pro?",
        a: "Yes! New Pro subscribers get 14 days free to try all premium features before your first payment.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit cards (Visa, Mastercard, American Express) and digital wallets.",
      },
    ],
  },
  {
    category: "Technical & Support",
    questions: [
      {
        q: "What are the image upload requirements?",
        a: "Images should be at least 800x600 pixels and under 10MB. JPG, PNG, and WebP formats are supported.",
      },
      {
        q: "How long does AI transformation take?",
        a: "Most transformations complete in 5-30 seconds. Pro users get priority processing.",
      },
      {
        q: "How do I report a bug or issue?",
        a: "Contact our support team at support@spavix.com with details about the issue and screenshots if possible.",
      },
      {
        q: "Is my data secure?",
        a: "Yes! All data is encrypted and stored securely. We never share your photos or personal information with third parties.",
      },
    ],
  },
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newOpen = new Set(openItems);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    setOpenItems(newOpen);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleItem(id);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-20">
        <div className="text-center space-y-4 mb-20">
          <Badge className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 border-none">
            Help Center
          </Badge>
          <h1 className="text-4xl md:text-6xl font-heading font-bold">
            Frequently Asked Questions
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Find answers to common questions about SPAVIX Vision and how to get the most out of your design transformations.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-12">
          {FAQS.map((category, categoryIdx) => (
            <div key={categoryIdx} className="space-y-4">
              <h2 className="text-2xl font-bold font-heading sticky top-0 bg-background py-2 z-10 border-b">
                {category.category}
              </h2>
              <div className="space-y-3">
                {category.questions.map((faq, questionIdx) => {
                  const itemId = `${categoryIdx}-${questionIdx}`;
                  const isOpen = openItems.has(itemId);
                  return (
                    <Card
                      key={itemId}
                      className="border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <button
                        onClick={() => toggleItem(itemId)}
                        onKeyDown={(e) => handleKeyDown(e, itemId)}
                        className="w-full text-left"
                        role="button"
                        tabIndex={0}
                        aria-expanded={isOpen}
                        aria-controls={`faq-answer-${itemId}`}
                      >
                        <CardContent className="pt-6 pb-0 flex items-start justify-between gap-4 cursor-pointer hover:text-primary transition-colors">
                          <h3 id={`faq-question-${itemId}`} className="text-lg font-semibold leading-relaxed">
                            {faq.q}
                          </h3>
                          <ChevronDown
                            className={cn(
                              "w-5 h-5 shrink-0 transition-transform mt-1",
                              isOpen && "rotate-180"
                            )}
                            aria-hidden="true"
                          />
                        </CardContent>
                      </button>

                      {isOpen && (
                        <CardContent 
                          id={`faq-answer-${itemId}`}
                          className="pt-4 pb-6 text-muted-foreground"
                          role="region"
                          aria-labelledby={`faq-question-${itemId}`}
                        >
                          <p className="leading-relaxed">{faq.a}</p>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center p-12 rounded-3xl bg-primary/5 border border-primary/10 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold font-heading mb-4">Still have questions?</h3>
          <p className="text-muted-foreground mb-8">
            Can't find what you're looking for? Our support team is here to help!
          </p>
          <Link href="/contact">
            <Button className="bg-primary hover:bg-primary/90">
              Contact Support →
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
