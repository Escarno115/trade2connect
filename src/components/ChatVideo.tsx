import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Video, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const ALLOWED: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
const MAX_BYTES = 50 * 1024 * 1024;

export const ChatVideoPlayer = ({ path }: { path: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage.from("chat-videos").createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path]);
  if (!url) return <div className="w-56 h-32 rounded-lg bg-background/40 animate-pulse" />;
  return <video src={url} controls playsInline preload="metadata" className="w-56 max-w-full rounded-lg bg-foreground" />;
};

interface UploadProps {
  bookingId: string;
  userId: string;
  onSent: () => void;
}

export const VideoQuoteButton = ({ bookingId, userId, onSent }: UploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    const ext = ALLOWED[file.type];
    if (!ext) return toast.error("Please choose an MP4, MOV or WebM video.");
    if (file.size > MAX_BYTES) return toast.error("Video must be under 50 MB. Try a shorter clip.");
    setBusy(true);
    const path = `${bookingId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("chat-videos").upload(path, file, { contentType: file.type });
    if (upErr) { setBusy(false); return toast.error("Upload failed. Please try again."); }
    const { error } = await supabase.from("messages").insert({
      booking_id: bookingId,
      sender_id: userId,
      content: "📹 Video quote request — please take a look and send me a price.",
      attachment_path: path,
      attachment_type: "video",
      is_quote_request: true,
    } as any);
    setBusy(false);
    if (error) return toast.error("Couldn't send video. Please try again.");
    toast.success("Video quote request sent");
    onSent();
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        capture="environment"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleFile(f); }}
      />
      <Button type="button" size="sm" variant="outline" className="h-9 w-9 p-0 shrink-0" disabled={busy}
        onClick={() => inputRef.current?.click()} aria-label="Send video quote request">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
      </Button>
    </>
  );
};
