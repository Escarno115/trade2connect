import { Wrench, Zap, Hammer, Building2, Paintbrush, Home, Trees, SprayCan, Wind, MoreHorizontal } from "lucide-react";

export const CATEGORIES = [
  { value: "plumbing", label: "Plumbing", icon: Wrench, color: "bg-blue-100 text-blue-700" },
  { value: "electrical", label: "Electrical", icon: Zap, color: "bg-amber-100 text-amber-700" },
  { value: "carpentry", label: "Carpentry", icon: Hammer, color: "bg-orange-100 text-orange-700" },
  { value: "building", label: "Building", icon: Building2, color: "bg-stone-100 text-stone-700" },
  { value: "painting", label: "Painting", icon: Paintbrush, color: "bg-pink-100 text-pink-700" },
  { value: "roofing", label: "Roofing", icon: Home, color: "bg-red-100 text-red-700" },
  { value: "landscaping", label: "Landscaping", icon: Trees, color: "bg-green-100 text-green-700" },
  { value: "cleaning", label: "Cleaning", icon: SprayCan, color: "bg-cyan-100 text-cyan-700" },
  { value: "hvac", label: "HVAC", icon: Wind, color: "bg-indigo-100 text-indigo-700" },
  { value: "other", label: "Other", icon: MoreHorizontal, color: "bg-gray-100 text-gray-700" },
] as const;

export const TIER_LIMITS = {
  free: 5,
  basic: 15,
  pro: Infinity,
} as const;

export const TIER_LABELS = {
  free: "Standard",
  basic: "Pro",
  pro: "Ultimate",
} as const;

export const TIER_PRICES = {
  free: 0,
  basic: 25,
  pro: 50,
} as const;

export const TIER_COMMISSIONS = {
  free: 14,
  basic: 7,
  pro: 1,
} as const;

export const TIER_FEATURES = {
  free: ["Up to 5 services", "14% commission per booking", "Basic listing"],
  basic: ["Up to 15 services", "7% commission per booking", "Featured in search", "Priority support"],
  pro: ["Unlimited services", "1% commission per booking", "Top placement", "Priority support", "PRO badge"],
} as const;
