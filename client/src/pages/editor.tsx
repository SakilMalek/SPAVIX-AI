import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Crop, 
  RotateCcw, 
  Sun, 
  Contrast, 
  Droplets, 
  Save, 
  Undo2, 
  Redo2,
  X,
  Upload,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EditState {
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  cropArea?: { x: number; y: number; width: number; height: number };
}

export default function EditorPage() {
  const [image, setImage] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  
  const [history, setHistory] = useState<EditState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => setImage(event.target?.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const applyFilters = () => {
    return {
      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
      transform: `rotate(${rotation}deg)`,
    };
  };

  const saveToHistory = (state: EditState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleBrightnessChange = (value: number) => {
    setBrightness(value);
    saveToHistory({ brightness: value, contrast, saturation, rotation });
  };

  const handleContrastChange = (value: number) => {
    setContrast(value);
    saveToHistory({ brightness, contrast: value, saturation, rotation });
  };

  const handleSaturationChange = (value: number) => {
    setSaturation(value);
    saveToHistory({ brightness, contrast, saturation: value, rotation });
  };

  const handleRotation = (angle: number) => {
    const newRotation = (rotation + angle) % 360;
    setRotation(newRotation);
    saveToHistory({ brightness, contrast, saturation, rotation: newRotation });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      setBrightness(state.brightness);
      setContrast(state.contrast);
      setSaturation(state.saturation);
      setRotation(state.rotation);
      setHistoryIndex(newIndex);
      toast.success("Undo applied");
    } else {
      toast.info("Nothing to undo");
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      setBrightness(state.brightness);
      setContrast(state.contrast);
      setSaturation(state.saturation);
      setRotation(state.rotation);
      setHistoryIndex(newIndex);
      toast.success("Redo applied");
    } else {
      toast.info("Nothing to redo");
    }
  };

  const handleCropStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropping || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    setCropStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleCropMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropping || !cropStart || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    setCropEnd({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleCropEnd = () => {
    if (cropStart && cropEnd && image) {
      const minX = Math.min(cropStart.x, cropEnd.x);
      const minY = Math.min(cropStart.y, cropEnd.y);
      const maxX = Math.max(cropStart.x, cropEnd.x);
      const maxY = Math.max(cropStart.y, cropEnd.y);

      if (maxX - minX > 10 && maxY - minY > 10) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;
          
          const scaleX = img.width / (imageRef.current?.offsetWidth || img.width);
          const scaleY = img.height / (imageRef.current?.offsetHeight || img.height);

          canvas.width = (maxX - minX) * scaleX;
          canvas.height = (maxY - minY) * scaleY;
          ctx.drawImage(
            img,
            minX * scaleX,
            minY * scaleY,
            canvas.width,
            canvas.height,
            0,
            0,
            canvas.width,
            canvas.height
          );
          setImage(canvas.toDataURL());
          setIsCropping(false);
          setCropStart(null);
          setCropEnd(null);
          toast.success("Image cropped");
        };
        img.src = image;
      }
    }
  };

  const renderCropOverlay = () => {
    if (!isCropping || !cropStart) return null;

    const minX = Math.min(cropStart.x, cropEnd?.x || cropStart.x);
    const minY = Math.min(cropStart.y, cropEnd?.y || cropStart.y);
    const maxX = Math.max(cropStart.x, cropEnd?.x || cropStart.x);
    const maxY = Math.max(cropStart.y, cropEnd?.y || cropStart.y);

    return (
      <>
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
        <div
          className="absolute border-2 border-primary/80 pointer-events-none"
          style={{
            left: `${minX}px`,
            top: `${minY}px`,
            width: `${maxX - minX}px`,
            height: `${maxY - minY}px`,
          }}
        />
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <Navbar />
      <main className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-80 border-r bg-card p-6 flex flex-col gap-8 shadow-lg z-10">
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-heading">Image Editor</h2>
            <p className="text-sm text-muted-foreground">Pre-process your room photo</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <LabelWithIcon icon={<Sun className="w-4 h-4" />} label="Brightness" />
                <span className="text-xs font-mono">{brightness}%</span>
              </div>
              <Slider 
                value={[brightness]} 
                min={0} max={200} step={1}
                onValueChange={([v]) => handleBrightnessChange(v)}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <LabelWithIcon icon={<Contrast className="w-4 h-4" />} label="Contrast" />
                <span className="text-xs font-mono">{contrast}%</span>
              </div>
              <Slider 
                value={[contrast]} 
                min={0} max={200} step={1}
                onValueChange={([v]) => handleContrastChange(v)}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <LabelWithIcon icon={<Droplets className="w-4 h-4" />} label="Saturation" />
                <span className="text-xs font-mono">{saturation}%</span>
              </div>
              <Slider 
                value={[saturation]} 
                min={0} max={200} step={1}
                onValueChange={([v]) => handleSaturationChange(v)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" onClick={() => handleRotation(-90)}>
                <RotateCcw className="w-4 h-4 mr-2" /> -90°
              </Button>
              <Button variant="outline" onClick={() => handleRotation(90)}>
                <RotateCcw className="w-4 h-4 mr-2 rotate-180" /> +90°
              </Button>
            </div>
          </div>

          <div className="mt-auto space-y-2">
            <Button 
              className="w-full h-12 gap-2 bg-linear-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white" 
              disabled={!image}
              onClick={() => {
                if (image) {
                  const canvas = document.createElement("canvas");
                  const img = new Image();
                  img.onload = () => {
                    // Resize to max 1024px to reduce payload
                    let width = img.width;
                    let height = img.height;
                    const maxDimension = 1024;
                    
                    if (width > maxDimension || height > maxDimension) {
                      const ratio = Math.min(maxDimension / width, maxDimension / height);
                      width = Math.floor(width * ratio);
                      height = Math.floor(height * ratio);
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d")!;
                    
                    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
                    ctx.translate(width / 2, height / 2);
                    ctx.rotate((rotation * Math.PI) / 180);
                    ctx.drawImage(img, -width / 2, -height / 2, width, height);
                    
                    // Compress to JPEG with low quality to drastically reduce size
                    const compressedImage = canvas.toDataURL("image/jpeg", 0.6);
                    localStorage.setItem("editedImage", compressedImage);
                    window.location.href = "/dashboard";
                  };
                  img.src = image;
                }
              }}
            >
              <Check className="w-4 h-4" /> Finalize & Use
            </Button>
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground hover:text-foreground" 
              onClick={() => {
                setImage(null);
                setBrightness(100);
                setContrast(100);
                setSaturation(100);
                setRotation(0);
                setHistory([]);
                setHistoryIndex(-1);
                setIsCropping(false);
                setCropStart(null);
                setCropEnd(null);
                toast.success("Reset all edits");
              }}
            >
              Reset All
            </Button>
          </div>
        </div>

        {/* Editor Viewport */}
        <div className="flex-1 bg-muted/30 p-12 flex items-center justify-center relative overflow-hidden">
          {image ? (
            <div 
              ref={imageRef}
              className="relative max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden transition-all duration-300 bg-black group cursor-crosshair"
              onMouseDown={handleCropStart}
              onMouseMove={handleCropMove}
              onMouseUp={handleCropEnd}
              onMouseLeave={handleCropEnd}
            >
              <img 
                src={image} 
                alt="To edit" 
                style={applyFilters()}
                className="max-h-[70vh] w-auto object-contain transition-all"
                draggable={false}
              />
              {isCropping && renderCropOverlay()}
              <Button 
                variant="destructive" 
                size="icon" 
                className="absolute top-4 right-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setImage(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-6 max-w-sm">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="w-10 h-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold font-heading">Start Editing</h3>
                <p className="text-muted-foreground">Upload a photo to enhance it before AI transformation.</p>
              </div>
              <Button size="lg" className="gap-2" onClick={() => document.getElementById('editor-upload')?.click()}>
                <Upload className="w-4 h-4" /> Select Photo
              </Button>
              <input 
                id="editor-upload" 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleFileUpload} 
              />
            </div>
          )}
          
          {/* Top Control Bar */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-2 p-2 rounded-full glass-panel shadow-lg">
             <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full" 
              disabled={historyIndex <= 0}
              onClick={handleUndo}
              title="Undo (Ctrl+Z)"
             >
              <Undo2 className="w-4 h-4" />
             </Button>
             <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full" 
              disabled={historyIndex >= history.length - 1}
              onClick={handleRedo}
              title="Redo (Ctrl+Y)"
             >
              <Redo2 className="w-4 h-4" />
             </Button>
             <Separator orientation="vertical" className="h-8" />
             <Button 
              variant={isCropping ? "default" : "ghost"} 
              size="icon" 
              className="rounded-full" 
              disabled={!image}
              onClick={() => {
                if (isCropping) {
                  setIsCropping(false);
                  setCropStart(null);
                  setCropEnd(null);
                  toast.info("Crop cancelled");
                } else {
                  setIsCropping(true);
                  toast.info("Click and drag to crop");
                }
              }}
              title="Crop Tool"
             >
              <Crop className="w-4 h-4" />
             </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function LabelWithIcon({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function Separator({ orientation, className }: { orientation: string, className?: string }) {
  return (
    <div className={cn(
      "bg-border",
      orientation === "vertical" ? "w-px h-full" : "h-px w-full",
      className
    )} />
  );
}
