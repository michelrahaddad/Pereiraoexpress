import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const brazilianCities = [
  "Abaetetuba", "Açailândia", "Alagoinhas", "Altamira", "Americana", "Ananindeua", 
  "Anápolis", "Angra dos Reis", "Aparecida de Goiânia", "Apucarana", "Aracaju", 
  "Araçatuba", "Araguaína", "Araguari", "Arapiraca", "Arapongas", "Araraquara", 
  "Araras", "Araruama", "Araucária", "Atibaia", "Bagé", "Balneário Camboriú", 
  "Barbacena", "Barra do Piraí", "Barra Mansa", "Barreiras", "Barretos", 
  "Barueri", "Bauru", "Belém", "Belford Roxo", "Belo Horizonte", "Betim", 
  "Birigui", "Blumenau", "Boa Vista", "Botucatu", "Bragança Paulista", "Brasília", 
  "Brusque", "Buíque", "Cabo de Santo Agostinho", "Cabo Frio", "Cachoeira do Sul", 
  "Cachoeirinha", "Cachoeiro de Itapemirim", "Cametá", "Camaragibe", "Campina Grande", 
  "Campinas", "Campo Grande", "Campo Largo", "Campo Mourão", "Campos dos Goytacazes", 
  "Canoas", "Caraguatatuba", "Carapicuíba", "Caratinga", "Caruaru", "Cascavel", 
  "Castanhal", "Cataguases", "Catanduva", "Caucaia", "Caxias", "Caxias do Sul", 
  "Chapecó", "Cianorte", "Codó", "Colatina", "Colombo", "Conselheiro Lafaiete", 
  "Contagem", "Coronel Fabriciano", "Corumbá", "Cotia", "Crateús", "Criciúma", 
  "Cruz Alta", "Cubatão", "Cuiabá", "Curitiba", "Diadema", "Divinópolis", 
  "Dourados", "Duque de Caxias", "Embu das Artes", "Erechim", "Eunápolis", 
  "Feira de Santana", "Ferraz de Vasconcelos", "Florianópolis", "Formosa", 
  "Fortaleza", "Foz do Iguaçu", "Franca", "Francisco Morato", "Franco da Rocha", 
  "Garanhuns", "Goiânia", "Governador Valadares", "Gravataí", "Guarapari", 
  "Guarapuava", "Guaratinguetá", "Guarujá", "Guarulhos", "Hortolândia", 
  "Ibirité", "Ibiúna", "Içara", "Igarassu", "Ilhéus", "Imperatriz", "Indaiatuba", 
  "Ipatinga", "Itabira", "Itaboraí", "Itabuna", "Itaguaí", "Itajaí", "Itanhaém", 
  "Itapetininga", "Itapevi", "Itapipoca", "Itaquaquecetuba", "Itatiba", "Itu", 
  "Ituiutaba", "Jacareí", "Jandira", "Jaú", "Jequié", "Ji-Paraná", "João Pessoa", 
  "Joinville", "Juazeiro", "Juazeiro do Norte", "Juiz de Fora", "Jundiaí", 
  "Lages", "Lajeado", "Lavras", "Limeira", "Linhares", "Londrina", "Luziânia", 
  "Macaé", "Macapá", "Maceió", "Magé", "Manaus", "Marabá", "Maracanaú", 
  "Maranguape", "Marília", "Maringá", "Marituba", "Mauá", "Mesquita", "Mococa", 
  "Mogi das Cruzes", "Mogi Guaçu", "Mogi Mirim", "Montes Claros", "Mossoró", 
  "Muriaé", "Natal", "Navegantes", "Niterói", "Nova Friburgo", "Nova Iguaçu", 
  "Nova Lima", "Nova Serrana", "Novo Hamburgo", "Olinda", "Osasco", "Ourinhos", 
  "Palhoça", "Palmas", "Paranaguá", "Parauapebas", "Parintins", "Parnaíba", 
  "Parnamirim", "Passos", "Passo Fundo", "Patos", "Patos de Minas", "Paulínia", 
  "Paulo Afonso", "Pelotas", "Petrolina", "Petrópolis", "Pindamonhangaba", 
  "Piracicaba", "Pirassununga", "Poá", "Poços de Caldas", "Ponta Grossa", 
  "Ponte Nova", "Porto Alegre", "Porto Seguro", "Porto Velho", "Pouso Alegre", 
  "Praia Grande", "Presidente Prudente", "Queimados", "Recife", "Resende", 
  "Ribeirão das Neves", "Ribeirão Pires", "Ribeirão Preto", "Rio Branco", 
  "Rio Claro", "Rio das Ostras", "Rio de Janeiro", "Rio Grande", "Rio Verde", 
  "Rondonópolis", "Sabará", "Salto", "Salvador", "Santa Bárbara d'Oeste", 
  "Santa Cruz do Capibaribe", "Santa Cruz do Sul", "Santa Luzia", "Santa Maria", 
  "Santa Rita", "Santana", "Santana de Parnaíba", "Santarém", "Santo André", 
  "Santo Antônio de Jesus", "Santos", "São Bernardo do Campo", "São Caetano do Sul", 
  "São Carlos", "São Gonçalo", "São João de Meriti", "São José", "São José de Ribamar", 
  "São José do Rio Preto", "São José dos Campos", "São José dos Pinhais", 
  "São Leopoldo", "São Lourenço da Mata", "São Luís", "São Mateus", "São Paulo", 
  "São Vicente", "Sapucaia do Sul", "Serra", "Serrana", "Sertãozinho", "Sete Lagoas", 
  "Sinop", "Sobral", "Sorocaba", "Sumaré", "Suzano", "Taboão da Serra", 
  "Taubaté", "Teófilo Otoni", "Teresina", "Teresópolis", "Timon", "Toledo", 
  "Tucuruí", "Tubarão", "Uberaba", "Uberlândia", "Umuarama", "Valinhos", 
  "Várzea Grande", "Várzea Paulista", "Vespasiano", "Viamão", "Vila Velha", 
  "Vinhedo", "Vitória", "Vitória da Conquista", "Vitória de Santo Antão", 
  "Volta Redonda"
];

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

export { brazilianCities };
