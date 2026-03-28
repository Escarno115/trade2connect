import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getCountryByCode, type CountryConfig } from "@/lib/countries";

// Fallback doc types if country not set
const FALLBACK_DOC_TYPES = [
  { value: "business_registration", label: "Business Registration Certificate" },
  { value: "id_document", label: "ID Document" },
];

type Props = {
  businessId: string;
  userId: string;
  country?: string;
};

export const VerificationUpload = ({ businessId, userId, country }: Props) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countryConfig = country ? getCountryByCode(country) : undefined;
  const docTypes = countryConfig?.requiredDocs ?? FALLBACK_DOC_TYPES;
  const [docType, setDocType] = useState(docTypes[0]?.value ?? "");
  const [uploading, setUploading] = useState(false);

  const { data: existingDocs } = useQuery({
    queryKey: ["verification-docs", businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from("verification_documents")
        .select("*")
        .eq("business_id", businessId)
        .order("uploaded_at", { ascending: false });
      return data ?? [];
    },
  });

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${businessId}/${docType}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("verification-docs")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("verification_documents")
        .insert({
          business_id: businessId,
          document_type: docType,
          file_url: path,
        });

      if (insertError) throw insertError;

      toast.success("Document uploaded successfully!");
      queryClient.invalidateQueries({ queryKey: ["verification-docs"] });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const uploadedTypes = new Set(existingDocs?.map((d) => d.document_type));
  const allDocsUploaded = docTypes.every((dt) => uploadedTypes.has(dt.value));
  const missingDocs = docTypes.filter((dt) => !uploadedTypes.has(dt.value));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Verification Documents</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {countryConfig
            ? `Upload the required documents for ${countryConfig.name}`
            : "Upload required documents to get your business verified"}
        </p>
      </div>

      {/* Completion status */}
      {allDocsUploaded ? (
        <div className="flex items-center gap-2 p-3 bg-success/10 rounded-xl text-xs text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>All required documents uploaded! Awaiting admin review.</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-xl text-xs text-warning">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{missingDocs.length} document(s) still required</span>
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-2">
        {docTypes.map((dt) => {
          const uploaded = uploadedTypes.has(dt.value);
          return (
            <div
              key={dt.value}
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-lg text-xs",
                uploaded ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"
              )}
            >
              {uploaded ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <FileText className="h-4 w-4 shrink-0" />
              )}
              <span className="font-medium">{dt.label}</span>
              {uploaded && <span className="ml-auto text-[10px]">✓ Uploaded</span>}
            </div>
          );
        })}
      </div>

      {/* Upload form */}
      {!allDocsUploaded && (
        <div className="bg-card rounded-xl border p-4 space-y-3">
          <div>
            <Label className="text-xs">Document Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="mt-1 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {docTypes.map((dt) => (
                  <SelectItem key={dt.value} value={dt.value}>
                    {dt.label} {uploadedTypes.has(dt.value) ? "✓" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />

          <Button
            type="button"
            variant="outline"
            className="w-full text-xs"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1" /> Upload Document
              </>
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            PDF, JPG, PNG · Max 10MB
          </p>
        </div>
      )}
    </div>
  );
};
