import { Upload, X, FileImage, AlertCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface UploadPanelProps {
  onFileSelect: (file: File | null) => void;
  uploadedImage?: string | null;
}

export function UploadPanel({ onFileSelect, uploadedImage }: UploadPanelProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileName(file.name);
        onFileSelect(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setFileName(null);
    onFileSelect(null);
  };

  if (uploadedImage) {
    return (
      <div className="relative w-full h-64 rounded-xl overflow-hidden border border-border group bg-black">
        <img 
          src={uploadedImage} 
          alt="Preview" 
          className="w-full h-full object-cover" 
          onError={(e) => {
            console.error('Image failed to load:', e);
          }}
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 gap-3">
          <p className="text-white text-sm font-medium truncate max-w-full px-4">{fileName}</p>
          <Button variant="destructive" size="sm" onClick={removeFile} className="h-8">
            <X className="w-4 h-4 mr-2" /> Remove Image
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center w-full h-64 rounded-xl border-2 border-dashed transition-all cursor-pointer bg-muted/30 hover:bg-muted/50",
        dragActive ? "border-primary bg-primary/5" : "border-border"
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => document.getElementById("file-upload")?.click()}
    >
      <input
        id="file-upload"
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleChange}
      />
      
      <div className="flex flex-col items-center text-center p-6 space-y-4">
        <div className={cn(
          "p-4 rounded-full transition-colors",
          dragActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        )}>
          <Upload className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">
            <span className="text-primary hover:underline">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG or WEBP (max. 10MB)
          </p>
        </div>
      </div>
    </div>
  );
}
