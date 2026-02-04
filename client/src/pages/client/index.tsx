import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { LoadingSkeleton, CardSkeleton } from "@/components/loading-skeleton";
import { Link } from "wouter";
import { 
  Plus, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Wrench,
  ChevronRight,
  Sparkles,
  ArrowLeft
} from "lucide-react";
import type { ServiceRequest } from "@shared/schema";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  pending: { label: "Aguardando", variant: "secondary", color: "bg-muted" },
  diagnosed: { label: "Diagnosticado", variant: "default", color: "bg-primary/20" },
  waiting_provider: { label: "Buscando profissional", variant: "outline", color: "bg-accent/20" },
  accepted: { label: "Aceito", variant: "default", color: "bg-primary/20" },
  in_progress: { label: "Em andamento", variant: "default", color: "bg-accent/20" },
  completed: { label: "Concluído", variant: "secondary", color: "bg-green-500/20" },
  cancelled: { label: "Cancelado", variant: "destructive", color: "bg-destructive/20" },
};

function ServiceCard({ service }: { service: ServiceRequest }) {
  const status = statusMap[service.status] || { label: service.status, variant: "secondary" as const, color: "bg-muted" };
  
  return (
    <Card className="group border-2 border-transparent hover:border-primary/20 transition-all duration-300 rounded-2xl overflow-hidden">
      <Link href={`/client/service/${service.id}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant={status.variant} className="rounded-lg">
                  {status.label}
                </Badge>
                {service.slaPriority === "urgent" && (
                  <Badge variant="destructive" className="rounded-lg">Urgente</Badge>
                )}
                {service.slaPriority === "express" && (
                  <Badge className="bg-accent text-accent-foreground rounded-lg">Express</Badge>
                )}
              </div>
              <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors" data-testid={`text-service-title-${service.id}`}>
                {service.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                {service.description}
              </p>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(service.createdAt!).toLocaleDateString("pt-BR")}
                </span>
                {service.estimatedPrice && (
                  <span className="font-semibold text-foreground text-sm">
                    R$ {(service.estimatedPrice / 100).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

export default function ClientDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  
  const { data: services, isLoading: servicesLoading } = useQuery<ServiceRequest[]>({
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
    ["pending", "diagnosed", "waiting_provider", "accepted", "in_progress"].includes(s.status)
  ) || [];
  
  const completedServices = services?.filter(s => 
    ["completed", "cancelled"].includes(s.status)
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-6 py-8 max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mb-4 gap-2" 
          asChild
          data-testid="button-back"
        >
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Olá, {user?.firstName || "Cliente"}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seus serviços e solicitações
            </p>
          </div>
          
          <Button asChild className="gap-2 w-full sm:w-auto rounded-xl px-6 py-5 shadow-lg shadow-primary/20" data-testid="button-new-service">
            <Link href="/client/new">
              <Plus className="h-5 w-5" />
              Novo serviço
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
            <TabsList className="grid w-full grid-cols-2 mb-8 p-1.5 rounded-2xl h-auto">
              <TabsTrigger value="active" className="gap-2 py-3 rounded-xl text-sm" data-testid="tab-active">
                <Wrench className="h-4 w-4" />
                Ativos ({activeServices.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2 py-3 rounded-xl text-sm" data-testid="tab-completed">
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
                <Card className="rounded-2xl">
                  <CardContent className="py-16 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-lg">Nenhum serviço ativo no momento</p>
                    <Button asChild className="mt-6 rounded-xl" data-testid="button-create-first">
                      <Link href="/client/new">Criar primeiro serviço</Link>
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
                <Card className="rounded-2xl">
                  <CardContent className="py-16 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-lg">Nenhum serviço concluído ainda</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="mt-8 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
            <CardHeader className="text-center pt-12 pb-4 relative">
              <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-6 shadow-xl">
                <Sparkles className="h-10 w-10 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Bem-vindo ao Pereirão Express!</CardTitle>
              <CardDescription className="text-base mt-2">
                Descreva seu problema e nossa IA vai ajudar a identificar a solução ideal
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-12 relative">
              <Button asChild size="lg" className="gap-2 rounded-xl px-8 py-6 shadow-lg shadow-primary/20" data-testid="button-start-first">
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
