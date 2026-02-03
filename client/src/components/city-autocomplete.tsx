import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { brazilianCities } from "@/data/brazilian-cities";

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

export function CityAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Buscar cidade...",
  className,
  "data-testid": testId = "city-autocomplete"
}: CityAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCities = searchTerm
    ? brazilianCities.filter(city => 
        city.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 10)
    : brazilianCities.slice(0, 10);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (city: string) => {
    setSearchTerm(city);
    onChange(city);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchTerm("");
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className="pl-10 pr-16"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          data-testid={testId}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchTerm && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleClear}
              data-testid={`${testId}-clear`}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsOpen(!isOpen)}
            data-testid={`${testId}-toggle`}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredCities.length > 0 ? (
            <div className="p-1">
              {filteredCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2",
                    value === city && "bg-accent/50"
                  )}
                  onClick={() => handleSelect(city)}
                  data-testid={`${testId}-option-${city.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  {city}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Search className="h-5 w-5 mx-auto mb-2 opacity-50" />
              Nenhuma cidade encontrada
            </div>
          )}
          {searchTerm && !brazilianCities.includes(searchTerm) && filteredCities.length > 0 && (
            <div className="border-t p-2">
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2 text-primary"
                onClick={() => handleSelect(searchTerm)}
                data-testid={`${testId}-custom`}
              >
                <MapPin className="h-3 w-3" />
                Usar "{searchTerm}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { brazilianCities } from "@/data/brazilian-cities";
