import { useState, useEffect } from "react";
import { useRoute, Link, useLocation, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { PaymentModal } from "@/components/payment-modal";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Clock, 
  MapPin, 
  Wrench, 
  User, 
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  MessageSquare,
  Star,
  FileText,
  CreditCard,
  Shield,
  Camera,
  CheckSquare,
  Loader2
} from "lucide-react";
import type { ServiceRequest } from "@shared/schema";

interface ServiceDetails {
  service: ServiceRequest;
  aiDiagnosis: {
    id: number;
    classification: string;
    urgencyLevel: string;
    estimatedDuration: string;
    materialsSuggested: string;
    priceRangeMin: number;
    priceRangeMax: number;
    diagnosisFee: number;
    aiResponse: string;
    createdAt: string;
  } | null;
  providerDiagnosis: {
    id: number;
    findings: string;
    laborCost: number;
    materialsCost: number;
    materialsList: string;
    estimatedDuration: string;
    notes: string;
    createdAt: string;
  } | null;
  acceptance: {
    id: number;
    totalPrice: number;
    laborCost: number;
    materialsCost: number;
    platformFee: number;
    acceptedAt: string;
  } | null;
  executionLog: {
    id: number;
    startedAt: string;
    completedAt: string | null;
    beforePhotos: string;
    afterPhotos: string;
    durationMinutes: number;
    notes: string;
  } | null;
  escrow: {
    id: number;
    holdAmount: number;
    status: string;
    releasedAt: string | null;
  } | null;
  provider: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    rating: string;
    totalRatings: number;
    specialties: string;
  } | null;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending: { label: "Aguardando", variant: "secondary", icon: Clock },
  ai_diagnosed: { label: "Diagnóstico IA", variant: "default", icon: FileText },
  fee_paid: { label: "Taxa paga", variant: "default", icon: CheckCircle2 },
  provider_assigned: { label: "Profissional atribuído", variant: "default", icon: User },
  provider_diagnosed: { label: "Orçamento recebido", variant: "default", icon: Wrench },
  quote_sent: { label: "Orçamento enviado", variant: "default", icon: FileText },
  accepted: { label: "Aceito", variant: "default", icon: CheckCircle2 },
  in_progress: { label: "Em andamento", variant: "default", icon: Wrench },
  awaiting_confirmation: { label: "Aguardando confirmação", variant: "outline", icon: CheckSquare },
  completed: { label: "Concluído", variant: "secondary", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", variant: "destructive", icon: XCircle },
};

const slaPriorityMap: Record<string, { label: string; color: string }> = {
  standard: { label: "Standard", color: "bg-muted" },
  express: { label: "Express", color: "bg-accent text-accent-foreground" },
  urgent: { label: "Urgente", color: "bg-destructive text-destructive-foreground" },
};

