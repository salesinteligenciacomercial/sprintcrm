import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Loader2, Image as ImageIcon, Film } from "lucide-react";

interface MediaUploadFieldProps {
  value?: string;
  onChange: (url: string) => void;
  accept?: "image" | "video" | "both";
  placeholder?: string;
  folder?: string;
  className?: string;
}

const ACCEPT_MAP = {
  image: "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml",
  video: "video/mp4,video/webm,video/quicktime",
  both: "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,video/quicktime",
};

export function MediaUploadField({
  value,
  onChange,
  accept = "image",
  placeholder = "Cole uma URL ou faça upload",
  folder = "general",
  className,
}: MediaUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const isVideo = value && /\.(mp4|webm|mov)(\?|$)/i.test(value);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 20MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("capture-page-assets")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("capture-page-assets").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Upload concluído!");
    } catch (e: any) {
      toast.error(e.message || "Erro no upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-2 ${className || ""}`}>
      <div className="flex gap-2">
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_MAP[accept]}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          title="Fazer upload"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange("")}
            className="text-destructive"
            title="Remover"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {value && (
        <div className="border rounded-lg p-2 bg-muted/30 inline-flex items-center gap-2 max-w-full">
          {isVideo ? (
            <video src={value} className="h-16 w-24 rounded object-cover" muted />
          ) : (
            <img
              src={value}
              alt="preview"
              className="h-16 w-16 rounded object-cover"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          )}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {isVideo ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
            Pré-visualização
          </span>
        </div>
      )}
    </div>
  );
}
