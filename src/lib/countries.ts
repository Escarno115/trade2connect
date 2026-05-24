export type DocKind = "license" | "id";

export type RequiredDoc = { value: string; label: string; kind: DocKind };

export type CountryConfig = {
  code: string;
  name: string;
  dialCode: string;
  phonePattern: RegExp;
  phonePlaceholder: string;
  phoneLength: string;
  requiredDocs: RequiredDoc[];
};

export const COUNTRIES: CountryConfig[] = [
  {
    code: "ZA",
    name: "South Africa",
    dialCode: "+27",
    phonePattern: /^\+27\d{9}$/,
    phonePlaceholder: "+27812345678",
    phoneLength: "9 digits after +27",
    requiredDocs: [
      { value: "cipc_registration", label: "CIPC Registration Certificate", kind: "license" },
      { value: "sa_id", label: "South African ID Document", kind: "id" },
    ],
  },
  {
    code: "NG",
    name: "Nigeria",
    dialCode: "+234",
    phonePattern: /^\+234\d{10}$/,
    phonePlaceholder: "+2348012345678",
    phoneLength: "10 digits after +234",
    requiredDocs: [
      { value: "cac_registration", label: "CAC Registration Certificate", kind: "license" },
      { value: "ng_id", label: "National ID Card (NIN)", kind: "id" },
    ],
  },
  {
    code: "KE",
    name: "Kenya",
    dialCode: "+254",
    phonePattern: /^\+254\d{9}$/,
    phonePlaceholder: "+254712345678",
    phoneLength: "9 digits after +254",
    requiredDocs: [
      { value: "business_permit", label: "Business Permit / License", kind: "license" },
      { value: "ke_id", label: "Kenyan National ID", kind: "id" },
    ],
  },
  {
    code: "GH",
    name: "Ghana",
    dialCode: "+233",
    phonePattern: /^\+233\d{9}$/,
    phonePlaceholder: "+233241234567",
    phoneLength: "9 digits after +233",
    requiredDocs: [
      { value: "rg_certificate", label: "Registrar General Certificate", kind: "license" },
      { value: "gh_id", label: "Ghana Card", kind: "id" },
    ],
  },
  {
    code: "US",
    name: "United States",
    dialCode: "+1",
    phonePattern: /^\+1\d{10}$/,
    phonePlaceholder: "+12025551234",
    phoneLength: "10 digits after +1",
    requiredDocs: [
      { value: "business_license", label: "Business License / EIN Letter", kind: "license" },
      { value: "us_id", label: "Government-Issued Photo ID", kind: "id" },
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    dialCode: "+44",
    phonePattern: /^\+44\d{10}$/,
    phonePlaceholder: "+447911123456",
    phoneLength: "10 digits after +44",
    requiredDocs: [
      { value: "companies_house", label: "Companies House Certificate", kind: "license" },
      { value: "gb_id", label: "Passport or Driving Licence", kind: "id" },
    ],
  },
  {
    code: "AU",
    name: "Australia",
    dialCode: "+61",
    phonePattern: /^\+61\d{9}$/,
    phonePlaceholder: "+61412345678",
    phoneLength: "9 digits after +61",
    requiredDocs: [
      { value: "abn_registration", label: "ABN Registration", kind: "license" },
      { value: "au_id", label: "Australian ID (Passport / Driver Licence)", kind: "id" },
    ],
  },
  {
    code: "IN",
    name: "India",
    dialCode: "+91",
    phonePattern: /^\+91\d{10}$/,
    phonePlaceholder: "+919876543210",
    phoneLength: "10 digits after +91",
    requiredDocs: [
      { value: "gstin_certificate", label: "GSTIN / Udyam Registration", kind: "license" },
      { value: "in_id", label: "Aadhaar Card or PAN Card", kind: "id" },
    ],
  },
];

export const getCountryByCode = (code: string): CountryConfig | undefined =>
  COUNTRIES.find((c) => c.code === code);

export const validatePhone = (country: string, phone: string): boolean => {
  const config = getCountryByCode(country);
  if (!config) return phone.length >= 8;
  return config.phonePattern.test(phone);
};

// Verification documents (ID + license) are temporarily paused pre-launch.
// Will be re-enabled when we open to customers.
export const VERIFICATION_DOCS_PAUSED = true;

export const getRequiredDocsFor = (
  country: string,
  requiresLicense: boolean,
): RequiredDoc[] => {
  if (VERIFICATION_DOCS_PAUSED) return [];
  const config = getCountryByCode(country);
  if (!config) return [];
  return requiresLicense
    ? config.requiredDocs
    : config.requiredDocs.filter((d) => d.kind !== "license");
};
