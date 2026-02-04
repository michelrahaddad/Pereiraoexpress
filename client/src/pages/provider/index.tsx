import { useState, useRef } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
  Loader2,
  Camera,
  Play,
  StopCircle,
  FileText,
  X,
  Navigation,
  ArrowLeft
} from "lucide-react";
import type { ServiceRequest } from "@shared/schema";

const slaLabels = {
  standard: { label: "Standard", color: "secondary" as const },
  express: { label: "Express", color: "default" as const },
  urgent: { label: "Urgente", color: "destructive" as const },
};

const statusLabels: Record<string, { label: string; color: "default" | "secondary" | "destructive" | "outline" }> = {
  fee_paid: { label: "Aguardando diagnóstico", color: "outline" },
  provider_assigned: { label: "Atribuído", color: "default" },
  provider_diagnosed: { label: "Orçamento enviado", color: "default" },
  quote_sent: { label: "Aguardando aceite", color: "outline" },
  accepted: { label: "Aceito pelo cliente", color: "default" },
  in_progress: { label: "Em andamento", color: "default" },
  awaiting_confirmation: { label: "Aguardando confirmação", color: "outline" },
  completed: { label: "Concluído", color: "secondary" },
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

function MyServiceCard({ 
  service, 
  onDiagnose,
  onStartExecution,
  onCompleteExecution 
}: { 
  service: ServiceRequest; 
  onDiagnose: () => void;
  onStartExecution: () => void;
  onCompleteExecution: () => void;
}) {
  const statusInfo = statusLabels[service.status] || { label: service.status, color: "secondary" as const };
  
  const needsDiagnosis = service.status === "fee_paid" || service.status === "provider_assigned";
  const canStart = service.status === "accepted";
  const canComplete = service.status === "in_progress";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <Badge variant={statusInfo.color} className="mb-1">
              {statusInfo.label}
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
        
        <div className="flex gap-2">
          {needsDiagnosis && (
            <Button 
              className="flex-1" 
              onClick={onDiagnose}
              data-testid={`button-diagnose-${service.id}`}
            >
              <FileText className="h-4 w-4 mr-2" />
              Fazer diagnóstico
            </Button>
          )}
          
          {canStart && (
            <Button 
              className="flex-1" 
              onClick={onStartExecution}
              data-testid={`button-start-${service.id}`}
            >
              <Play className="h-4 w-4 mr-2" />
              Iniciar execução
            </Button>
          )}
          
          {canComplete && (
            <Button 
              className="flex-1" 
              onClick={onCompleteExecution}
              data-testid={`button-complete-${service.id}`}
            >
              <StopCircle className="h-4 w-4 mr-2" />
              Finalizar execução
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface DiagnosisFormData {
  findings: string;
  laborCost: string;
  materialsCost: string;
  estimatedDuration: string;
  notes: string;
}

interface ExecutionFormData {
  photos: string[];
  latitude: number | null;
  longitude: number | null;
  notes: string;
}

export default function ProviderDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAvailable, setIsAvailable] = useState(true);
  const [selectedService, setSelectedService] = useState<ServiceRequest | null>(null);
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [diagnosisForm, setDiagnosisForm] = useState<DiagnosisFormData>({
    findings: "",
    laborCost: "",
    materialsCost: "",
    estimatedDuration: "",
    notes: "",
  });
  
  const [executionForm, setExecutionForm] = useState<ExecutionFormData>({
    photos: [],
    latitude: null,
    longitude: null,
    notes: "",
  });
  
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

  const diagnosisMutation = useMutation({
    mutationFn: async ({ serviceId, data }: { serviceId: number; data: DiagnosisFormData }) => {
      return apiRequest("POST", `/api/provider/diagnosis/${serviceId}`, {
        findings: data.findings,
        laborCost: Math.round(parseFloat(data.laborCost) * 100),
        materialsCost: Math.round(parseFloat(data.materialsCost || "0") * 100),
        estimatedDuration: data.estimatedDuration,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider/my-services"] });
      setShowDiagnosisModal(false);
      setDiagnosisForm({ findings: "", laborCost: "", materialsCost: "", estimatedDuration: "", notes: "" });
      toast({
        title: "Diagnóstico enviado!",
        description: "O orçamento foi enviado ao cliente.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível enviar o diagnóstico.",
        variant: "destructive",
      });
    },
  });

  const startExecutionMutation = useMutation({
    mutationFn: async ({ serviceId, data }: { serviceId: number; data: ExecutionFormData }) => {
      return apiRequest("POST", `/api/service/${serviceId}/start`, {
        latitude: data.latitude,
        longitude: data.longitude,
        beforePhotos: data.photos,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider/my-services"] });
      setShowStartModal(false);
      setExecutionForm({ photos: [], latitude: null, longitude: null, notes: "" });
      toast({
        title: "Execução iniciada!",
        description: "O cliente foi notificado do início.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a execução.",
        variant: "destructive",
      });
    },
  });

  const completeExecutionMutation = useMutation({
    mutationFn: async ({ serviceId, data }: { serviceId: number; data: ExecutionFormData }) => {
      return apiRequest("POST", `/api/service/${serviceId}/complete`, {
        latitude: data.latitude,
        longitude: data.longitude,
        afterPhotos: data.photos,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider/my-services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/provider/earnings"] });
      setShowCompleteModal(false);
      setExecutionForm({ photos: [], latitude: null, longitude: null, notes: "" });
      toast({
        title: "Serviço finalizado!",
        description: "Aguardando confirmação do cliente.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível finalizar o serviço.",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setExecutionForm(prev => ({
            ...prev,
            photos: [...prev.photos, reader.result as string]
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setExecutionForm(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
          toast({
            title: "Localização capturada!",
            description: "Sua localização foi registrada.",
          });
        },
        (error) => {
          toast({
            title: "Erro de localização",
            description: "Não foi possível obter sua localização.",
            variant: "destructive",
          });
        }
      );
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingSkeleton />
      </div>
    );
  }

  const activeServices = myServices?.filter(s => 
    ["fee_paid", "provider_assigned", "provider_diagnosed", "quote_sent", "accepted", "in_progress", "awaiting_confirmation"].includes(s.status)
  ) || [];
  
  const completedServices = myServices?.filter(s => s.status === "completed") || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 py-6 max-w-4xl mx-auto">
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
                  onDiagnose={() => {
                    setSelectedService(service);
                    setShowDiagnosisModal(true);
                  }}
                  onStartExecution={() => {
                    setSelectedService(service);
                    setExecutionForm({ photos: [], latitude: null, longitude: null, notes: "" });
                    setShowStartModal(true);
                  }}
                  onCompleteExecution={() => {
                    setSelectedService(service);
                    setExecutionForm({ photos: [], latitude: null, longitude: null, notes: "" });
                    setShowCompleteModal(true);
                  }}
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

      <Dialog open={showDiagnosisModal} onOpenChange={setShowDiagnosisModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Diagnóstico do Serviço</DialogTitle>
            <DialogDescription>
              Preencha o diagnóstico após a visita presencial.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="findings">Parecer técnico</Label>
              <Textarea
                id="findings"
                value={diagnosisForm.findings}
                onChange={(e) => setDiagnosisForm(prev => ({ ...prev, findings: e.target.value }))}
                placeholder="Descreva o que foi encontrado..."
                rows={3}
                data-testid="input-findings"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="laborCost">Mão de obra (R$)</Label>
                <Input
                  id="laborCost"
                  type="number"
                  step="0.01"
                  value={diagnosisForm.laborCost}
                  onChange={(e) => setDiagnosisForm(prev => ({ ...prev, laborCost: e.target.value }))}
                  placeholder="150.00"
                  data-testid="input-labor-cost"
                />
              </div>
              <div>
                <Label htmlFor="materialsCost">Materiais (R$)</Label>
                <Input
                  id="materialsCost"
                  type="number"
                  step="0.01"
                  value={diagnosisForm.materialsCost}
                  onChange={(e) => setDiagnosisForm(prev => ({ ...prev, materialsCost: e.target.value }))}
                  placeholder="50.00"
                  data-testid="input-materials-cost"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="estimatedDuration">Tempo estimado</Label>
              <Input
                id="estimatedDuration"
                value={diagnosisForm.estimatedDuration}
                onChange={(e) => setDiagnosisForm(prev => ({ ...prev, estimatedDuration: e.target.value }))}
                placeholder="2-3 horas"
                data-testid="input-duration"
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                value={diagnosisForm.notes}
                onChange={(e) => setDiagnosisForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações adicionais..."
                rows={2}
                data-testid="input-notes"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiagnosisModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedService) {
                  diagnosisMutation.mutate({ serviceId: selectedService.id, data: diagnosisForm });
                }
              }}
              disabled={!diagnosisForm.findings || !diagnosisForm.laborCost || diagnosisMutation.isPending}
              data-testid="button-submit-diagnosis"
            >
              {diagnosisMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enviar diagnóstico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showStartModal} onOpenChange={setShowStartModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar Execução</DialogTitle>
            <DialogDescription>
              Registre a localização e fotos do estado inicial.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Localização</Label>
              <Button 
                variant="outline" 
                className="w-full mt-1"
                onClick={getLocation}
                data-testid="button-get-location"
              >
                <Navigation className="h-4 w-4 mr-2" />
                {executionForm.latitude ? "Localização capturada" : "Capturar localização"}
              </Button>
              {executionForm.latitude && (
                <p className="text-xs text-muted-foreground mt-1">
                  Lat: {executionForm.latitude.toFixed(6)}, Lng: {executionForm.longitude?.toFixed(6)}
                </p>
              )}
            </div>
            
            <div>
              <Label>Fotos antes do serviço</Label>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
              />
              <Button 
                variant="outline" 
                className="w-full mt-1"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-add-photos"
              >
                <Camera className="h-4 w-4 mr-2" />
                Adicionar fotos ({executionForm.photos.length})
              </Button>
              {executionForm.photos.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {executionForm.photos.map((photo, i) => (
                    <div key={i} className="relative">
                      <img src={photo} alt={`Foto ${i+1}`} className="h-16 w-16 object-cover rounded-lg" />
                      <button 
                        onClick={() => setExecutionForm(prev => ({
                          ...prev,
                          photos: prev.photos.filter((_, idx) => idx !== i)
                        }))}
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedService) {
                  startExecutionMutation.mutate({ serviceId: selectedService.id, data: executionForm });
                }
              }}
              disabled={startExecutionMutation.isPending}
              data-testid="button-confirm-start"
            >
              {startExecutionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Play className="h-4 w-4 mr-2" />
              Iniciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar Execução</DialogTitle>
            <DialogDescription>
              Registre as fotos do serviço concluído.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Localização</Label>
              <Button 
                variant="outline" 
                className="w-full mt-1"
                onClick={getLocation}
                data-testid="button-get-location-complete"
              >
                <Navigation className="h-4 w-4 mr-2" />
                {executionForm.latitude ? "Localização capturada" : "Capturar localização"}
              </Button>
            </div>
            
            <div>
              <Label>Fotos do serviço concluído</Label>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
              />
              <Button 
                variant="outline" 
                className="w-full mt-1"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-add-photos-complete"
              >
                <Camera className="h-4 w-4 mr-2" />
                Adicionar fotos ({executionForm.photos.length})
              </Button>
              {executionForm.photos.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {executionForm.photos.map((photo, i) => (
                    <div key={i} className="relative">
                      <img src={photo} alt={`Foto ${i+1}`} className="h-16 w-16 object-cover rounded-lg" />
                      <button 
                        onClick={() => setExecutionForm(prev => ({
                          ...prev,
                          photos: prev.photos.filter((_, idx) => idx !== i)
                        }))}
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="completionNotes">Notas finais (opcional)</Label>
              <Textarea
                id="completionNotes"
                value={executionForm.notes}
                onChange={(e) => setExecutionForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações sobre o serviço..."
                rows={2}
                data-testid="input-completion-notes"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedService) {
                  completeExecutionMutation.mutate({ serviceId: selectedService.id, data: executionForm });
                }
              }}
              disabled={completeExecutionMutation.isPending}
              data-testid="button-confirm-complete"
            >
              {completeExecutionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