export default function ServiceDetails() {
  const [, params] = useRoute("/client/service/:id");
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const searchString = useSearch();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [includeMaterials, setIncludeMaterials] = useState(true);

  const { data: serviceDetails, isLoading } = useQuery<ServiceDetails>({
    queryKey: [`/api/service/${params?.id}/full`],
    enabled: !!params?.id && isAuthenticated,
  });

  useEffect(() => {
    if (searchString.includes("action=pay") && serviceDetails?.providerDiagnosis && !serviceDetails?.acceptance) {
      setAcceptTerms(true);
      setShowPaymentModal(true);
    }
  }, [searchString, serviceDetails]);

  const { data: pricingSettings } = useQuery<{ diagnosisPrice: number; serviceFee: number }>({
    queryKey: ["/api/settings/pricing"],
  });
  const platformFeeRate = (pricingSettings?.serviceFee || 10) / 100;

  const acceptQuoteMutation = useMutation({
    mutationFn: async (data: { method: string }) => {
      const response = await apiRequest("POST", `/api/service/${params?.id}/accept`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/service/${params?.id}/full`] });
      toast({
        title: "Orçamento aceito!",
        description: "Pagamento processado. O profissional iniciará o serviço em breve.",
      });
      setShowPaymentModal(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível processar. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const confirmServiceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/service/${params?.id}/confirm`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/service/${params?.id}/full`] });
      toast({
        title: "Serviço confirmado!",
        description: "O pagamento será liberado ao profissional.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível confirmar. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/service/${params?.id}/status`, { status: "cancelled" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/service/${params?.id}/full`] });
      toast({
        title: "Serviço cancelado",
        description: "O serviço foi cancelado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o serviço.",
        variant: "destructive",
      });
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingSkeleton />
      </div>
    );
  }

  if (!serviceDetails?.service) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container px-6 py-16 text-center">
          <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Serviço não encontrado</h1>
          <p className="text-muted-foreground mb-6">O serviço que você está procurando não existe.</p>
          <Button asChild className="rounded-xl">
            <Link href="/client">Voltar aos serviços</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { service, aiDiagnosis, providerDiagnosis, acceptance, executionLog, escrow, provider } = serviceDetails;
  const status = statusMap[service.status] || { label: service.status, variant: "secondary" as const, icon: Clock };
  const slaPriority = slaPriorityMap[service.slaPriority || "standard"];
  const StatusIcon = status.icon;

  const canCancel = ["pending", "ai_diagnosed", "fee_paid"].includes(service.status);
  const canAcceptQuote = (service.status === "quote_sent" || service.status === "provider_diagnosed") && !acceptance;
  const canConfirmService = service.status === "awaiting_confirmation";

  const handleAcceptQuote = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = (method: string) => {
    acceptQuoteMutation.mutate({ method });
  };

  const handleConfirmService = () => {
    confirmServiceMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-6 py-8 max-w-3xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" asChild className="gap-2 rounded-xl -ml-2" data-testid="button-back">
            <Link href="/client">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-6">
            <Card className="rounded-2xl overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-primary to-accent" />
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={status.variant} className="gap-1.5 rounded-lg">
                        <StatusIcon className="h-3.5 w-3.5" />
                        {status.label}
                      </Badge>
                      <Badge className={`rounded-lg ${slaPriority.color}`}>
                        {slaPriority.label}
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl" data-testid="text-service-title">
                      {service.title}
                    </CardTitle>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {aiDiagnosis?.priceRangeMin && aiDiagnosis?.priceRangeMax ? "Faixa estimada" : "Valor estimado"}
                    </p>
                    <p className="text-2xl font-bold text-primary" data-testid="text-service-price">
                      {aiDiagnosis?.priceRangeMin && aiDiagnosis?.priceRangeMax ? (
                        <>R$ {(aiDiagnosis.priceRangeMin / 100).toFixed(0)} - R$ {(aiDiagnosis.priceRangeMax / 100).toFixed(0)}</>
                      ) : (
                        <>R$ {((service.finalPrice || service.estimatedPrice || 0) / 100).toFixed(2)}</>
                      )}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Descrição do problema</h3>
                  <p className="text-muted-foreground leading-relaxed" data-testid="text-service-description">
                    {service.description}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Criado em</p>
                      <p className="font-medium">
                        {new Date(service.createdAt!).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  {service.address && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Endereço</p>
                        <p className="font-medium" data-testid="text-service-address">{service.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {aiDiagnosis && (
              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Diagnóstico IA</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Classificação</p>
                      <p className="font-medium text-sm">{aiDiagnosis.classification}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Urgência</p>
                      <Badge variant="outline" className="mt-1">{aiDiagnosis.urgencyLevel}</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Análise</p>
                    <p className="text-sm">{aiDiagnosis.aiResponse}</p>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Faixa estimada:</span>
                    <span className="font-medium">
                      R$ {(aiDiagnosis.priceRangeMin / 100).toFixed(0)} - R$ {(aiDiagnosis.priceRangeMax / 100).toFixed(0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {providerDiagnosis && (
              <Card className={`rounded-2xl ${canAcceptQuote ? "border-primary" : ""}`}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Orçamento do Profissional</CardTitle>
                  </div>
                  <CardDescription>Diagnóstico presencial realizado</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Parecer técnico</p>
                    <p className="text-sm">{providerDiagnosis.findings}</p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mão de obra:</span>
                      <span>R$ {(providerDiagnosis.laborCost / 100).toFixed(2)}</span>
                    </div>
                    
                    {providerDiagnosis.materialsCost > 0 && canAcceptQuote && (
                      <div className="bg-accent/10 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="include-materials"
                              checked={includeMaterials}
                              onChange={(e) => setIncludeMaterials(e.target.checked)}
                              className="rounded"
                              data-testid="checkbox-include-materials"
                            />
                            <label htmlFor="include-materials" className="text-sm font-medium">
                              Incluir materiais (opcional)
                            </label>
                          </div>
                          <span className={`text-sm ${includeMaterials ? "" : "line-through text-muted-foreground"}`}>
                            R$ {(providerDiagnosis.materialsCost / 100).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          O prestador traz os materiais. Você também pode comprar por conta própria.
                        </p>
                      </div>
                    )}
                    
                    {providerDiagnosis.materialsCost > 0 && !canAcceptQuote && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Materiais:</span>
                        <span>R$ {(providerDiagnosis.materialsCost / 100).toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxa da plataforma ({Math.round(platformFeeRate * 100)}%):</span>
                      <span>R$ {(((providerDiagnosis.laborCost + (includeMaterials ? providerDiagnosis.materialsCost : 0)) * platformFeeRate) / 100).toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span className="text-primary">
                        R$ {(((providerDiagnosis.laborCost + (includeMaterials ? providerDiagnosis.materialsCost : 0)) * (1 + platformFeeRate)) / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Tempo estimado</p>
                    <p className="font-medium">{providerDiagnosis.estimatedDuration}</p>
                  </div>

                  {providerDiagnosis.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Observações</p>
                      <p className="text-sm">{providerDiagnosis.notes}</p>
                    </div>
                  )}
                </CardContent>

                {canAcceptQuote && (
                  <CardFooter className="flex-col gap-3">
                    <div className="flex items-start gap-2 w-full">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="mt-1"
                        data-testid="checkbox-accept-terms"
                      />
                      <label htmlFor="terms" className="text-xs text-muted-foreground">
                        Li e aceito os termos de serviço. O valor será retido até a conclusão e confirmação do serviço.
                      </label>
                    </div>
                    <Button 
                      className="w-full rounded-xl" 
                      size="lg"
                      disabled={!acceptTerms || acceptQuoteMutation.isPending}
                      onClick={handleAcceptQuote}
                      data-testid="button-accept-quote"
                    >
                      {acceptQuoteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Aceitar e pagar
                    </Button>
                  </CardFooter>
                )}
              </Card>
            )}

            {provider && (
              <Card className="rounded-2xl border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Seu Profissional</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-bold">
                      {provider.firstName?.[0]}{provider.lastName?.[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{provider.firstName} {provider.lastName}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span>{provider.rating}</span>
                        <span>({provider.totalRatings} avaliações)</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{provider.specialties}</p>
                    </div>
                  </div>
                  
                  {(service.status === "accepted" || service.status === "in_progress" || service.status === "provider_assigned" || acceptance) && provider.phone && (
                    <Button 
                      className="w-full rounded-xl bg-green-600 hover:bg-green-700" 
                      size="lg"
                      onClick={() => {
                        const phone = provider.phone.replace(/\D/g, '');
                        const message = encodeURIComponent(`Olá ${provider.firstName}! Sou cliente do Pereirão Express sobre o serviço: ${service.title}`);
                        window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
                      }}
                      data-testid="button-whatsapp-provider"
                    >
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Falar no WhatsApp
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {acceptance && (
              <Card className="rounded-2xl bg-primary/5 border-primary/30">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Aceite Digital</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total pago:</span>
                    <span className="font-semibold">R$ {(acceptance.totalPrice / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aceito em:</span>
                    <span>{new Date(acceptance.acceptedAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {executionLog && (
              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Execução do Serviço</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Iniciado em</p>
                      <p className="text-sm font-medium">
                        {new Date(executionLog.startedAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    {executionLog.completedAt && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Finalizado em</p>
                        <p className="text-sm font-medium">
                          {new Date(executionLog.completedAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    )}
                  </div>

                  {executionLog.durationMinutes > 0 && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Duração</p>
                      <p className="font-medium">{executionLog.durationMinutes} minutos</p>
                    </div>
                  )}

                  {executionLog.beforePhotos && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Camera className="h-3 w-3" /> Fotos antes
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {JSON.parse(executionLog.beforePhotos).map((url: string, i: number) => (
                          <img key={i} src={url} alt={`Antes ${i+1}`} className="h-20 w-20 object-cover rounded-lg" />
                        ))}
                      </div>
                    </div>
                  )}

                  {executionLog.afterPhotos && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Camera className="h-3 w-3" /> Fotos depois
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {JSON.parse(executionLog.afterPhotos).map((url: string, i: number) => (
                          <img key={i} src={url} alt={`Depois ${i+1}`} className="h-20 w-20 object-cover rounded-lg" />
                        ))}
                      </div>
                    </div>
                  )}

                  {executionLog.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Notas do profissional</p>
                      <p className="text-sm">{executionLog.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {canConfirmService && (
              <Card className="rounded-2xl border-primary">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Confirmar Conclusão</CardTitle>
                  </div>
                  <CardDescription>
                    O profissional finalizou o serviço. Confirme para liberar o pagamento.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button 
                    className="w-full rounded-xl" 
                    size="lg"
                    onClick={handleConfirmService}
                    disabled={confirmServiceMutation.isPending}
                    data-testid="button-confirm-service"
                  >
                    {confirmServiceMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Confirmar e liberar pagamento
                  </Button>
                </CardFooter>
              </Card>
            )}

            {escrow && (
              <Card className="rounded-2xl bg-muted/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg text-muted-foreground">Pagamento Protegido</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Valor retido:</span>
                    <span>R$ {(escrow.holdAmount / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant="outline">
                      {escrow.status === "holding" ? "Retido" : 
                       escrow.status === "released" ? "Liberado" : escrow.status}
                    </Badge>
                  </div>
                  {escrow.releasedAt && (
                    <div className="flex justify-between">
                      <span>Liberado em:</span>
                      <span>{new Date(escrow.releasedAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {service.providerId && (
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Profissional responsável</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold text-xl">
                        P
                      </div>
                      <div>
                        <p className="font-semibold">Profissional Pereirão</p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star className="h-4 w-4 text-accent fill-accent" />
                          4.8 • 127 serviços
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" className="rounded-xl" data-testid="button-call-provider">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="rounded-xl" data-testid="button-message-provider">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {service.status === "completed" && (
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Avalie o serviço</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        className="h-10 w-10 rounded-xl hover:bg-accent/20 flex items-center justify-center transition-colors"
                        data-testid={`button-star-${star}`}
                      >
                        <Star className="h-6 w-6 text-accent" />
                      </button>
                    ))}
                  </div>
                  <Button className="rounded-xl w-full" data-testid="button-submit-review">
                    Enviar avaliação
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              {canCancel && (
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-xl text-destructive hover:text-destructive"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  data-testid="button-cancel-service"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar serviço
                </Button>
              )}
              <Button asChild className="flex-1 rounded-xl" data-testid="button-support">
                <Link href="/client">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Suporte
                </Link>
              </Button>
            </div>
          </div>
        </ScrollArea>
      </main>

      {providerDiagnosis && (
        <PaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          amount={Math.round((providerDiagnosis.laborCost + (includeMaterials ? providerDiagnosis.materialsCost : 0)) * (1 + platformFeeRate))}
          description={`Serviço: ${service.title}${includeMaterials && providerDiagnosis.materialsCost > 0 ? " (com materiais)" : ""}`}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </div>
  );
}
