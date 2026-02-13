import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LoadingSkeleton, CardSkeleton } from "@/components/loading-skeleton";
import { Link, useLocation } from "wouter";
import { 
  Plus, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Wrench,
  ChevronRight,
  Sparkles,
  ThumbsUp,
  FileText
} from "lucide-react";
import type { ServiceRequest } from "@shared/schema";

type EnrichedServiceRequest = ServiceRequest & {
  priceRangeMin?: number | null;
  priceRangeMax?: number | null;
};

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  pending: { label: "Aguardando", variant: "secondary", color: "bg-muted" },
  ai_diagnosed: { label: "Diagnóstico IA", variant: "default", color: "bg-primary/20" },
  fee_paid: { label: "Taxa paga", variant: "default", color: "bg-primary/20" },
  diagnosed: { label: "Diagnosticado", variant: "default", color: "bg-primary/20" },
  selecting_provider: { label: "Selecionando profissional", variant: "outline", color: "bg-accent/20" },
  waiting_provider: { label: "Buscando profissional", variant: "outline", color: "bg-accent/20" },
  provider_assigned: { label: "Profissional atribuído", variant: "default", color: "bg-primary/20" },
  provider_diagnosed: { label: "Orçamento recebido", variant: "default", color: "bg-accent/20" },
  quote_sent: { label: "Orçamento recebido", variant: "default", color: "bg-accent/20" },
  accepted: { label: "Aceito - Aguardando execução", variant: "default", color: "bg-primary/20" },
  in_progress: { label: "Em andamento", variant: "default", color: "bg-accent/20" },
  awaiting_confirmation: { label: "Aguardando confirmação", variant: "outline", color: "bg-amber-500/20" },
  completed: { label: "Concluído", variant: "secondary", color: "bg-green-500/20" },
  cancelled: { label: "Cancelado", variant: "destructive", color: "bg-destructive/20" },
};

function ServiceCard({ service }: { service: EnrichedServiceRequest }) {
  const status = statusMap[service.status] || { label: service.status, variant: "secondary" as const, color: "bg-muted" };
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const confirmMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/service/${service.id}/confirm`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service"] });
      toast({
        title: "Serviço confirmado!",
        description: "O pagamento foi liberado ao profissional.",
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

  const hasPriceRange = service.priceRangeMin && service.priceRangeMax;
  const needsConfirmation = service.status === "awaiting_confirmation";
  const hasQuote = service.status === "quote_sent" || service.status === "provider_diagnosed";
  
  return (
    <Card className={`hover-elevate rounded-md ${needsConfirmation ? "border-amber-500/40 border-2" : hasQuote ? "border-primary/30 border-2" : ""}`}>
      <CardContent className="p-5">
        <Link href={`/client/service/${service.id}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Badge variant={status.variant}>
                  {status.label}
                </Badge>
                {service.slaPriority === "urgent" && (
                  <Badge variant="destructive">Urgente</Badge>
                )}
                {service.slaPriority === "express" && (
                  <Badge className="bg-accent text-accent-foreground">Express</Badge>
                )}
              </div>
              <h3 className="font-semibold text-lg truncate" data-testid={`text-service-title-${service.id}`}>
                {service.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                {service.description}
              </p>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(service.createdAt!).toLocaleDateString("pt-BR")}
                </span>
                {hasPriceRange ? (
                  <span className="font-semibold text-foreground text-sm">
                    R$ {(service.priceRangeMin! / 100).toFixed(0)} - R$ {(service.priceRangeMax! / 100).toFixed(0)}
                  </span>
                ) : service.estimatedPrice ? (
                  <span className="font-semibold text-foreground text-sm">
                    R$ {(service.estimatedPrice / 100).toFixed(2)}
                  </span>
                ) : null}
              </div>
            </div>
            {!needsConfirmation && !hasQuote && (
              <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>
        </Link>

        {needsConfirmation && (
          <div className="mt-4 p-4 bg-amber-500/10 rounded-md border border-amber-500/20">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              O profissional finalizou o serviço. O pagamento será liberado após sua confirmação.
            </p>
            <div className="flex items-center gap-2">
              <Button
                className="flex-1 gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  confirmMutation.mutate();
                }}
                disabled={confirmMutation.isPending}
                data-testid={`button-confirm-service-${service.id}`}
              >
                <ThumbsUp className="h-4 w-4" />
                {confirmMutation.isPending ? "Confirmando..." : "Confirmar execução"}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/client/service/${service.id}`);
                }}
                data-testid={`button-view-details-${service.id}`}
              >
                <FileText className="h-4 w-4" />
                Detalhes
              </Button>
            </div>
          </div>
        )}

        {hasQuote && (
          <div className="mt-4 p-4 bg-primary/10 rounded-md border border-primary/20">
            <p className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Orçamento recebido! Veja os detalhes e aprove para iniciar o serviço.
            </p>
            <Button
              className="w-full gap-2"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/client/service/${service.id}`);
              }}
              data-testid={`button-view-quote-${service.id}`}
            >
              <FileText className="h-4 w-4" />
              Ver orçamento e aprovar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClientDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  
  const { data: services, isLoading: servicesLoading } = useQuery<EnrichedServiceRequest[]>({
    queryKey: ["/api/service"],
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingSkeleton />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const activeServices = services?.filter(s => 
    !["completed", "cancelled"].includes(s.status)
  ) || [];
  
  const completedServices = services?.filter(s => 
    ["completed", "cancelled"].includes(s.status)
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-6 py-8 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Olá, {user?.firstName || "Cliente"}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seus serviços e solicitações
            </p>
          </div>
          
          <Button asChild size="lg" className="gap-2 w-full sm:w-auto" data-testid="button-new-service">
            <Link href="/client/new">
              <Plus className="h-5 w-5" />
              Pedir serviço
            </Link>
          </Button>
        </div>

        {servicesLoading ? (
          <div className="space-y-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : services && services.length > 0 ? (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="active" className="gap-2" data-testid="tab-active">
                <Wrench className="h-4 w-4" />
                Ativos ({activeServices.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2" data-testid="tab-completed">
                <CheckCircle2 className="h-4 w-4" />
                Histórico ({completedServices.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="space-y-4">
              {activeServices.length > 0 ? (
                activeServices.map(service => (
                  <ServiceCard key={service.id} service={service} />
                ))
              ) : (
                <Card className="rounded-md">
                  <CardContent className="py-16 text-center">
                    <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-lg">Nenhum serviço ativo no momento</p>
                    <Button asChild className="mt-6" data-testid="button-create-first">
                      <Link href="/client/new">Pedir primeiro serviço</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="completed" className="space-y-4">
              {completedServices.length > 0 ? (
                completedServices.map(service => (
                  <ServiceCard key={service.id} service={service} />
                ))
              ) : (
                <Card className="rounded-md">
                  <CardContent className="py-16 text-center">
                    <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-lg">Nenhum serviço concluído ainda</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="mt-8 rounded-md">
            <CardHeader className="text-center pt-12 pb-4">
              <div className="mx-auto h-20 w-20 rounded-md bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-6">
                <Sparkles className="h-10 w-10 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Bem-vindo ao Pereirão Express!</CardTitle>
              <CardDescription className="text-base mt-2">
                Descreva seu problema e nossa IA vai ajudar a identificar a solução ideal
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-12">
              <Button asChild size="lg" className="gap-2" data-testid="button-start-first">
                <Link href="/client/new">
                  <MessageSquare className="h-5 w-5" />
                  Descrever meu problema
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
