import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, TIER_LIMITS, TIER_LABELS, TIER_PRICES, TIER_COMMISSIONS, TIER_FEATURES } from "@/lib/constants";
import type { BillingCycle } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, CheckCircle2, XCircle, Clock, DollarSign, AlertTriangle, ArrowUpCircle, Loader2, BarChart3, Receipt, Download, MapPin, ClockIcon } from "lucide-react";
import { BookingChat } from "@/components/BookingChat";
import { VerificationUpload } from "@/components/VerificationUpload";
import { CreateBusinessForm } from "@/components/CreateBusinessForm";
import { getCountryByCode } from "@/lib/countries";
import { PortfolioUpload } from "@/components/PortfolioUpload";
import { ReviewsList } from "@/components/ReviewsList";
import type { Database } from "@/integrations/supabase/types";

type ServiceCategory = Database["public"]["Enums"]["service_category"];
type BookingStatus = Database["public"]["Enums"]["booking_status"];
type SubscriptionTier = Database["public"]["Enums"]["subscription_tier"];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const ProfileTab = ({ business, user, billingCycle, setBillingCycle, upgradeRequests, requestUpgradeMutation, queryClient }: any) => {
  const [officeAddress, setOfficeAddress] = useState((business as any).office_address ?? "");
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>(() => {
    const saved = (business as any).operating_hours ?? {};
    const defaults: any = {};
    DAYS.forEach(d => {
      defaults[d] = saved[d] ?? { open: "09:00", close: "17:00", closed: false };
    });
    return defaults;
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("businesses").update({
        office_address: officeAddress,
        operating_hours: hours,
      } as any).eq("id", business.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated!");
      queryClient.invalidateQueries({ queryKey: ["my-business"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateHour = (day: string, field: "open" | "close", value: string) => {
    setHours(h => ({ ...h, [day]: { ...h[day], [field]: value } }));
  };
  const toggleClosed = (day: string) => {
    setHours(h => ({ ...h, [day]: { ...h[day], closed: !h[day].closed } }));
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border p-4 space-y-2">
        <div><span className="text-xs text-muted-foreground">Business Name</span><p className="text-sm font-medium">{business.name}</p></div>
        <div><span className="text-xs text-muted-foreground">City</span><p className="text-sm">{business.city}</p></div>
        <div><span className="text-xs text-muted-foreground">Subscription</span><p className="text-sm font-medium">{TIER_LABELS[business.subscription_tier as keyof typeof TIER_LABELS]}</p></div>
        <div><span className="text-xs text-muted-foreground">Commission Rate</span><p className="text-sm font-medium">{TIER_COMMISSIONS[business.subscription_tier as keyof typeof TIER_COMMISSIONS]}%</p></div>
        <div><span className="text-xs text-muted-foreground">Verification</span><p className="text-sm capitalize">{business.verification_status}</p></div>
        {business.verification_rejected_reason && (
          <div className="p-2 bg-destructive/10 rounded text-xs text-destructive">{business.verification_rejected_reason}</div>
        )}
      </div>

      {/* Office Address */}
      <div className="bg-card rounded-xl border p-4">
        <Label className="text-xs flex items-center gap-1.5 mb-2"><MapPin className="h-3.5 w-3.5" /> Office Address</Label>
        <Textarea
          value={officeAddress}
          onChange={(e) => setOfficeAddress(e.target.value)}
          placeholder="Enter your office/workshop address..."
          rows={2}
          className="text-sm"
        />
      </div>

      {/* Operating Hours */}
      <div className="bg-card rounded-xl border p-4">
        <Label className="text-xs flex items-center gap-1.5 mb-3"><ClockIcon className="h-3.5 w-3.5" /> Hours of Operation</Label>
        <div className="space-y-2">
          {DAYS.map(day => (
            <div key={day} className="flex items-center gap-2">
              <span className="text-xs w-16 shrink-0">{day.slice(0, 3)}</span>
              {hours[day].closed ? (
                <span className="text-xs text-muted-foreground flex-1">Closed</span>
              ) : (
                <div className="flex items-center gap-1 flex-1">
                  <Input type="time" value={hours[day].open} onChange={(e) => updateHour(day, "open", e.target.value)} className="h-7 text-xs flex-1" />
                  <span className="text-xs text-muted-foreground">-</span>
                  <Input type="time" value={hours[day].close} onChange={(e) => updateHour(day, "close", e.target.value)} className="h-7 text-xs flex-1" />
                </div>
              )}
              <button onClick={() => toggleClosed(day)} className={cn("text-[10px] font-medium px-2 py-1 rounded", hours[day].closed ? "text-destructive" : "text-muted-foreground")}>
                {hours[day].closed ? "Closed" : "Open"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <Button size="sm" className="w-full" onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending}>
        {updateProfileMutation.isPending ? "Saving..." : "Save Profile Changes"}
      </Button>

      {/* Subscription Plans */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Subscription Plans</h3>
        <div className="flex gap-1 bg-secondary rounded-lg p-0.5 mb-3">
          {(["monthly", "weekly"] as const).map((cycle) => (
            <button
              key={cycle}
              onClick={() => setBillingCycle(cycle)}
              className={cn(
                "flex-1 py-1.5 text-xs font-medium rounded-md transition-colors capitalize",
                billingCycle === cycle ? "bg-card shadow-sm" : "text-muted-foreground"
              )}
            >
              {cycle}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {(["free", "basic", "pro"] as const).map((tier) => {
            const isCurrentTier = business.subscription_tier === tier;
            const tierOrder = { free: 0, basic: 1, pro: 2 } as const;
            const isUpgrade = tierOrder[tier] > tierOrder[business.subscription_tier as keyof typeof tierOrder];
            const pendingRequest = upgradeRequests?.find((r: any) => r.requested_tier === tier && r.status === "pending");
            const price = TIER_PRICES[tier][billingCycle];
            return (
              <div key={tier} className={cn("rounded-xl border p-3", isCurrentTier ? "border-primary bg-primary/5" : "bg-card")}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-semibold">{TIER_LABELS[tier]}</span>
                    {isCurrentTier && <Badge className="ml-2 text-[10px] border-0 bg-primary/10 text-primary">Current</Badge>}
                    {pendingRequest && <Badge className="ml-2 text-[10px] border-0 bg-warning/10 text-warning">Pending</Badge>}
                  </div>
                  <span className="text-sm font-bold">
                    ${price}
                    <span className="text-xs text-muted-foreground font-normal">/{billingCycle === "weekly" ? "wk" : "mo"}</span>
                  </span>
                </div>
                <ul className="mt-1.5 space-y-0.5">
                  {TIER_FEATURES[tier].map((f) => (
                    <li key={f} className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-success shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {isUpgrade && !pendingRequest && (
                  <Button
                    size="sm"
                    className="w-full mt-2 text-xs"
                    disabled={requestUpgradeMutation.isPending}
                    onClick={() => requestUpgradeMutation.mutate({ requestedTier: tier, cycle: billingCycle })}
                  >
                    {requestUpgradeMutation.isPending ? (
                      <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Requesting...</>
                    ) : (
                      <><ArrowUpCircle className="h-3 w-3 mr-1" /> Request Upgrade ({billingCycle})</>
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Country info */}
      {business.country && (
        <div>
          <span className="text-xs text-muted-foreground">Country</span>
          <p className="text-sm font-medium">{getCountryByCode(business.country)?.name ?? business.country}</p>
        </div>
      )}

      {/* Phone verification status */}
      <div className="flex items-center gap-2">
        <div>
          <span className="text-xs text-muted-foreground">Phone</span>
          <p className="text-sm">{business.phone ?? "Not set"}</p>
        </div>
        {business.phone && (
          <Badge className={cn("ml-auto text-[10px] border-0",
            business.phone_verified ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          )}>
            {business.phone_verified ? "Verified" : "Unverified"}
          </Badge>
        )}
      </div>

      {/* Verification Documents Upload */}
      <VerificationUpload businessId={business.id} userId={user!.id} country={business.country} />
    </div>
  );
};

const BusinessDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"services" | "bookings" | "portfolio" | "reviews" | "profile" | "invoices">("services");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [showAddService, setShowAddService] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState<ServiceCategory>("plumbing");

  const { data: business } = useQuery({
    queryKey: ["my-business", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: services } = useQuery({
    queryKey: ["my-services", business?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", business!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!business,
  });

  const { data: bookings } = useQuery({
    queryKey: ["business-bookings", business?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, services(title), profiles:customer_id(full_name)")
        .eq("business_id", business!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!business,
  });

  // Subscription upgrade requests
  const { data: upgradeRequests } = useQuery({
    queryKey: ["subscription-requests", business?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_requests")
        .select("*")
        .eq("business_id", business!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!business,
  });

  const requestUpgradeMutation = useMutation({
    mutationFn: async ({ requestedTier, cycle }: { requestedTier: SubscriptionTier; cycle: BillingCycle }) => {
      if (!business) return;
      // Update billing cycle on business
      await supabase.from("businesses").update({ billing_cycle: cycle } as any).eq("id", business.id);
      const { error } = await supabase.from("subscription_requests").insert({
        business_id: business.id,
        current_tier: business.subscription_tier,
        requested_tier: requestedTier,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Upgrade request submitted! We'll review it shortly.");
      queryClient.invalidateQueries({ queryKey: ["subscription-requests"] });
      queryClient.invalidateQueries({ queryKey: ["my-business"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Invoices query
  const { data: invoices } = useQuery({
    queryKey: ["my-invoices", business?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices" as any)
        .select("*")
        .eq("business_id", business!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
    enabled: !!business,
  });

  const updateBillingCycleMutation = useMutation({
    mutationFn: async (cycle: BillingCycle) => {
      if (!business) return;
      const { error } = await supabase.from("businesses").update({ billing_cycle: cycle } as any).eq("id", business.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Billing cycle updated!");
      queryClient.invalidateQueries({ queryKey: ["my-business"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Realtime: notify business of new bookings
  useEffect(() => {
    if (!business) return;
    const channel = supabase
      .channel('new-bookings')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `business_id=eq.${business.id}`,
        },
        () => {
          toast("New booking request received! 📋");
          queryClient.invalidateQueries({ queryKey: ["business-bookings"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [business, queryClient]);

  const addServiceMutation = useMutation({
    mutationFn: async () => {
      if (!business) return;
      const limit = TIER_LIMITS[business.subscription_tier];
      if (services && services.length >= limit) {
        throw new Error(`You've reached the ${TIER_LABELS[business.subscription_tier]} tier limit of ${limit} services. Upgrade to add more.`);
      }
      const { error } = await supabase.from("services").insert({
        business_id: business.id,
        title: newTitle,
        description: newDesc || null,
        base_price: Number(newPrice),
        category: newCategory,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service added!");
      setShowAddService(false);
      setNewTitle(""); setNewDesc(""); setNewPrice("");
      queryClient.invalidateQueries({ queryKey: ["my-services"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking updated!");
      queryClient.invalidateQueries({ queryKey: ["business-bookings"] });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service deleted");
      queryClient.invalidateQueries({ queryKey: ["my-services"] });
    },
  });

  if (!user) {
    navigate("/auth?role=business");
    return null;
  }

  if (!business) {
    return <CreateBusinessForm userId={user.id} />;
  }

  const serviceLimit = TIER_LIMITS[business.subscription_tier];
  const atLimit = services ? services.length >= serviceLimit : false;

  const tabs = [
    { key: "services" as const, label: "Services" },
    { key: "bookings" as const, label: "Bookings" },
    { key: "invoices" as const, label: "Invoices" },
    { key: "portfolio" as const, label: "Portfolio" },
    { key: "reviews" as const, label: "Reviews" },
    { key: "profile" as const, label: "Profile" },
  ];

  const completedBookings = bookings?.filter((b: any) => b.status === "completed") ?? [];
  const totalRevenue = completedBookings.reduce((sum: number, b: any) => sum + (Number(b.total_price) || 0), 0);
  const totalCommission = completedBookings.reduce((sum: number, b: any) => sum + (Number(b.commission_amount) || 0), 0);
  const totalEarnings = totalRevenue - totalCommission;

  return (
    <div className="pb-20">
      <div className="px-4 pt-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg active-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Dashboard</h1>
        <Badge className={cn("ml-auto text-[10px] border-0",
          business.verification_status === "approved" ? "bg-success/10 text-success" :
          business.verification_status === "pending" ? "bg-warning/10 text-warning" :
          "bg-destructive/10 text-destructive"
        )}>
          {business.verification_status}
        </Badge>
      </div>

      {/* Stats */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl border p-3 text-center">
          <p className="text-lg font-bold">{services?.length ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">Services</p>
        </div>
        <div className="bg-card rounded-xl border p-3 text-center">
          <p className="text-lg font-bold">{bookings?.length ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">Bookings</p>
        </div>
        <div className="bg-card rounded-xl border p-3 text-center cursor-pointer active-scale" onClick={() => navigate("/dashboard/commissions")}>
          <p className="text-lg font-bold text-primary">${totalEarnings.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Net Earnings</p>
        </div>
        <div className="bg-card rounded-xl border p-3 text-center cursor-pointer active-scale" onClick={() => navigate("/dashboard/commissions")}>
          <p className="text-lg font-bold text-destructive">${totalCommission.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Commission ({TIER_COMMISSIONS[business.subscription_tier]}%)</p>
        </div>
      </div>

      {/* Analytics Link */}
      <div className="px-4 mt-3">
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate("/dashboard/analytics")}>
          <BarChart3 className="h-3.5 w-3.5 mr-1" /> View Analytics
        </Button>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-4 flex gap-1 bg-secondary rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "flex-1 py-2 text-xs font-medium rounded-lg transition-colors",
              activeTab === t.key ? "bg-card shadow-sm" : "text-muted-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4">
        {activeTab === "services" && (
          <div className="space-y-3">
            {atLimit && (
              <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-xl text-xs text-warning">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  You've reached the {TIER_LABELS[business.subscription_tier]} tier limit ({serviceLimit} services).
                  Contact admin to upgrade.
                </span>
              </div>
            )}

            <Button size="sm" onClick={() => setShowAddService(!showAddService)} disabled={atLimit} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Add Service
            </Button>

            {showAddService && (
              <form onSubmit={(e) => { e.preventDefault(); addServiceMutation.mutate(); }} className="bg-card rounded-xl border p-4 space-y-3">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={newCategory} onValueChange={(v) => setNewCategory(v as ServiceCategory)}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Base Price ($)</Label>
                  <Input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} required min="0" step="0.01" className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} className="mt-1" />
                </div>
                <Button type="submit" size="sm" disabled={addServiceMutation.isPending} className="w-full">
                  {addServiceMutation.isPending ? "Adding..." : "Add Service"}
                </Button>
              </form>
            )}

            {services?.map((s) => (
              <div key={s.id} className="bg-card rounded-xl border p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate">{s.title}</h3>
                  <p className="text-xs text-muted-foreground">{s.category} · ${Number(s.base_price).toFixed(0)}</p>
                </div>
                <button onClick={() => deleteServiceMutation.mutate(s.id)} className="p-2 text-destructive rounded-lg active-scale">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="space-y-3">
            {bookings && bookings.length > 0 ? bookings.map((b: any) => (
              <div key={b.id} className="bg-card rounded-xl border p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-semibold">{b.services?.title}</h3>
                    <p className="text-xs text-muted-foreground">{(b.profiles as any)?.full_name ?? "Customer"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{b.scheduled_date} at {b.scheduled_time}</p>
                  </div>
                  <Badge className={cn("text-[10px] border-0",
                    b.status === "pending" ? "bg-warning/10 text-warning" :
                    b.status === "accepted" ? "bg-primary/10 text-primary" :
                    b.status === "completed" ? "bg-success/10 text-success" :
                    "bg-secondary text-muted-foreground"
                  )}>
                    {b.status}
                  </Badge>
                </div>
                {b.total_price && (
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="font-semibold text-primary">${Number(b.total_price).toFixed(2)}</span>
                    {b.status === "completed" && Number(b.commission_amount) > 0 && (
                      <span className="text-destructive">-${Number(b.commission_amount).toFixed(2)} ({b.commission_rate}%)</span>
                    )}
                  </div>
                )}
                {b.notes && <p className="text-xs text-muted-foreground mt-2 bg-secondary p-2 rounded">{b.notes}</p>}
                {b.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => updateBookingMutation.mutate({ id: b.id, status: "accepted" })}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs text-destructive" onClick={() => updateBookingMutation.mutate({ id: b.id, status: "rejected" })}>
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                )}
                {b.status === "accepted" && (
                  <Button size="sm" className="w-full mt-3 text-xs" onClick={() => updateBookingMutation.mutate({ id: b.id, status: "in_progress" })}>
                    <Clock className="h-3.5 w-3.5 mr-1" /> Start Job
                  </Button>
                )}
                {b.status === "in_progress" && (
                  <Button size="sm" className="w-full mt-3 text-xs" onClick={() => updateBookingMutation.mutate({ id: b.id, status: "completed" })}>
                    <DollarSign className="h-3.5 w-3.5 mr-1" /> Mark Complete
                  </Button>
                )}
                {/* Chat */}
                {["accepted", "in_progress", "completed"].includes(b.status) && (
                  <BookingChat bookingId={b.id} businessOwnerId={user?.id} />
                )}
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-6">No bookings yet</p>
            )}
          </div>
        )}

        {activeTab === "invoices" && (
          <div className="space-y-3">
            <div className="bg-card rounded-xl border p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Billing Cycle</h3>
                <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
                  {(["monthly", "weekly"] as const).map((cycle) => (
                    <button
                      key={cycle}
                      onClick={() => {
                        setBillingCycle(cycle);
                        updateBillingCycleMutation.mutate(cycle);
                      }}
                      className={cn(
                        "px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize",
                        (business as any).billing_cycle === cycle ? "bg-card shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      {cycle}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Current: <span className="font-medium text-foreground capitalize">{(business as any).billing_cycle ?? "monthly"}</span>
                {business.subscription_tier !== "free" && (
                  <> · <span className="font-medium text-primary">
                    ${TIER_PRICES[business.subscription_tier][(business as any).billing_cycle === "weekly" ? "weekly" : "monthly"]}
                    /{(business as any).billing_cycle === "weekly" ? "wk" : "mo"}
                  </span></>
                )}
              </p>
            </div>

            {invoices && invoices.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={() => {
                  const headers = ["Amount,Status,Billing Cycle,Tier,Due Date,Paid At,Created"];
                  const rows = invoices.map((i: any) =>
                    `${i.amount},${i.status},${i.billing_cycle},${i.subscription_tier},${i.due_date},${i.paid_at ?? ""},${i.created_at}`
                  );
                  const csv = [headers, ...rows].join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `my-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("CSV exported!");
                }}
              >
                <Download className="h-3.5 w-3.5 mr-1" /> Export Invoices CSV
              </Button>
            )}

            {invoices && invoices.length > 0 ? invoices.map((inv: any) => (
              <div key={inv.id} className="bg-card rounded-xl border p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-semibold">${Number(inv.amount).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{inv.billing_cycle} · {inv.subscription_tier}</p>
                    <p className="text-[10px] text-muted-foreground">Due: {new Date(inv.due_date).toLocaleDateString()}</p>
                  </div>
                  <Badge className={cn("text-[10px] border-0",
                    inv.status === "paid" ? "bg-success/10 text-success" :
                    inv.status === "pending" ? "bg-warning/10 text-warning" :
                    "bg-destructive/10 text-destructive"
                  )}>
                    {inv.status}
                  </Badge>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-6">No invoices yet</p>
            )}
          </div>
        )}

        {activeTab === "portfolio" && (
          <PortfolioUpload businessId={business.id} userId={user!.id} />
        )}

        {activeTab === "reviews" && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Customer Reviews</h3>
            <ReviewsList businessId={business.id} isOwner />
          </div>
        )}

        {activeTab === "profile" && (
          <ProfileTab business={business} user={user!} billingCycle={billingCycle} setBillingCycle={setBillingCycle} upgradeRequests={upgradeRequests} requestUpgradeMutation={requestUpgradeMutation} queryClient={queryClient} />
        )}
      </div>
    </div>
  );
};

export default BusinessDashboard;
