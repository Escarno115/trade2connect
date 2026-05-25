import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { loadGoogleMaps } from "@/lib/googleMaps";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";

type Suggestion = {
  placeId: string;
  primary: string;
  secondary: string;
};

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  countryCode?: string; // ISO 3166-1 alpha-2 to bias results
  required?: boolean;
  className?: string;
  inputClassName?: string;
  id?: string;
}

export const AddressAutocomplete = ({
  value,
  onChange,
  placeholder = "Start typing an address...",
  countryCode,
  required,
  className,
  inputClassName,
  id,
}: Props) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const sessionTokenRef = useRef<any>(null);
  const debounceRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGoogleMaps()
      .then(() => setLoaded(true))
      .catch(() => setLoaded(false));
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const fetchSuggestions = async (input: string) => {
    if (!loaded || !input.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      const g = (window as any).google;
      const places = await g.maps.importLibrary("places");
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new places.AutocompleteSessionToken();
      }
      const request: any = {
        input,
        sessionToken: sessionTokenRef.current,
      };
      if (countryCode) {
        request.includedRegionCodes = [countryCode.toLowerCase()];
      }
      const { suggestions: res } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      const mapped: Suggestion[] = (res || [])
        .map((s: any) => {
          const p = s.placePrediction;
          if (!p) return null;
          return {
            placeId: p.placeId,
            primary: p.mainText?.text ?? p.text?.text ?? "",
            secondary: p.secondaryText?.text ?? "",
          };
        })
        .filter(Boolean);
      setSuggestions(mapped);
      setOpen(mapped.length > 0);
    } catch (e) {
      setSuggestions([]);
    }
  };

  const handleInput = (v: string) => {
    onChange(v);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => fetchSuggestions(v), 250);
  };

  const handleSelect = (s: Suggestion) => {
    const full = s.secondary ? `${s.primary}, ${s.secondary}` : s.primary;
    onChange(full);
    setOpen(false);
    setSuggestions([]);
    sessionTokenRef.current = null; // end session after selection
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        id={id}
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        required={required}
        className={inputClassName}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <button
              key={s.placeId}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full text-left px-3 py-2 hover:bg-accent flex items-start gap-2 border-b last:border-b-0"
            >
              <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{s.primary}</p>
                {s.secondary && <p className="text-[11px] text-muted-foreground truncate">{s.secondary}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
