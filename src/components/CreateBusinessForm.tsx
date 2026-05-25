import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { COUNTRIES, getCountryByCode, validatePhone, getRequiredDocsFor, VERIFICATION_DOCS_PAUSED } from "@/lib/countries";
import { Switch } from "@/components/ui/switch";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

export const CreateBusinessForm = ({ userId }: { userId: string }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [country, setCountry] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [desc, setDesc] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [serviceAreas, setServiceAreas] = useState("");
  const [requiresLicense, setRequiresLicense] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const countryConfig = getCountryByCode(country);

  const handleCountryChange = (code: string) => {
    setCountry(code);
    setPhone("");
    setPhoneError("");
  };

  const handlePhoneChange = (value: string) => {
    // Auto-prepend dial code
    if (countryConfig && !value.startsWith(countryConfig.dialCode)) {
      const digits = value.replace(/[^\d]/g, "");
      setPhone(countryConfig.dialCode + digits);
    } else {
      setPhone(value);
    }
    setPhoneError("");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!country) throw new Error("Please select a country");
      if (!officeAddress.trim()) throw new Error("Office / workshop address is required");
      const areas = serviceAreas.split(",").map(s => s.trim()).filter(Boolean);
      if (areas.length === 0) throw new Error("Please add at least one area of service");
      if (phone && !validatePhone(country, phone)) {
        throw new Error(`Invalid phone format. Expected: ${countryConfig?.phonePlaceholder}`);
      }
      const { error } = await supabase.from("businesses").insert({
        owner_id: userId,
        name,
        city,
        country,
        description: desc || null,
        phone: phone || null,
        email: email || null,
        office_address: officeAddress,
        service_areas: areas,
        requires_license: requiresLicense,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Business created! Upload verification docs for your country to get listed.");
      queryClient.invalidateQueries({ queryKey: ["my-business"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="pb-20 px-4">
      <div className="pt-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg active-scale">
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>
      <h1 className="text-xl font-bold mt-4">Register Your Business</h1>
      <p className="text-sm text-muted-foreground mt-1">Set up your profile to start receiving bookings</p>

      <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="mt-6 space-y-4">
        <div>
          <Label className="text-xs">Country *</Label>
          <Select value={country} onValueChange={handleCountryChange}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select your country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name} ({c.dialCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {country && (
          <>
            <div>
              <Label className="text-xs">Business Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">City / Region *</Label>
              <AddressAutocomplete
                value={city}
                onChange={setCity}
                countryCode={country}
                placeholder="Search for your city..."
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Phone Number *</Label>
              <Input
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder={countryConfig?.phonePlaceholder}
                required
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Format: {countryConfig?.phonePlaceholder} ({countryConfig?.phoneLength})
              </p>
              {phoneError && (
                <p className="text-[10px] text-destructive mt-0.5 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {phoneError}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Office / Workshop Address</Label>
              <Textarea value={officeAddress} onChange={(e) => setOfficeAddress(e.target.value)} rows={2} className="mt-1" placeholder="Full address of your workplace" />
            </div>
            <div>
              <Label className="text-xs">Areas of Service</Label>
              <Input value={serviceAreas} onChange={(e) => setServiceAreas(e.target.value)} className="mt-1" placeholder="e.g. Downtown, Westside, North County" />
              <p className="text-[10px] text-muted-foreground mt-0.5">Comma-separated list of areas you serve</p>
            </div>

            {!VERIFICATION_DOCS_PAUSED && (
              <div className="flex items-start gap-3 p-3 bg-secondary rounded-xl">
                <Switch id="req-lic" checked={requiresLicense} onCheckedChange={setRequiresLicense} />
                <div className="flex-1">
                  <Label htmlFor="req-lic" className="text-xs font-semibold">My business requires a license or certificate</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Turn this on only if your trade legally requires a license/certificate (e.g. licensed electrician, plumber, gas fitter).
                  </p>
                </div>
              </div>
            )}

            {VERIFICATION_DOCS_PAUSED ? (
              <div className="bg-primary/10 rounded-xl p-3">
                <p className="text-xs font-semibold mb-1">Document verification is paused</p>
                <p className="text-[10px] text-muted-foreground">
                  You don't need to upload an ID or license to register right now. We'll request these documents before we launch to customers.
                </p>
              </div>
            ) : countryConfig && (
              <div className="bg-secondary rounded-xl p-3">
                <p className="text-xs font-semibold mb-1.5">Documents required for {countryConfig.name}:</p>
                <ul className="space-y-1">
                  {getRequiredDocsFor(country, requiresLicense).map((doc) => (
                    <li key={doc.value} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {doc.label}
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-muted-foreground mt-2">
                  You'll upload these after registration. Phone verification via OTP is also required.
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={createMutation.isPending || !country}>
              {createMutation.isPending ? "Creating..." : "Create Business"}
            </Button>
          </>
        )}
      </form>
    </div>
  );
};
