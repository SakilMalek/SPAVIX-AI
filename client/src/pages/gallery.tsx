import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { TransformationSlider } from "@/components/dashboard/TransformationSlider";
import { STYLES } from "@/lib/constants";

const GALLERY_ITEMS = [
  {
    id: 1,
    title: "Minimalist Sanctuary",
    style: "Modern Minimalist",
    room: "Living Room",
    before: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=1000",
    after: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: 2,
    title: "Nordic Retreat",
    style: "Scandinavian",
    room: "Bedroom",
    before: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=1000",
    after: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: 3,
    title: "Urban Loft",
    style: "Industrial",
    room: "Kitchen",
    before: "https://images.unsplash.com/photo-1556911223-017290231920?auto=format&fit=crop&q=80&w=1000",
    after: "https://images.unsplash.com/photo-1556911223-e2964f48a55d?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: 4,
    title: "Boho Chic",
    style: "Bohemian",
    room: "Study",
    before: "https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?auto=format&fit=crop&q=80&w=1000",
    after: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=1000",
  }
];

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="text-center space-y-4 mb-16">
          <Badge className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 border-none">Community Showcase</Badge>
          <h1 className="text-4xl md:text-6xl font-heading font-bold">Inspiration Gallery</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Explore transformations created by our community and see what's possible with SPAVIX AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {GALLERY_ITEMS.map((item) => (
            <Card key={item.id} className="overflow-hidden border-none shadow-xl glass-panel group">
              <CardContent className="p-0 aspect-video relative">
                <TransformationSlider 
                  beforeImage={item.before}
                  afterImage={item.after}
                />
              </CardContent>
              <CardFooter className="p-6 flex justify-between items-center bg-card/50">
                <div>
                  <h3 className="font-bold text-lg">{item.title}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{item.style}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{item.room}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  Remix Design
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
