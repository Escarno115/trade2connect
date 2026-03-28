import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, CheckCircle2, XCircle, Users, Building2, CalendarDays, FileText, ExternalLink, ArrowUpCircle, Phone, Receipt, DollarSign } from "lucide-react";
import { TIER_LABELS } from "@/lib/constants";
import { getCountryByCode } from "@/lib/countries";
import type { Database } from "@/integrations/supabase/types";

type SubscriptionTier = Database["public"]["Enums"]["subscription_tier"];

const AdminPanel = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"businesses" | "requests" | "bookings" | "users">("businesses");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [expandedBizId, setExpandedBizId] = useState<string | null>(null);

  const isAdmin = userRole === "admin";

  const { data: businesses } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const { data: allBookings } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, services(title), businesses(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*, user_roles(role)").order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: isAdmin,
  });

  // Fetch verification docs for expanded business
  const { data: verificationDocs } = useQuery({
    queryKey: ["admin-verification-docs", expandedBizId],
    queryFn: async () => {
      const { data } = await supabase
        .from("verification_documents")
        .select("*")
        .eq("business_id", expandedBizId!)
        .order("uploaded_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!expandedBizId,
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: "approved" | "rejected"; reason?: string }) => {
      const { error } = await supabase.from("businesses").update({
        verification_status: status,
        verification_rejected_reason: status === "rejected" ? reason : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Business updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      setRejectingId(null);
      setRejectReason("");
    },
  });

  const updateTierMutation = useMutation({
    mutationFn: async ({ id, tier }: { id: string; tier: SubscriptionTier }) => {
      const { error } = await supabase.from("businesses").update({ subscription_tier: tier }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tier updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
    },
  });

  const togglePhoneVerifiedMutation = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase.from("businesses").update({ phone_verified: verified }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.verified ? "Phone marked as verified" : "Phone verification removed");
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
    },
  });

  // Subscription upgrade requests
  const { data: subscriptionRequests } = useQuery({
    queryKey: ["admin-subscription-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_requests")
        .select("*, businesses(name, city)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const pendingRequestsCount = subscriptionRequests?.filter((r: any) => r.status === "pending").length ?? 0;

  const handleRequestMutation = useMutation({
    mutationFn: async ({ id, status, businessId, requestedTier }: { id: string; status: "approved" | "rejected"; businessId: string; requestedTier: SubscriptionTier }) => {
      const { error: reqError } = await supabase
        .from("subscription_requests")
        .update({ status })
        .eq("id", id);
      if (reqError) throw reqError;
      if (status === "approved") {
        const { error: bizError } = await supabase
          .from("businesses")
          .update({ subscription_tier: requestedTier })
          .eq("id", businessId);
        if (bizError) throw bizError;
      }
    },
    onSuccess: (_, vars) => {
      toast.success(vars.status === "approved" ? "Upgrade approved! Business tier updated." : "Request rejected.");
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getDocDownloadUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from("verification-docs")
      .createSignedUrl(path, 3600);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      toast.error("Could not generate download link");
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pb-20 px-6">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-bold">Admin Access Only</h2>
        <Button variant="ghost" className="mt-2" onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  const tabs = [
    { key: "businesses" as const, label: "Businesses", icon: Building2 },
    { key: "requests" as const, label: `Requests${pendingRequestsCount > 0 ? ` (${pendingRequestsCount})` : ""}`, icon: ArrowUpCircle },
    { key: "bookings" as const, label: "Bookings", icon: CalendarDays },
    { key: "users" as const, label: "Users", icon: Users },
  ];

  return (
    <div className="pb-20">
      <div className="px-4 pt-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg active-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Admin Panel</h1>
      </div>

      {/* Stats bar */}
      <div className="px-4 mt-4 grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border p-3 text-center">
          <p className="text-lg font-bold">{businesses?.length ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">Businesses</p>
        </div>
        <div className="bg-card rounded-xl border p-3 text-center">
          <p className="text-lg font-bold">{allBookings?.length ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">Bookings</p>
        </div>
        <div className="bg-card rounded-xl border p-3 text-center">
          <p className="text-lg font-bold">{users?.length ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">Users</p>
        </div>
      </div>

      <div className="px-4 mt-4 flex gap-1 bg-secondary rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "flex-1 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1",
              activeTab === t.key ? "bg-card shadow-sm" : "text-muted-foreground"
            )}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4">
        {activeTab === "businesses" && (
          <div className="space-y-3">
            {businesses?.map((biz) => (
              <div key={biz.id} className="bg-card rounded-xl border p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-semibold">{biz.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {biz.city}{biz.country ? `, ${getCountryByCode(biz.country)?.name ?? biz.country}` : ""}
                    </p>
                    {biz.phone && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{biz.phone}</span>
                        <button
                          onClick={() => togglePhoneVerifiedMutation.mutate({ id: biz.id, verified: !biz.phone_verified })}
                          className={cn("text-[10px] font-medium ml-1", biz.phone_verified ? "text-success" : "text-warning")}
                        >
                          {biz.phone_verified ? "✓ Verified" : "Mark Verified"}
                        </button>
                      </div>
                    )}
                  </div>
                  <Badge className={cn("text-[10px] border-0",
                    biz.verification_status === "approved" ? "bg-success/10 text-success" :
                    biz.verification_status === "pending" ? "bg-warning/10 text-warning" :
                    "bg-destructive/10 text-destructive"
                  )}>
                    {biz.verification_status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-muted-foreground">Tier:</span>
                  <Select value={biz.subscription_tier} onValueChange={(v) => updateTierMutation.mutate({ id: biz.id, tier: v as SubscriptionTier })}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Standard</SelectItem>
                      <SelectItem value="basic">Pro</SelectItem>
                      <SelectItem value="pro">Ultimate</SelectItem>
                    </SelectContent>
                  </Select>

                  <button
                    onClick={() => setExpandedBizId(expandedBizId === biz.id ? null : biz.id)}
                    className="ml-auto text-xs text-primary font-medium flex items-center gap-1"
                  >
                    <FileText className="h-3.5 w-3.5" /> Docs
                  </button>
                </div>

                {/* Verification docs viewer */}
                {expandedBizId === biz.id && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <p className="text-xs font-medium">Verification Documents</p>
                    {verificationDocs && verificationDocs.length > 0 ? (
                      verificationDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-2 p-2 bg-secondary rounded-lg">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-xs flex-1 truncate">
                            {doc.document_type.replace(/_/g, " ")}
                          </span>
                          <button
                            onClick={() => getDocDownloadUrl(doc.file_url)}
                            className="text-xs text-primary font-medium flex items-center gap-0.5"
                          >
                            <ExternalLink className="h-3 w-3" /> View
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No documents uploaded</p>
                    )}
                  </div>
                )}

                {biz.verification_status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => verifyMutation.mutate({ id: biz.id, status: "approved" })}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs text-destructive" onClick={() => setRejectingId(biz.id)}>
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                )}

                {rejectingId === biz.id && (
                  <div className="mt-2 space-y-2">
                    <Input
                      placeholder="Rejection reason..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Button size="sm" variant="destructive" className="w-full text-xs" onClick={() => verifyMutation.mutate({ id: biz.id, status: "rejected", reason: rejectReason })}>
                      Confirm Rejection
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "requests" && (
          <div className="space-y-3">
            {subscriptionRequests && subscriptionRequests.length > 0 ? subscriptionRequests.map((req: any) => (
              <div key={req.id} className="bg-card rounded-xl border p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-semibold">{req.businesses?.name}</h3>
                    <p className="text-xs text-muted-foreground">{req.businesses?.city}</p>
                    <p className="text-xs mt-1">
                      <span className="text-muted-foreground">{TIER_LABELS[req.current_tier as keyof typeof TIER_LABELS]}</span>
                      <span className="mx-1">→</span>
                      <span className="font-semibold text-primary">{TIER_LABELS[req.requested_tier as keyof typeof TIER_LABELS]}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(req.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge className={cn("text-[10px] border-0",
                    req.status === "pending" ? "bg-warning/10 text-warning" :
                    req.status === "approved" ? "bg-success/10 text-success" :
                    "bg-destructive/10 text-destructive"
                  )}>
                    {req.status}
                  </Badge>
                </div>
                {req.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleRequestMutation.mutate({ id: req.id, status: "approved", businessId: req.business_id, requestedTier: req.requested_tier })}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs text-destructive" onClick={() => handleRequestMutation.mutate({ id: req.id, status: "rejected", businessId: req.business_id, requestedTier: req.requested_tier })}>
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-6">No subscription requests</p>
            )}
          </div>
        )}


        {activeTab === "bookings" && (
          <div className="space-y-3">
            {/* Commission summary */}
            {(() => {
              const completed = allBookings?.filter((b: any) => b.status === "completed") ?? [];
              const totalRev = completed.reduce((s: number, b: any) => s + (Number(b.total_price) || 0), 0);
              const totalComm = completed.reduce((s: number, b: any) => s + (Number(b.commission_amount) || 0), 0);
              return completed.length > 0 ? (
                <div className="bg-primary/5 rounded-xl border border-primary/20 p-4 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Platform Revenue</p>
                    <p className="text-lg font-bold text-primary">${totalComm.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total Bookings Value</p>
                    <p className="text-sm font-semibold">${totalRev.toFixed(2)}</p>
                  </div>
                </div>
              ) : null;
            })()}
            {allBookings?.map((b: any) => (
              <div key={b.id} className="bg-card rounded-xl border p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-semibold">{b.services?.title}</h3>
                    <p className="text-xs text-muted-foreground">{b.businesses?.name}</p>
                    <p className="text-xs text-muted-foreground">{b.scheduled_date}</p>
                  </div>
                  <Badge className="text-[10px] border-0 bg-secondary">{b.status}</Badge>
                </div>
                {b.status === "completed" && Number(b.commission_amount) > 0 && (
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="font-semibold">${Number(b.total_price).toFixed(2)}</span>
                    <span className="text-primary">Commission: ${Number(b.commission_amount).toFixed(2)} ({b.commission_rate}%)</span>
                  </div>
                )}
              </div>
            ))}
            {(!allBookings || allBookings.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-6">No bookings yet</p>
            )}
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-3">
            {users?.map((u: any) => (
              <div key={u.id} className="bg-card rounded-xl border p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                  {u.full_name?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.full_name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">{u.city || "No city"}</p>
                </div>
                <Badge className="text-[10px] border-0 bg-secondary capitalize">
                  {u.user_roles?.[0]?.role ?? "customer"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
