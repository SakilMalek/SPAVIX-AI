import { useState, useEffect } from "react";
import { X, ExternalLink, ShoppingCart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MOCK_PRODUCTS = [
  {
    id: 1,
    name: "Mid-Century Modern Sofa",
    price: "$899.00",
    retailer: "Wayfair",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=300",
    matchScore: 98,
  },
  {
    id: 2,
    name: "Geometric Wool Rug",
    price: "$249.00",
    retailer: "West Elm",
    image: "https://images.unsplash.com/photo-1575414723300-0d0cb6664d9b?auto=format&fit=crop&q=80&w=300",
    matchScore: 92,
  },
  {
    id: 3,
    name: "Brass Floor Lamp",
    price: "$129.99",
    retailer: "Amazon",
    image: "https://images.unsplash.com/photo-1507473888900-52e1ad14592d?auto=format&fit=crop&q=80&w=300",
    matchScore: 88,
  },
  {
    id: 4,
    name: "Abstract Wall Art",
    price: "$75.00",
    retailer: "Etsy",
    image: "https://images.unsplash.com/photo-1582560475093-6f1982e56d33?auto=format&fit=crop&q=80&w=300",
    matchScore: 85,
  },
];

interface ProductSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProductSidebar({ isOpen, onClose }: ProductSidebarProps) {
  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 z-[60] w-full xs:w-80 sm:w-96 md:w-[400px] bg-background border-l shadow-2xl transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 p-4 sm:p-6 border-b">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-heading font-bold truncate">Detected Products</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">{MOCK_PRODUCTS.length} items found</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full shrink-0 h-9 w-9 sm:h-10 sm:w-10">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {MOCK_PRODUCTS.map((product) => (
              <div 
                key={product.id} 
                className="group relative flex gap-4 p-4 rounded-xl border bg-card hover:shadow-lg transition-all hover:border-primary/20"
              >
                <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-muted">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-sm truncate pr-2">{product.name}</h4>
                      <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px] px-1.5 h-5">
                        {product.matchScore}% Match
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{product.retailer}</p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-primary">{product.price}</span>
                    <Button size="sm" variant="outline" className="h-8 gap-1 group/btn">
                      Shop <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-6 border-t bg-muted/20">
          <Button className="w-full" size="lg">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add All to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
