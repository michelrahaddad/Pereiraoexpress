import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { LoadingSkeleton, CardSkeleton } from "@/components/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Wrench, 
  Clock, 
  CheckCircle2, 
  MapPin,
  DollarSign,
  Star,
  TrendingUp,
  AlertCircle,
  Loader2
} from "lucide-react";
import type { ServiceRequest } from "@shared/schema";

const slaLabels = {
  standard: { label: "Standard", color: "secondary" as const },
  express: { label: "Express", color: "default" as const },
  urgent: { label: "Urgente", color: "destructive" as const },
};

function AvailableServiceCard({ service, onAccept }: { service: ServiceRequest; onAccept: () => void }) {
  const sla = slaLabels[service.slaPriority as keyof typeof slaLabels] || slaLabels.standard;
  
  return (
    <Card className="hover-elevate">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={sla.color}>{sla.label}</Badge>
            </div>
            <h3 className="font-medium" data-testid={`text-service-title-${service.id}`}>
              {service.title}
            </h3>
          </div>
          <p className="text-lg font-bold text-primary whitespace-nowrap">
            R$ {((service.estimatedPrice || 0) / 100).toFixed(2)}
          </p>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {service.diagnosis || service.description}
        </p>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(service.createdAt!).toLocaleDateString("pt-BR")}
          </span>
          {service.address && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {service.address}
            </span>
          )}
        </div>
        
        <Button 
          className="w-full" 
          onClick={onAccept}
          data-testid={`button-accept-${service.id}`}
        >
          Aceitar serviço
        </Button>
      </CardContent>
    </Card>
  );
}

function MyServiceCard({ service, onUpdateStatus }: { 
  service: ServiceRequest; 
  onUpdateStatus: (status: string) => void;
}) {
  const getNextStatus = () => {
    if (service.status === "accepted") return "in_progress";
    if (service.status === "in_progress") return "completed";
    return null;
  };

  const getNextStatusLabel = () => {
    const next = getNextStatus();
    if (next === "in_progress") return "Iniciar serviço";
    if (next === "completed") return "Marcar como concluído";
    return null;
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <Badge variant={service.status === "in_progress" ? "default" : "secondary"} className="mb-1">
              {service.status === "accepted" ? "Aceito" : 
               service.status === "in_progress" ? "Em andamento" : 
               service.status === "completed" ? "Concluído" : service.status}
            </Badge>
            <h3 className="font-medium">{service.title}</h3>
          </div>
          <p className="text-lg font-bold text-primary whitespace-nowrap">
            R$ {((service.estimatedPrice || 0) / 100).toFixed(2)}
          </p>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {service.diagnosis || service.description}
        </p>
        
        {getNextStatus() && (
          <Button 
            className="w-full" 
            onClick={() => onUpdateStatus(getNextStatus()!)}
            data-testid={`button-update-${service.id}`}
          >
            {getNextStatusLabel()}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProviderDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAvailable, setIsAvailable] = useState(true);
  
  const { data: availableServices, isLoading: availableLoading } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/provider/available"],
    enabled: isAuthenticated,
  });
  
  const { data: myServices, isLoading: myServicesLoading } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/provider/my-services"],
    enabled: isAuthenticated,
  });

  const { data: earnings } = useQuery<{ total: number; thisMonth: number; completed: number }>({
    queryKey: ["/api/provider/earnings"],
    enabled: isAuthenticated,
  });

  const acceptMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      return apiRequest("POST", `/api/provider/accept/${serviceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/provider/my-services"] });
      toast({
        title: "Serviço aceito!",
        description: "O cliente foi notificado. Bom trabalho!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível aceitar o serviço.",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/services/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider/my-services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/provider/earnings"] });
      toast({
        title: "Status atualizado!",
        description: "O cliente foi notificado sobre a atualização.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [authLoading, isAuthenticated]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingSkeleton />
      </div>
    );
  }

  const activeServices = myServices?.filter(s => 
    ["accepted", "in_progress"].includes(s.status)
  ) || [];
  
  const completedServices = myServices?.filter(s => s.status === "completed") || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              Área do Prestador
            </h1>
            <p className="text-muted-foreground">
              {user?.firstName ? `Olá, ${user.firstName}!` : "Gerencie seus serviços"}
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-card rounded-lg px-4 py-2 border">
            <span className="text-sm">Disponível</span>
            <Switch
              checked={isAvailable}
              onCheckedChange={setIsAvailable}
              data-testid="switch-available"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Este mês</p>
                  <p className="text-xl font-bold">
                    R$ {((earnings?.thisMonth || 0) / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Serviços</p>
                  <p className="text-xl font-bold">{earnings?.completed || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Star className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avaliação</p>
                  <p className="text-xl font-bold">4.8</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="available" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="available" className="gap-2" data-testid="tab-available">
              <AlertCircle className="h-4 w-4" />
              Disponíveis ({availableServices?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-2" data-testid="tab-active">
              <Wrench className="h-4 w-4" />
              Ativos ({activeServices.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2" data-testid="tab-history">
              <CheckCircle2 className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="available" className="space-y-4">
            {availableLoading ? (
              <>
                <CardSkeleton />
                <CardSkeleton />
              </>
            ) : availableServices && availableServices.length > 0 ? (
              availableServices.map(service => (
                <AvailableServiceCard 
                  key={service.id} 
                  service={service} 
                  onAccept={() => acceptMutation.mutate(service.id)}
                />
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum serviço disponível no momento</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Novos serviços aparecerão aqui automaticamente
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="active" className="space-y-4">
            {myServicesLoading ? (
              <>
                <CardSkeleton />
                <CardSkeleton />
              </>
            ) : activeServices.length > 0 ? (
              activeServices.map(service => (
                <MyServiceCard 
                  key={service.id} 
                  service={service} 
                  onUpdateStatus={(status) => updateStatusMutation.mutate({ id: service.id, status })}
                />
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum serviço ativo</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Aceite serviços na aba "Disponíveis"
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="completed" className="space-y-4">
            {completedServices.length > 0 ? (
              completedServices.map(service => (
                <Card key={service.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant="secondary">Concluído</Badge>
                        <h3 className="font-medium mt-1">{service.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {service.completedAt ? new Date(service.completedAt).toLocaleDateString("pt-BR") : ""}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-primary">
                        R$ {((service.finalPrice || service.estimatedPrice || 0) / 100).toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum serviço concluído ainda</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
