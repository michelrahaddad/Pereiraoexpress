import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, MapPin, Briefcase, CheckCircle, ArrowLeft, Crown, Award, User, Navigation } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";

interface Provider {
  id: string;
  userId: string;
  rating: string;
  totalRatings: number;
  totalServices: number;
  city: string;
  specialties: string;
  bio: string;
  adjustedPrice: number;
  ratingLevel: string;
  basePrice: number;
  distance: number | null;
}

export default function SelectProvider() {
  const [, params] = useRoute("/cliente/selecionar-profissional/:serviceId");
  const serviceId = params?.serviceId;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const { latitude, longitude, loading: locationLoading, error: locationError } = useGeolocation();

  const { data: service } = useQuery<any>({
    queryKey: ["/api/services", serviceId],
    enabled: !!serviceId,
  });

  const { data: providers = [], isLoading } = useQuery<Provider[]>({
    queryKey: ["/api/providers/available", { serviceId, lat: latitude, lon: longitude }],
    queryFn: async () => {
      let url = `/api/providers/available?serviceId=${serviceId}`;
      if (latitude && longitude) {
        url += `&lat=${latitude}&lon=${longitude}`;
      }
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch providers");
      return res.json();
    },
    enabled: !!serviceId && !locationLoading,
  });

  const selectMutation = useMutation({
    mutationFn: async (providerId: string) => {
      return apiRequest("POST", `/api/services/${serviceId}/select-provider`, { providerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Profissional selecionado!",
        description: "O profissional foi notificado e entrará em contato em breve.",
      });
      navigate("/cliente");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível selecionar o profissional.",
        variant: "destructive",
      });
    },
  });

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const getRatingIcon = (level: string) => {
    switch (level) {
      case "Premium":
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case "Experiente":
        return <Award className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 9) return "text-yellow-500";
    if (rating >= 7) return "text-blue-500";
    if (rating >= 5) return "text-green-500";
    return "text-muted-foreground";
  };

  const getMultiplierBadge = (level: string, hasRatings: boolean) => {
    if (!hasRatings) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Novo</Badge>;
    }
    switch (level) {
      case "Premium":
        return <Badge variant="default" className="bg-yellow-500 text-black">1.5x Premium</Badge>;
      case "Experiente":
        return <Badge variant="default" className="bg-blue-500">1.3x Experiente</Badge>;
      case "Regular":
        return <Badge variant="secondary">1.2x Regular</Badge>;
      default:
        return <Badge variant="outline">0.8x Iniciante</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate("/cliente")}
        className="mb-4"
        data-testid="button-back"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Escolha seu Profissional</h1>
        <p className="text-muted-foreground">
          Selecione o profissional que melhor atende às suas necessidades. 
          Profissionais com notas mais altas cobram valores ajustados pela qualidade do serviço.
        </p>
        {latitude !== null && longitude !== null && (
          <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
            <Navigation className="h-4 w-4" />
            Mostrando profissionais em até 30km da sua localização
          </div>
        )}
        {locationError && (
          <div className="mt-2 flex items-center gap-2 text-sm text-amber-600">
            <MapPin className="h-4 w-4" />
            {locationError} - mostrando todos os profissionais disponíveis
          </div>
        )}
      </div>

      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-yellow-50 dark:from-blue-900/20 dark:to-yellow-900/20">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">Como funciona o preço?</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">0-5</Badge>
              <span>0.8x (Iniciante)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">5-8</Badge>
              <span>1.2x (Regular)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500">9</Badge>
              <span>1.3x (Experiente)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-500 text-black">10</Badge>
              <span>1.5x (Premium)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {providers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum profissional disponível</h3>
            <p className="text-muted-foreground">
              No momento não há profissionais disponíveis na sua região.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {providers.map((provider) => {
            const rating = parseFloat(provider.rating || "10");
            const isSelected = selectedProvider === provider.userId;
            
            return (
              <Card 
                key={provider.userId}
                className={`cursor-pointer transition-all ${
                  isSelected 
                    ? "ring-2 ring-primary border-primary" 
                    : "hover:border-muted-foreground/50"
                }`}
                onClick={() => setSelectedProvider(provider.userId)}
                data-testid={`card-provider-${provider.userId}`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {provider.specialties?.charAt(0) || "P"}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getRatingIcon(provider.ratingLevel)}
                          <span className="font-semibold">Profissional #{provider.userId.slice(-4)}</span>
                          {getMultiplierBadge(provider.ratingLevel, (provider.totalRatings || 0) > 0)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <span className={`flex items-center gap-1 ${(provider.totalRatings || 0) > 0 ? getRatingColor(rating) : "text-muted-foreground"}`}>
                            <Star className="h-4 w-4 fill-current" />
                            {(provider.totalRatings || 0) > 0 ? (
                              <>
                                {rating.toFixed(1)}/10
                                <span className="text-muted-foreground">
                                  ({provider.totalRatings} {provider.totalRatings === 1 ? "avaliação" : "avaliações"})
                                </span>
                              </>
                            ) : (
                              <span>Sem avaliações ainda</span>
                            )}
                          </span>
                          
                          {provider.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {provider.city}
                            </span>
                          )}
                          
                          {provider.distance !== null && (
                            <span className="flex items-center gap-1 text-green-600">
                              <Navigation className="h-4 w-4" />
                              {provider.distance.toFixed(1)} km
                            </span>
                          )}
                          
                          {provider.totalServices > 0 && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-4 w-4" />
                              {provider.totalServices} serviços
                            </span>
                          )}
                        </div>
                        
                        {provider.specialties && (
                          <p className="text-sm text-muted-foreground">
                            {provider.specialties}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {formatPrice(provider.adjustedPrice)}
                        </p>
                        {provider.adjustedPrice !== provider.basePrice && (
                          <p className="text-sm text-muted-foreground line-through">
                            Base: {formatPrice(provider.basePrice)}
                          </p>
                        )}
                      </div>
                      
                      {isSelected && (
                        <CheckCircle className="h-6 w-6 text-primary" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {providers.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <div className="container max-w-4xl mx-auto">
            <Button
              className="w-full h-14 text-lg"
              disabled={!selectedProvider || selectMutation.isPending}
              onClick={() => selectedProvider && selectMutation.mutate(selectedProvider)}
              data-testid="button-confirm-provider"
            >
              {selectMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  Selecionando...
                </span>
              ) : selectedProvider ? (
                "Confirmar Profissional"
              ) : (
                "Selecione um Profissional"
              )}
            </Button>
          </div>
        </div>
      )}
      
      {/* Spacer for fixed bottom button */}
      {providers.length > 0 && <div className="h-24" />}
    </div>
  );
}
