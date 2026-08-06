import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, X, Loader2 } from "lucide-react";

interface SearchResult {
  name: string;
  city?: string;
  street?: string;
  country?: string;
  lat: number;
  lon: number;
}

interface SearchAutocompleteProps {
  onSelectLocation: (location: { name: string; lat: number; lon: number }) => void;
  bbox?: string; // Bounding box for localized city search
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({ onSelectLocation, bbox }) => {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const bboxParam = bbox ? `&bbox=${bbox}` : "";
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5${bboxParam}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const parsedResults: SearchResult[] = data.features.map((f: any) => ({
            name: f.properties.name || f.properties.street || "Location",
            city: f.properties.city || f.properties.state || f.properties.country,
            street: f.properties.street,
            country: f.properties.country,
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
          }));
          setResults(parsedResults);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Photon search failed", err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, bbox]);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder="Search destination, stop, or landmark..."
          className="w-full bg-white border border-slate-300 focus:border-[#f7a501] focus:ring-2 focus:ring-[#f7a501]/30 rounded-xl pl-10 pr-9 py-2 text-xs font-semibold text-slate-900 placeholder-slate-500 outline-none transition-all shadow-sm"
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 w-4 h-4 text-[#b17816] animate-spin" />
        ) : query ? (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute right-3 text-slate-400 hover:text-slate-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Autocomplete Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-300 rounded-2xl p-2 shadow-xl z-50 animate-fadeIn space-y-1">
          {results.map((res, i) => (
            <button
              key={i}
              onClick={() => {
                onSelectLocation({ name: res.name, lat: res.lat, lon: res.lon });
                setQuery(res.name);
                setIsOpen(false);
              }}
              className="w-full p-2.5 rounded-xl hover:bg-slate-100 border border-transparent text-left flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-[#f7a501] group-hover:text-slate-950 transition-colors">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="font-bold text-slate-900 text-xs block truncate group-hover:text-slate-950 transition-colors">
                    {res.name}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate block">
                    {res.city ? `${res.city}, ${res.country || ''}` : res.country}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                {Math.round(res.lat * 100) / 100}, {Math.round(res.lon * 100) / 100}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
