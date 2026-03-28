import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

type Props = {
  businessId: string;
};

export const PortfolioGallery = ({ businessId }: Props) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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

  if (!images || images.length === 0) return null;

  const featuredImage = images.find((img) => img.is_featured);
  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;

  return (
    <>
      {/* Featured / cover image hero */}
      {featuredImage && (
        <button
          onClick={() => setSelectedIndex(images.indexOf(featuredImage))}
          className="w-full rounded-xl overflow-hidden bg-secondary aspect-video mb-3 relative active-scale"
        >
          <img
            src={featuredImage.image_url}
            alt={featuredImage.caption ?? "Featured work"}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
            <Star className="h-3 w-3 fill-current" /> Featured
          </div>
          {featuredImage.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <p className="text-xs text-white">{featuredImage.caption}</p>
            </div>
          )}
        </button>
      )}

      {/* Thumbnail grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setSelectedIndex(i)}
            className="aspect-square rounded-xl overflow-hidden bg-secondary active-scale relative"
          >
            <img
              src={img.image_url}
              alt={img.caption ?? "Work photo"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {img.is_featured && (
              <div className="absolute top-1 right-1">
                <Star className="h-3 w-3 text-primary fill-primary drop-shadow" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-black border-0">
          {selectedImage && (
            <div className="relative">
              <img
                src={selectedImage.image_url}
                alt={selectedImage.caption ?? "Work photo"}
                className="w-full max-h-[70vh] object-contain"
              />
              {selectedImage.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <p className="text-sm text-white">{selectedImage.caption}</p>
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedIndex((selectedIndex! - 1 + images.length) % images.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white active-scale"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setSelectedIndex((selectedIndex! + 1) % images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white active-scale"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
              <p className="text-center text-xs text-white/60 py-2">
                {selectedIndex! + 1} / {images.length}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
