import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { REPORT_REASONS } from "@/components/ReportDialog";

const reasonLabel = (r: string) => REPORT_REASONS.find((x) => x.value === r)?.label ?? r;

export const AdminReports = () => {
  const qc = useQueryClient();
  const { data: reports, isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data } = await supabase.from("reports" as any).select("*").order("created_at", { ascending: false }).limit(100);
      const rows = (data ?? []) as any[];
      const userIds = [...new Set(rows.flatMap((r) => [r.reporter_id, r.reported_user_id]).filter(Boolean))];
      const bizIds = [...new Set(rows.map((r) => r.reported_business_id).filter(Boolean))];
      const [{ data: profiles }, { data: bizs }] = await Promise.all([
        userIds.length ? supabase.from("profiles").select("id, full_name").in("id", userIds) : Promise.resolve({ data: [] as any[] }),
        bizIds.length ? supabase.from("businesses").select("id, name").in("id", bizIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const pm = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name || "User"]));
      const bm = new Map((bizs ?? []).map((b: any) => [b.id, b.name]));
      return rows.map((r) => ({
        ...r,
        reporterName: pm.get(r.reporter_id) ?? "User",
        targetName: r.reported_business_id ? bm.get(r.reported_business_id) ?? "Business" : pm.get(r.reported_user_id) ?? "Customer",
      }));
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("reports" as any).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reports"] }); toast.success("Report updated"); },
    onError: () => toast.error("Couldn't update report"),
  });

  if (isLoading) return <div className="h-20 rounded-xl bg-secondary animate-pulse" />;
  if (!reports?.length) return <p className="text-sm text-muted-foreground text-center py-8">No reports yet.</p>;

  return (
    <div className="space-y-3">
      {reports.map((r: any) => (
        <div key={r.id} className="bg-card rounded-xl border p-4 space-y-2">
          <div className="flex justify-between items-start gap-2">
            <div>
              <h3 className="text-sm font-semibold">{reasonLabel(r.reason)} · {r.targetName}</h3>
              <p className="text-[10px] text-muted-foreground">
                By {r.reporterName} · {format(new Date(r.created_at), "d MMM yyyy, HH:mm")}
              </p>
            </div>
            <Badge className={cn("text-[10px] border-0",
              r.status === "open" ? "bg-destructive/10 text-destructive" :
              r.status === "reviewing" ? "bg-warning/10 text-warning" :
              r.status === "resolved" ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground")}>
              {r.status}
            </Badge>
          </div>
          <p className="text-xs whitespace-pre-wrap">{r.details}</p>
          <div className="flex gap-2 flex-wrap">
            {["reviewing", "resolved", "dismissed"].filter((s) => s !== r.status).map((s) => (
              <Button key={s} size="sm" variant="outline" className="h-7 text-xs capitalize"
                onClick={() => update.mutate({ id: r.id, status: s })}>
                {s === "reviewing" ? "Start review" : s}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
