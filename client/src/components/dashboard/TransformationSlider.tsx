import { useState, useRef, useEffect } from "react";
import { MoveHorizontal, Loader } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransformationSliderProps {
  beforeImage: string;
  afterImage: string;
  generationId?: string;
  className?: string;
}

export function TransformationSlider({ beforeImage, afterImage, generationId, className }: TransformationSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [loadedBeforeImage, setLoadedBeforeImage] = useState<string>("");
  const [loadedAfterImage, setLoadedAfterImage] = useState<string>("");
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy load images if not provided
  useEffect(() => {
    // If both images are provided and not empty, use them
    if (beforeImage && beforeImage.length > 0 && afterImage && afterImage.length > 0) {
      setLoadedBeforeImage(beforeImage);
      setLoadedAfterImage(afterImage);
      setIsLoadingImages(false);
      return;
    }

    // If no generationId, we can't load images
    if (!generationId) {
      setIsLoadingImages(false);
      return;
    }

    // Fetch images from API
    const loadImages = async () => {
      setIsLoadingImages(true);
      try {
        const token = localStorage.getItem("token");
        const { getApiUrl } = await import("@/config/api");
        
        console.log(`[TransformationSlider] Loading images for generation ${generationId}`);
        const response = await fetch(getApiUrl(`/api/generations/${generationId}`), {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const response_data = await response.json();
          // The endpoint returns { success: true, generation: {...} }
          const data = response_data.generation || response_data;
          
          console.log(`[TransformationSlider] Images loaded successfully for ${generationId}`);
          console.log(`[TransformationSlider] Before image size: ${data.before_image_url?.length || 0} bytes`);
          console.log(`[TransformationSlider] After image size: ${data.after_image_url?.length || 0} bytes`);
          
          if (data.before_image_url && data.before_image_url.length > 0) {
            setLoadedBeforeImage(data.before_image_url);
          } else {
            console.warn(`[TransformationSlider] Before image is empty or missing`);
          }
          
          if (data.after_image_url && data.after_image_url.length > 0) {
            setLoadedAfterImage(data.after_image_url);
          } else {
            console.warn(`[TransformationSlider] After image is empty or missing`);
          }
        } else {
          console.error(`[TransformationSlider] Failed to load images: ${response.status}`);
        }
      } catch (error) {
        console.error("[TransformationSlider] Failed to load transformation images:", error);
      } finally {
        setIsLoadingImages(false);
      }
    };

    loadImages();
  }, [beforeImage, afterImage, generationId]);

  const handleMove = (event: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : (event as React.MouseEvent).clientX;
    
    let position = ((clientX - containerRect.left) / containerRect.width) * 100;
    position = Math.max(0, Math.min(100, position));
    
    setSliderPosition(position);
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = 5;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderPosition(Math.max(0, sliderPosition - step));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderPosition(Math.min(100, sliderPosition + step));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSliderPosition(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSliderPosition(100);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div 
      ref={containerRef}
      className={cn("relative w-full h-full overflow-hidden select-none cursor-ew-resize group bg-muted", className)}
      onMouseMove={(e) => isDragging && handleMove(e)}
      onTouchMove={(e) => isDragging && handleMove(e)}
      onMouseDown={handleMove}
      onTouchStart={handleMove}
      onKeyDown={handleKeyDown}
      role="slider"
      aria-label="Before and after comparison slider"
      aria-valuenow={Math.round(sliderPosition)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
    >
      {isLoadingImages ? (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-muted">
          <Loader className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* After Image (Background) */}
          <img 
            src={loadedAfterImage} 
            alt="After transformation: redesigned room with AI-generated interior" 
            className="absolute inset-0 w-full h-full object-cover" 
            draggable={false}
            loading="lazy"
            decoding="async"
          />

          {/* Before Image (Foreground - Clip Path) */}
          <div 
            className="absolute inset-0 w-full h-full overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <img 
              src={loadedBeforeImage} 
              alt="Before transformation: original room photo" 
              className="absolute inset-0 w-full h-full object-cover" 
              draggable={false}
              loading="lazy"
              decoding="async"
            />
            
            {/* Label Before */}
            <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              Before
            </div>
          </div>
          
          {/* Label After */}
          <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            After
          </div>

          {/* Slider Handle */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all hover:w-2 hover:shadow-[0_0_20px_rgba(255,255,255,0.8)]"
            style={{ left: `${sliderPosition}%` }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            aria-hidden="true"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-xl transform transition-all hover:scale-125 active:scale-95 hover:shadow-2xl">
              <MoveHorizontal className="w-5 h-5 text-black" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
