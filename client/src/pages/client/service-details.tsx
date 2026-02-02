import { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { LoadingSkeleton } from "@/components/loading-skeleton";
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
  Star
} from "lucide-react";
import type { ServiceRequest } from "@shared/schema";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending: { label: "Aguardando", variant: "secondary", icon: Clock },
  diagnosed: { label: "Diagnosticado", variant: "default", icon: CheckCircle2 },
  waiting_provider: { label: "Buscando profissional", variant: "outline", icon: User },
  accepted: { label: "Aceito", variant: "default", icon: CheckCircle2 },
  in_progress: { label: "Em andamento", variant: "default", icon: Wrench },
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
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: service, isLoading } = useQuery<ServiceRequest>({
    queryKey: ["/api/services", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/services/${params?.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch service");
      return res.json();
    },
    enabled: !!params?.id && isAuthenticated,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/services/${params?.id}/status`, { status: "cancelled" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
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

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [authLoading, isAuthenticated]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingSkeleton />
      </div>
    );
  }

  if (!service) {
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

  const status = statusMap[service.status] || { label: service.status, variant: "secondary" as const, icon: Clock };
  const slaPriority = slaPriorityMap[service.slaPriority || "standard"];
  const StatusIcon = status.icon;

  const canCancel = ["pending", "diagnosed", "waiting_provider"].includes(service.status);

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
                  <p className="text-sm text-muted-foreground">Valor estimado</p>
                  <p className="text-2xl font-bold text-primary" data-testid="text-service-price">
                    R$ {((service.finalPrice || service.estimatedPrice || 0) / 100).toFixed(2)}
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

              {service.diagnosis && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Diagnóstico da IA
                  </h3>
                  <p className="text-muted-foreground leading-relaxed" data-testid="text-service-diagnosis">
                    {service.diagnosis}
                  </p>
                </div>
              )}

              {service.materials && (
                <div>
                  <h3 className="font-semibold mb-2">Materiais necessários</h3>
                  <p className="text-muted-foreground" data-testid="text-service-materials">
                    {service.materials}
                  </p>
                </div>
              )}

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
                        hour: "2-digit",
                        minute: "2-digit",
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
      </main>
    </div>
  );
}
