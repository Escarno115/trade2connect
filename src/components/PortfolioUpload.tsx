import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImagePlus, Loader2, X, Star, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  businessId: string;
  userId: string;
};

export const PortfolioUpload = ({ businessId, userId }: Props) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");

  const { data: images } = useQuery({
    queryKey: ["portfolio-images", businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from("portfolio_images")
        .select("*")
        .eq("business_id", businessId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["portfolio-images", businessId] });

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Only image files are allowed"); return; }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${businessId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("portfolio-images").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("portfolio-images").getPublicUrl(path);
      const nextOrder = images ? images.length : 0;
      const { error: insertError } = await supabase.from("portfolio_images").insert({
        business_id: businessId,
        image_url: urlData.publicUrl,
        caption: caption || null,
        sort_order: nextOrder,
      });
      if (insertError) throw insertError;

      toast.success("Photo added!");
      setCaption("");
      invalidate();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portfolio_images").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Photo removed"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const setFeaturedMutation = useMutation({
    mutationFn: async (id: string) => {
      // Unset all featured first, then set the chosen one
      await supabase.from("portfolio_images").update({ is_featured: false }).eq("business_id", businessId);
      const { error } = await supabase.from("portfolio_images").update({ is_featured: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cover photo set!"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      if (!images) return;
      const idx = images.findIndex((img) => img.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= images.length) return;

      const current = images[idx];
      const swap = images[swapIdx];

      // Swap sort_order values
      await Promise.all([
        supabase.from("portfolio_images").update({ sort_order: swap.sort_order }).eq("id", current.id),
        supabase.from("portfolio_images").update({ sort_order: current.sort_order }).eq("id", swap.id),
      ]);
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const featuredImage = images?.find((img) => img.is_featured);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Portfolio</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Showcase your best work. Tap ★ to set a cover photo.
        </p>
      </div>

      {/* Featured / Cover image preview */}
      {featuredImage && (
        <div className="relative rounded-xl overflow-hidden border-2 border-primary aspect-video">
          <img src={featuredImage.image_url} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
            <Star className="h-3 w-3 fill-current" /> Cover Photo
          </div>
        </div>
      )}

      {/* Upload form */}
      <div className="bg-card rounded-xl border p-4 space-y-3">
        <div>
          <Label className="text-xs">Caption (optional)</Label>
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="e.g. Kitchen renovation in Cape Town"
            className="mt-1 h-9 text-xs"
            maxLength={120}
          />
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUpload(file); }}
        />
        <Button type="button" variant="outline" className="w-full text-xs" disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading...</> : <><ImagePlus className="h-4 w-4 mr-1" /> Add Photo</>}
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">JPG, PNG, WebP · Max 5MB</p>
      </div>

      {/* Gallery with reorder + feature controls */}
      {images && images.length > 0 ? (
        <div className="space-y-2">
          {images.map((img, idx) => (
            <div key={img.id} className={cn(
              "flex items-center gap-3 bg-card rounded-xl border p-2",
              img.is_featured && "border-primary"
            )}>
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-secondary shrink-0">
                <img src={img.image_url} alt={img.caption ?? "Portfolio"} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{img.caption || "No caption"}</p>
                {img.is_featured && (
                  <span className="text-[10px] text-primary font-semibold flex items-center gap-0.5 mt-0.5">
                    <Star className="h-2.5 w-2.5 fill-current" /> Cover
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => reorderMutation.mutate({ id: img.id, direction: "up" })}
                  disabled={idx === 0 || reorderMutation.isPending}
                  className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => reorderMutation.mutate({ id: img.id, direction: "down" })}
                  disabled={idx === images.length - 1 || reorderMutation.isPending}
                  className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                onClick={() => setFeaturedMutation.mutate(img.id)}
                disabled={setFeaturedMutation.isPending}
                className={cn("p-1.5 rounded-lg", img.is_featured ? "text-primary" : "text-muted-foreground hover:text-primary")}
              >
                <Star className={cn("h-4 w-4", img.is_featured && "fill-current")} />
              </button>
              <button onClick={() => deleteMutation.mutate(img.id)} className="p-1.5 text-destructive rounded-lg active-scale">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">
          No portfolio photos yet. Add some to showcase your work!
        </p>
      )}
    </div>
  );
};
