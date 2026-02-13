import { useState, useRef, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { LoadingSkeleton, CardSkeleton } from "@/components/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
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
  Plus,
  Minus,
  Search,
  Package,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  Edit3
} from "lucide-react";
import type { ServiceRequest } from "@shared/schema";

// Tipo para material selecionado
interface SelectedMaterial {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number; // em centavos (salePrice)
}

// Tipo para resultado da busca de materiais
interface MaterialSearchResult {
  id: number;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  priceFormatted: string;
}

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
  const { latitude, longitude, loading: locationLoading, error: locationError, requestLocation } = useGeolocation();
  
  const [diagnosisForm, setDiagnosisForm] = useState<DiagnosisFormData>({
    findings: "",
    laborCost: "",
    materialsCost: "",
    estimatedDuration: "",
    notes: "",
  });
  
  // Estado para materiais selecionados
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([]);
  const [materialSearch, setMaterialSearch] = useState("");
  const [showMaterialSearch, setShowMaterialSearch] = useState(false);
  const [materialSearchResults, setMaterialSearchResults] = useState<MaterialSearchResult[]>([]);
  const [isSearchingMaterials, setIsSearchingMaterials] = useState(false);
  
  // Buscar materiais com debounce
  useEffect(() => {
    if (!materialSearch.trim()) {
      setMaterialSearchResults([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      setIsSearchingMaterials(true);
      try {
        const response = await fetch(`/api/materials/search?q=${encodeURIComponent(materialSearch)}`);
        if (response.ok) {
          const results = await response.json();
          setMaterialSearchResults(results);
        }
      } catch (error) {
        console.error("Error searching materials:", error);
      } finally {
        setIsSearchingMaterials(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [materialSearch]);
  
  // Calcular total de materiais selecionados
  const totalMaterialsCost = selectedMaterials.reduce((sum, m) => sum + (m.unitPrice * m.quantity), 0);
  
  // Atualizar materialsCost quando materiais mudam
  useEffect(() => {
    const totalReais = (totalMaterialsCost / 100).toFixed(2);
    setDiagnosisForm(prev => ({ ...prev, materialsCost: totalReais }));
  }, [totalMaterialsCost]);
  
  // Funções para gerenciar materiais
  const addMaterial = (material: MaterialSearchResult) => {
    const existing = selectedMaterials.find(m => m.id === material.id);
    if (existing) {
      setSelectedMaterials(prev => prev.map(m => 
        m.id === material.id ? { ...m, quantity: m.quantity + 1 } : m
      ));
    } else {
      setSelectedMaterials(prev => [...prev, {
        id: material.id,
        name: material.name,
        unit: material.unit,
        quantity: 1,
        unitPrice: material.salePrice,
      }]);
    }
    setMaterialSearch("");
    setShowMaterialSearch(false);
  };
  
  const updateMaterialQuantity = (id: number, delta: number) => {
    setSelectedMaterials(prev => prev.map(m => {
      if (m.id === id) {
        const newQty = Math.max(0, m.quantity + delta);
        return { ...m, quantity: newQty };
      }
      return m;
    }).filter(m => m.quantity > 0));
  };
  
  const removeMaterial = (id: number) => {
    setSelectedMaterials(prev => prev.filter(m => m.id !== id));
  };
  
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

  const { data: profile } = useQuery<{ rating: string; totalRatings: number }>({
    queryKey: ["/api/provider/profile"],
    enabled: isAuthenticated,
  });

  const { data: reviews } = useQuery<{ id: number; rating: number; comment: string; createdAt: string; clientName?: string }[]>({
    queryKey: ["/api/provider/reviews"],
    enabled: isAuthenticated,
  });

  interface WalletData {
    totalEarned: number;
    pendingAmount: number;
    availableBalance: number;
    totalWithdrawn: number;
    pendingWithdrawal: number;
    completedServices: number;
    bankData: {
      pixKeyType: string | null;
      pixKey: string | null;
      bankName: string | null;
      bankAgency: string | null;
      bankAccount: string | null;
    } | null;
  }

  const { data: wallet, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ["/api/provider/wallet"],
    enabled: isAuthenticated,
  });

  interface WithdrawalRecord {
    id: number;
    amount: number;
    status: string;
    pixKeyType: string;
    pixKey: string;
    createdAt: string;
    processedAt: string | null;
  }

  const { data: withdrawals } = useQuery<WithdrawalRecord[]>({
    queryKey: ["/api/provider/withdrawals"],
    enabled: isAuthenticated,
  });

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showBankEditModal, setShowBankEditModal] = useState(false);
  const [bankForm, setBankForm] = useState({
    pixKeyType: "",
    pixKey: "",
    bankName: "",
    bankAgency: "",
    bankAccount: "",
  });

  const withdrawMutation = useMutation({
    mutationFn: async (amount: number) => {
      return apiRequest("POST", "/api/provider/withdraw", { amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/provider/withdrawals"] });
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      toast({
        title: "Saque solicitado!",
        description: "O valor será transferido para sua conta PIX.",
      });
    },
    onError: async (error: any) => {
      let message = "Não foi possível solicitar o saque.";
      try {
        const data = await error.json?.();
        if (data?.error) message = data.error;
      } catch {}
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    },
  });

  const updateBankMutation = useMutation({
    mutationFn: async (data: typeof bankForm) => {
      return apiRequest("PATCH", "/api/provider/bank-data", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider/wallet"] });
      setShowBankEditModal(false);
      toast({
        title: "Dados bancários atualizados!",
        description: "Seus dados PIX foram salvos.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os dados bancários.",
        variant: "destructive",
      });
    },
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
    mutationFn: async ({ serviceId, data, materials }: { serviceId: number; data: DiagnosisFormData; materials: SelectedMaterial[] }) => {
      return apiRequest("POST", `/api/provider/diagnosis/${serviceId}`, {
        findings: data.findings,
        laborCost: Math.round(parseFloat(data.laborCost) * 100),
        materialsCost: Math.round(parseFloat(data.materialsCost || "0") * 100),
        estimatedDuration: data.estimatedDuration,
        notes: data.notes,
        materialsList: materials.map(m => ({
          id: m.id,
          name: m.name,
          unit: m.unit,
          quantity: m.quantity,
          unitPrice: m.unitPrice,
          totalPrice: m.unitPrice * m.quantity,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider/my-services"] });
      setShowDiagnosisModal(false);
      setDiagnosisForm({ findings: "", laborCost: "", materialsCost: "", estimatedDuration: "", notes: "" });
      setSelectedMaterials([]);
      setMaterialSearch("");
      setShowMaterialSearch(false);
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
                  {(profile?.totalRatings || 0) > 0 ? (
                    <p className="text-xl font-bold" data-testid="text-rating">
                      {parseFloat(profile?.rating || "0").toFixed(1)}/10
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        ({profile?.totalRatings} {profile?.totalRatings === 1 ? "avaliação" : "avaliações"})
                      </span>
                    </p>
                  ) : (
                    <p className="text-xl font-bold text-muted-foreground" data-testid="text-rating-new">
                      Novo
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Wallet Section */}
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Minha Carteira
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBankForm({
                      pixKeyType: wallet?.bankData?.pixKeyType || "",
                      pixKey: wallet?.bankData?.pixKey || "",
                      bankName: wallet?.bankData?.bankName || "",
                      bankAgency: wallet?.bankData?.bankAgency || "",
                      bankAccount: wallet?.bankData?.bankAccount || "",
                    });
                    setShowBankEditModal(true);
                  }}
                  data-testid="button-edit-bank"
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Dados PIX
                </Button>
                <Button
                  size="sm"
                  disabled={!wallet?.availableBalance || wallet.availableBalance <= 0}
                  onClick={() => setShowWithdrawModal(true)}
                  data-testid="button-withdraw"
                >
                  <ArrowUpFromLine className="h-4 w-4 mr-1" />
                  Sacar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <p className="text-xs text-muted-foreground">A receber</p>
                </div>
                <p className="text-lg font-bold text-amber-700 dark:text-amber-400" data-testid="text-pending-amount">
                  R$ {((wallet?.pendingAmount || 0) / 100).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Serviços em andamento</p>
              </div>

              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <p className="text-xs text-muted-foreground">Disponível</p>
                </div>
                <p className="text-lg font-bold text-green-700 dark:text-green-400" data-testid="text-available-balance">
                  R$ {((wallet?.availableBalance || 0) / 100).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Pronto para saque</p>
              </div>

              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpFromLine className="h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">Sacado</p>
                </div>
                <p className="text-lg font-bold" data-testid="text-total-withdrawn">
                  R$ {((wallet?.totalWithdrawn || 0) / 100).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total transferido</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Total ganho</p>
                </div>
                <p className="text-lg font-bold" data-testid="text-total-earned">
                  R$ {((wallet?.totalEarned || 0) / 100).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{wallet?.completedServices || 0} serviços</p>
              </div>
            </div>

            {wallet?.bankData?.pixKey ? (
              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg text-sm">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">PIX: </span>
                <span className="font-medium" data-testid="text-pix-key">
                  {wallet.bankData.pixKeyType === "cpf" ? "CPF" :
                   wallet.bankData.pixKeyType === "phone" ? "Celular" :
                   wallet.bankData.pixKeyType === "email" ? "Email" : "Chave"}: {wallet.bankData.pixKey}
                </span>
                {wallet.bankData.bankName && (
                  <Badge variant="secondary">{wallet.bankData.bankName}</Badge>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-sm">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-amber-700 dark:text-amber-400">
                  Cadastre sua chave PIX para poder sacar seus ganhos
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setShowBankEditModal(true)}
                  data-testid="button-add-pix"
                >
                  Cadastrar PIX
                </Button>
              </div>
            )}

            {wallet?.pendingWithdrawal ? (
              <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 text-sm">
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                <span className="text-blue-700 dark:text-blue-400">
                  Saque em processamento: R$ {(wallet.pendingWithdrawal / 100).toFixed(2)}
                </span>
              </div>
            ) : null}

            {withdrawals && withdrawals.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Histórico de saques</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {withdrawals.slice(0, 5).map((w) => (
                    <div key={w.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 text-sm">
                      <div className="flex items-center gap-2">
                        <ArrowUpFromLine className="h-3 w-3 text-muted-foreground" />
                        <span>R$ {(w.amount / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(w.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                        <Badge 
                          variant={w.status === "completed" ? "secondary" : w.status === "rejected" ? "destructive" : "outline"}
                          data-testid={`badge-withdrawal-status-${w.id}`}
                        >
                          {w.status === "pending" ? "Pendente" :
                           w.status === "processing" ? "Processando" :
                           w.status === "completed" ? "Concluído" : "Rejeitado"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location card */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Navigation className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sua Localização</p>
                  {latitude !== null && longitude !== null ? (
                    <p className="text-sm font-medium text-green-600" data-testid="text-location-active">
                      Localização ativa - clientes próximos podem te encontrar
                    </p>
                  ) : locationError ? (
                    <p className="text-sm text-amber-600" data-testid="text-location-error">
                      {locationError}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground" data-testid="text-location-inactive">
                      Ative para aparecer para clientes próximos (30km)
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant={latitude !== null ? "outline" : "default"}
                size="sm"
                onClick={requestLocation}
                disabled={locationLoading}
                data-testid="button-update-location"
              >
                {locationLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : latitude !== null ? (
                  "Atualizar"
                ) : (
                  "Ativar localização"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reviews section */}
        {reviews && reviews.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Avaliações Recebidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.slice(0, 5).map((review) => (
                <div key={review.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">Cliente #{review.clientName}</span>
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-bold">{review.rating}/10</span>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(review.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
                  readOnly={selectedMaterials.length > 0}
                  className={selectedMaterials.length > 0 ? "bg-muted" : ""}
                />
              </div>
            </div>
            
            {/* Seção de adicionar materiais */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Adicionar Materiais
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMaterialSearch(!showMaterialSearch)}
                  data-testid="button-add-material"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              
              {showMaterialSearch && (
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar material (ex: tinta, fio, tubo...)"
                        value={materialSearch}
                        onChange={(e) => setMaterialSearch(e.target.value)}
                        className="pl-9"
                        data-testid="input-material-search"
                        autoFocus
                      />
                    </div>
                  </div>
                  
                  {/* Resultados da busca */}
                  {(materialSearchResults.length > 0 || isSearchingMaterials) && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                      {isSearchingMaterials ? (
                        <div className="p-3 text-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                          Buscando...
                        </div>
                      ) : (
                        materialSearchResults.map((material) => (
                          <button
                            key={material.id}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-accent flex items-center justify-between text-sm"
                            onClick={() => addMaterial(material)}
                            data-testid={`material-option-${material.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{material.name}</p>
                              <p className="text-xs text-muted-foreground">{material.category} - {material.unit}</p>
                            </div>
                            <span className="ml-2 font-medium text-primary whitespace-nowrap">
                              {material.priceFormatted}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Lista de materiais selecionados */}
              {selectedMaterials.length > 0 && (
                <div className="border rounded-md p-2 space-y-2 max-h-40 overflow-auto">
                  {selectedMaterials.map((material) => (
                    <div key={material.id} className="flex items-center gap-2 text-sm bg-muted/50 rounded p-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-xs">{material.name}</p>
                        <p className="text-xs text-muted-foreground">
                          R$ {(material.unitPrice / 100).toFixed(2)} / {material.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateMaterialQuantity(material.id, -1)}
                          data-testid={`button-decrease-${material.id}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center font-medium">{material.quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateMaterialQuantity(material.id, 1)}
                          data-testid={`button-increase-${material.id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => removeMaterial(material.id)}
                          data-testid={`button-remove-${material.id}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="font-medium text-primary whitespace-nowrap text-xs">
                        R$ {((material.unitPrice * material.quantity) / 100).toFixed(2)}
                      </p>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 border-t text-sm font-medium">
                    <span>Total Materiais:</span>
                    <span className="text-primary">R$ {(totalMaterialsCost / 100).toFixed(2)}</span>
                  </div>
                </div>
              )}
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
                  diagnosisMutation.mutate({ 
                    serviceId: selectedService.id, 
                    data: diagnosisForm,
                    materials: selectedMaterials 
                  });
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

      {/* Withdraw Modal */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpFromLine className="h-5 w-5" />
              Solicitar Saque
            </DialogTitle>
            <DialogDescription>
              Transfira seu saldo disponível para sua conta PIX cadastrada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-sm text-muted-foreground">Saldo disponível</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                R$ {((wallet?.availableBalance || 0) / 100).toFixed(2)}
              </p>
            </div>

            {wallet?.bankData?.pixKey && (
              <div className="p-3 bg-muted/30 rounded-lg text-sm">
                <p className="text-muted-foreground mb-1">Transferir para:</p>
                <p className="font-medium">
                  PIX ({wallet.bankData.pixKeyType === "cpf" ? "CPF" :
                         wallet.bankData.pixKeyType === "phone" ? "Celular" :
                         wallet.bankData.pixKeyType === "email" ? "Email" : "Chave"}): {wallet.bankData.pixKey}
                </p>
                {wallet.bankData.bankName && (
                  <p className="text-muted-foreground">{wallet.bankData.bankName}</p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="withdrawAmount">Valor do saque (R$)</Label>
              <Input
                id="withdrawAmount"
                type="number"
                step="0.01"
                min="1"
                max={(wallet?.availableBalance || 0) / 100}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                data-testid="input-withdraw-amount"
              />
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWithdrawAmount(((wallet?.availableBalance || 0) / 100).toFixed(2))}
                  data-testid="button-withdraw-all"
                >
                  Sacar tudo
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const amountCents = Math.round(parseFloat(withdrawAmount) * 100);
                if (amountCents > 0) {
                  withdrawMutation.mutate(amountCents);
                }
              }}
              disabled={withdrawMutation.isPending || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
              data-testid="button-confirm-withdraw"
            >
              {withdrawMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar saque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Data Edit Modal */}
      <Dialog open={showBankEditModal} onOpenChange={setShowBankEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Dados Bancários PIX
            </DialogTitle>
            <DialogDescription>
              Configure sua chave PIX para receber os pagamentos dos serviços.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editPixKeyType">Tipo de Chave PIX</Label>
              <select
                id="editPixKeyType"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
                value={bankForm.pixKeyType}
                onChange={(e) => setBankForm({ ...bankForm, pixKeyType: e.target.value, pixKey: "" })}
                data-testid="select-edit-pix-type"
              >
                <option value="">Selecione...</option>
                <option value="cpf">CPF</option>
                <option value="phone">Celular</option>
                <option value="email">Email</option>
                <option value="random">Chave aleatória</option>
              </select>
            </div>

            <div>
              <Label htmlFor="editPixKey">Chave PIX</Label>
              <Input
                id="editPixKey"
                value={bankForm.pixKey}
                onChange={(e) => setBankForm({ ...bankForm, pixKey: e.target.value })}
                placeholder={
                  bankForm.pixKeyType === "cpf" ? "000.000.000-00" :
                  bankForm.pixKeyType === "phone" ? "(00) 00000-0000" :
                  bankForm.pixKeyType === "email" ? "seu@email.com" :
                  "Cole sua chave aleatória"
                }
                className="mt-1"
                data-testid="input-edit-pix-key"
              />
            </div>

            <div>
              <Label htmlFor="editBankName">Banco (opcional)</Label>
              <Input
                id="editBankName"
                value={bankForm.bankName}
                onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                placeholder="Ex: Nubank, Bradesco..."
                className="mt-1"
                data-testid="input-edit-bank-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editBankAgency">Agência (opcional)</Label>
                <Input
                  id="editBankAgency"
                  value={bankForm.bankAgency}
                  onChange={(e) => setBankForm({ ...bankForm, bankAgency: e.target.value })}
                  placeholder="0001"
                  className="mt-1"
                  data-testid="input-edit-bank-agency"
                />
              </div>
              <div>
                <Label htmlFor="editBankAccount">Conta (opcional)</Label>
                <Input
                  id="editBankAccount"
                  value={bankForm.bankAccount}
                  onChange={(e) => setBankForm({ ...bankForm, bankAccount: e.target.value })}
                  placeholder="00000-0"
                  className="mt-1"
                  data-testid="input-edit-bank-account"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBankEditModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => updateBankMutation.mutate(bankForm)}
              disabled={updateBankMutation.isPending || !bankForm.pixKeyType || !bankForm.pixKey}
              data-testid="button-save-bank-data"
            >
              {updateBankMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
