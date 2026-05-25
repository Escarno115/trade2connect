// Loader for the Google Maps JS API (used for Places Autocomplete - New)
let loadPromise: Promise<any> | null = null;

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as any).google?.maps?.places) return Promise.resolve((window as any).google);
  if (loadPromise) return loadPromise;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
  if (!key) return Promise.reject(new Error("Google Maps browser key missing"));

  loadPromise = new Promise((resolve, reject) => {
    (window as any).__initGoogleMaps = () => resolve((window as any).google);
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key,
      v: "weekly",
      libraries: "places",
      loading: "async",
      callback: "__initGoogleMaps",
    });
    if (channel) params.set("channel", channel);
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return loadPromise;
}
