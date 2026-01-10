import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { TransformationSlider } from "@/components/dashboard/TransformationSlider";
import { STYLES } from "@/lib/constants";

const GALLERY_ITEMS = [
  {
    id: 1,
    title: "Modern Bathroom Transformation",
    style: "Contemporary",
    room: "Bathroom",
    before: "/attached_assets/gallery_images/bath1.jpg",
    after: "/attached_assets/gallery_images/bath1-after.jpg",
  },
  {
    id: 2,
    title: "Elegant Bedroom Redesign",
    style: "Modern",
    room: "Bedroom",
    before: "/attached_assets/gallery_images/bed1.jpg",
    after: "/attached_assets/gallery_images/bed1-after.jpg",
  },
  {
    id: 3,
    title: "Contemporary Kitchen Upgrade",
    style: "Modern",
    room: "Kitchen",
    before: "/attached_assets/gallery_images/kitchen1.jpg",
    after: "/attached_assets/gallery_images/kitchen1-after.jpg",
  },
  {
    id: 4,
    title: "Stylish Bathroom Makeover",
    style: "Modern",
    room: "Bathroom",
    before: "/attached_assets/gallery_images/bath2.jpg",
    after: "/attached_assets/gallery_images/bath2-after.jpg",
  },
  {
    id: 5,
    title: "Luxurious Bedroom Makeover",
    style: "Luxury",
    room: "Bedroom",
    before: "/attached_assets/gallery_images/bed2.jpg",
    after: "/attached_assets/gallery_images/bed2-after.jpg",
  },
  {
    id: 6,
    title: "Premium Kitchen Design",
    style: "Modern",
    room: "Kitchen",
    before: "/attached_assets/gallery_images/kitchen2.jpg",
    after: "/attached_assets/gallery_images/kitchen2-after.jpg",
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
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
