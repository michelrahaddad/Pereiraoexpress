import { useState, useEffect } from "react";
import { useLocation, useRoute, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, MapPin, Briefcase, CheckCircle, ArrowLeft, Crown, Award, User, Navigation, Medal } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import { PaymentModal } from "@/components/payment-modal";

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
  priceMin: number;
  priceMax: number;
  ratingLevel: string;
  basePrice: number;
  distance: number | null;
  firstName: string | null;
  lastName: string | null;
}

export default function SelectProvider() {
  const [, params] = useRoute("/cliente/selecionar-profissional/:serviceId");
  const serviceId = params?.serviceId;
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const isDomestic = new URLSearchParams(searchString).get("domestic") === "true";
  const { toast } = useToast();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const { latitude, longitude, loading: locationLoading, error: locationError } = useGeolocation();

  const { data: service } = useQuery<any>({
    queryKey: ["/api/services", serviceId],
    enabled: !!serviceId,
  });

  const { data: serviceData } = useQuery<any>({
    queryKey: ["/api/service", serviceId, "full"],
    queryFn: async () => {
      const res = await fetch(`/api/service/${serviceId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!serviceId && isDomestic,
  });

  const { data: providers = [], isLoading, refetch } = useQuery<Provider[]>({
    queryKey: ["/api/providers/available", { serviceId, lat: latitude, lon: longitude }],
    queryFn: async () => {
      let url = `/api/providers/available?serviceId=${serviceId}`;
      if (latitude !== null && longitude !== null) {
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
    enabled: !!serviceId,
  });
  
  useEffect(() => {
    if (latitude !== null && longitude !== null && !locationLoading && serviceId) {
      refetch();
    }
  }, [latitude, longitude, locationLoading, serviceId, refetch]);

  const selectMutation = useMutation({
    mutationFn: async (providerId: string) => {
      return apiRequest("POST", `/api/services/${serviceId}/select-provider`, { providerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Profissional selecionado!",
        description: "O profissional foi notificado e fará o orçamento presencial.",
      });
      navigate("/client");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível selecionar o profissional.",
        variant: "destructive",
      });
    },
  });

  const payDomesticMutation = useMutation({
    mutationFn: async (data: { providerId: string; method: string; totalAmount: number }) => {
      await apiRequest("POST", `/api/services/${serviceId}/select-provider`, { providerId: data.providerId });
      const response = await apiRequest("POST", `/api/service/${serviceId}/pay-domestic`, {
        method: data.method,
        totalAmount: data.totalAmount,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Pagamento confirmado!",
        description: "A profissional foi notificada e realizará o serviço.",
      });
      setShowPaymentModal(false);
      navigate("/client");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível processar o pagamento.",
        variant: "destructive",
      });
    },
  });

  const handleConfirmProvider = () => {
    if (!selectedProvider) return;
    if (isDomestic) {
      setShowPaymentModal(true);
    } else {
      selectMutation.mutate(selectedProvider);
    }
  };

  const handleDomesticPayment = (method: string) => {
    if (!selectedProvider || !serviceData?.aiDiagnosis) return;
    const totalAmount = Math.round(serviceData.aiDiagnosis.priceRangeMin * 1.10);
    payDomesticMutation.mutate({
      providerId: selectedProvider,
      method: method || "pix",
      totalAmount,
    });
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const getRankIcon = (position: number) => {
    if (position === 1) return <Medal className="h-5 w-5 text-yellow-500" />;
    if (position === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (position === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return null;
  };

  const getRatingBadge = (level: string, hasRatings: boolean) => {
    if (!hasRatings) {
      return <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">Novo</Badge>;
    }
    switch (level) {
      case "Premium":
        return <Badge className="text-xs bg-yellow-500 text-black"><Crown className="h-3 w-3 mr-1" />Premium</Badge>;
      case "Experiente":
        return <Badge className="text-xs bg-blue-500"><Award className="h-3 w-3 mr-1" />Experiente</Badge>;
      case "Regular":
        return <Badge variant="secondary" className="text-xs">Regular</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Iniciante</Badge>;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 pb-28">
      <div className="px-4 py-4 max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/client")}
          className="mb-3 -ml-2"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold mb-2">Escolha seu Profissional</h1>
          <p className="text-sm text-muted-foreground">
            Profissionais ordenados por ranking. Notas mais altas = maior qualidade.
          </p>
          {latitude !== null && longitude !== null && (
            <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
              <Navigation className="h-3 w-3" />
              Mostrando profissionais em até 30km
            </div>
          )}
          {locationError && (
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-600">
              <MapPin className="h-3 w-3" />
              {locationError}
            </div>
          )}
        </div>

        {providers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum profissional disponível</h3>
              <p className="text-muted-foreground text-sm">
                No momento não há profissionais disponíveis na sua região.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {providers.map((provider, index) => {
              const rating = parseFloat(provider.rating || "10");
              const isSelected = selectedProvider === provider.userId;
              const position = index + 1;
              const providerName = provider.firstName && provider.lastName 
                ? `${provider.firstName} ${provider.lastName}`
                : `Profissional #${provider.userId.slice(-4)}`;
              const initials = provider.firstName 
                ? provider.firstName.charAt(0).toUpperCase()
                : "P";
              
              return (
                <Card 
                  key={provider.userId}
                  className={`cursor-pointer transition-all ${
                    isSelected 
                      ? "ring-2 ring-primary border-primary shadow-lg" 
                      : "hover:shadow-md"
                  }`}
                  onClick={() => setSelectedProvider(provider.userId)}
                  data-testid={`card-provider-${provider.userId}`}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">
                          {getRankIcon(position) || `#${position}`}
                        </div>
                        <Avatar className="h-12 w-12 sm:h-14 sm:w-14">
                          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="font-semibold text-sm sm:text-base truncate">
                            {providerName}
                          </span>
                          {getRatingBadge(provider.ratingLevel, (provider.totalRatings || 0) > 0)}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {(provider.totalRatings || 0) > 0 ? (
                              <span className="font-medium">{rating.toFixed(1)}/10 ({provider.totalRatings})</span>
                            ) : (
                              <span>Novo</span>
                            )}
                          </span>
                          
                          {provider.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {provider.city}
                            </span>
                          )}
                          
                          {provider.distance !== null && (
                            <span className="flex items-center gap-1 text-green-600">
                              <Navigation className="h-3 w-3" />
                              {provider.distance.toFixed(1)}km
                            </span>
                          )}
                          
                          {provider.totalServices > 0 && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {provider.totalServices} serviços
                            </span>
                          )}
                        </div>
                        
                        {provider.specialties && (
                          <p className="text-xs text-muted-foreground truncate">
                            {provider.specialties}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end justify-between shrink-0">
                        <div className="text-right">
                          <p className="text-base sm:text-lg font-bold text-primary">
                            {formatPrice(provider.priceMin || provider.adjustedPrice)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            a {formatPrice(provider.priceMax || (provider.adjustedPrice + 10000))}
                          </p>
                        </div>
                        
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-primary mt-2" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {providers.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t shadow-lg">
          <div className="max-w-2xl mx-auto">
            <Button
              className="w-full h-12 text-base font-semibold rounded-xl"
              disabled={!selectedProvider || selectMutation.isPending || payDomesticMutation.isPending}
              onClick={handleConfirmProvider}
              data-testid="button-confirm-provider"
            >
              {(selectMutation.isPending || payDomesticMutation.isPending) ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  {isDomestic ? "Processando..." : "Selecionando..."}
                </span>
              ) : selectedProvider ? (
                isDomestic ? "Selecionar e Pagar" : "Confirmar Profissional"
              ) : (
                "Selecione um Profissional"
              )}
            </Button>
          </div>
        </div>
      )}

      {isDomestic && serviceData?.aiDiagnosis && (
        <PaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          amount={Math.round(serviceData.aiDiagnosis.priceRangeMin * 1.10)}
          description={`Serviço: ${serviceData.service?.title || "Serviço doméstico"}`}
          onPaymentComplete={handleDomesticPayment}
        />
      )}
    </div>
  );
}
