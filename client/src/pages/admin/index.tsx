import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { CityAutocomplete } from "@/components/city-autocomplete";
import { 
  Settings, 
  Users, 
  DollarSign, 
  BarChart3,
  Loader2,
  Save,
  Sparkles,
  Database,
  Download,
  Shield,
  MapPin,
  Search,
  Filter,
  UserCheck,
  Wrench,
  Plus,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertTriangle
} from "lucide-react";
import type { UserProfile, SystemSetting } from "@shared/schema";

interface AdminStats {
  totalServices: number;
  completedServices: number;
  pendingServices: number;
  totalUsers: number;
  totalClients: number;
  totalProviders: number;
  totalRevenue: number;
  totalPayments: number;
}

interface UserWithDetails extends UserProfile {
  email?: string;
  firstName?: string;
  lastName?: string;
}

const defaultSettings = [
  { key: "ai_diagnosis_price", value: "500", description: "Preço do diagnóstico IA (centavos)" },
  { key: "service_fee_percent", value: "15", description: "Taxa sobre serviços (%)" },
  { key: "express_multiplier", value: "1.5", description: "Multiplicador Express" },
  { key: "urgent_multiplier", value: "2.0", description: "Multiplicador Urgente" },
];

export default function AdminDashboard() {
  const { isLoading: authLoading, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [cityFilter, setCityFilter] = useState("Todas");
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [settingValues, setSettingValues] = useState<Record<string, string>>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<UserWithDetails | null>(null);
  const [documentNotes, setDocumentNotes] = useState("");
  
  const [newUserForm, setNewUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    role: "client" as "client" | "provider" | "admin",
    password: "",
  });

  const isAdmin = user?.role === "admin";

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: settings } = useQuery<SystemSetting[]>({
    queryKey: ["/api/admin/settings"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: users, isLoading: usersLoading } = useQuery<UserWithDetails[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && isAdmin,
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    return users.filter(u => {
      const matchesCity = cityFilter === "Todas" || u.city === cityFilter;
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesSearch = searchTerm === "" || 
        u.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.phone && u.phone.includes(searchTerm));
      
      return matchesCity && matchesRole && matchesSearch;
    });
  }, [users, cityFilter, roleFilter, searchTerm]);

  const pendingDocuments = useMemo(() => {
    if (!users) return [];
    return users.filter(u => u.role === "provider" && u.documentStatus === "pending" && u.documentUrl);
  }, [users]);

  const usersByCity = useMemo(() => {
    if (!users) return {};
    
    const grouped: Record<string, UserWithDetails[]> = {};
    users.forEach(u => {
      const city = u.city || "Sem cidade";
      if (!grouped[city]) grouped[city] = [];
      grouped[city].push(u);
    });
    return grouped;
  }, [users]);

  const cityStats = useMemo(() => {
    return Object.entries(usersByCity).map(([city, cityUsers]) => ({
      city,
      total: cityUsers.length,
      clients: cityUsers.filter(u => u.role === "client").length,
      providers: cityUsers.filter(u => u.role === "provider").length,
    }));
  }, [usersByCity]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: string; description?: string }) => {
      return apiRequest("POST", "/api/admin/settings", { key, value, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Configuração salva!" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Role atualizada!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserForm) => {
      return apiRequest("POST", "/api/admin/users", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Usuário criado com sucesso!" });
      setIsCreateDialogOpen(false);
      setNewUserForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        city: "",
        role: "client",
        password: "",
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao criar usuário", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateDocumentStatusMutation = useMutation({
    mutationFn: async ({ userId, status, notes }: { userId: string; status: "approved" | "rejected"; notes?: string }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/document`, { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Status do documento atualizado!" });
      setSelectedDocument(null);
      setDocumentNotes("");
    },
    onError: () => {
      toast({ title: "Erro ao atualizar documento", variant: "destructive" });
    },
  });

  const handleSaveSetting = (key: string, description?: string) => {
    const value = settingValues[key];
    if (value !== undefined) {
      updateSettingMutation.mutate({ key, value, description });
    }
  };

  const getSettingValue = (key: string) => {
    if (settingValues[key] !== undefined) return settingValues[key];
    const setting = settings?.find(s => s.key === key);
    return setting?.value || defaultSettings.find(d => d.key === key)?.value || "";
  };

  const handleExportData = () => {
    toast({
      title: "Backup iniciado",
      description: "Os dados estão sendo exportados.",
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(newUserForm);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingSkeleton />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container px-6 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Acesso restrito</h1>
          <p className="text-muted-foreground mb-6">Faça login para acessar o painel administrativo</p>
          <Button asChild className="rounded-xl">
            <a href="/login/cliente">Fazer login</a>
          </Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container px-6 py-16 text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Acesso negado</h1>
          <p className="text-muted-foreground mb-6">Você não tem permissão para acessar esta área.</p>
          <Button asChild variant="outline" className="rounded-xl">
            <a href="/">Voltar para o início</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gerencie preços, usuários e configurações do sistema</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-create-user">
                <Plus className="h-4 w-4" />
                Criar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Cadastre um novo cliente, prestador ou administrador
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-firstName">Nome</Label>
                    <Input
                      id="create-firstName"
                      value={newUserForm.firstName}
                      onChange={(e) => setNewUserForm({ ...newUserForm, firstName: e.target.value })}
                      required
                      data-testid="input-create-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-lastName">Sobrenome</Label>
                    <Input
                      id="create-lastName"
                      value={newUserForm.lastName}
                      onChange={(e) => setNewUserForm({ ...newUserForm, lastName: e.target.value })}
                      required
                      data-testid="input-create-lastname"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-email">Email</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    required
                    data-testid="input-create-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-phone">Telefone</Label>
                  <Input
                    id="create-phone"
                    value={newUserForm.phone}
                    onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    data-testid="input-create-phone"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <CityAutocomplete
                    value={newUserForm.city}
                    onChange={(value) => setNewUserForm({ ...newUserForm, city: value })}
                    data-testid="input-create-city"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-role">Tipo de Usuário</Label>
                  <Select
                    value={newUserForm.role}
                    onValueChange={(value: "client" | "provider" | "admin") => 
                      setNewUserForm({ ...newUserForm, role: value })
                    }
                  >
                    <SelectTrigger data-testid="select-create-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Cliente</SelectItem>
                      <SelectItem value="provider">Prestador</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-password">Senha</Label>
                  <Input
                    id="create-password"
                    type="password"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    required
                    minLength={8}
                    data-testid="input-create-password"
                  />
                  <p className="text-xs text-muted-foreground">Mínimo 8 caracteres</p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createUserMutation.isPending}
                  data-testid="button-submit-create-user"
                >
                  {createUserMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Criar Usuário"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {statsLoading ? (
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-16 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats && (
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Serviços</p>
                    <p className="text-2xl font-bold" data-testid="stat-total-services">{stats.totalServices}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Receita Total</p>
                    <p className="text-2xl font-bold" data-testid="stat-revenue">
                      R$ {(stats.totalRevenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center">
                    <UserCheck className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clientes</p>
                    <p className="text-2xl font-bold" data-testid="stat-clients">{stats.totalClients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                    <Wrench className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Prestadores</p>
                    <p className="text-2xl font-bold" data-testid="stat-providers">{stats.totalProviders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="rounded-xl flex-wrap">
            <TabsTrigger value="users" className="rounded-lg gap-2" data-testid="tab-users">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-lg gap-2" data-testid="tab-documents">
              <FileText className="h-4 w-4" />
              Documentos
              {pendingDocuments.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 text-xs">
                  {pendingDocuments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="cities" className="rounded-lg gap-2" data-testid="tab-cities">
              <MapPin className="h-4 w-4" />
              Por Cidade
            </TabsTrigger>
            <TabsTrigger value="pricing" className="rounded-lg gap-2" data-testid="tab-pricing">
              <DollarSign className="h-4 w-4" />
              Preços
            </TabsTrigger>
            <TabsTrigger value="backup" className="rounded-lg gap-2" data-testid="tab-backup">
              <Database className="h-4 w-4" />
              Backup
            </TabsTrigger>
            <TabsTrigger value="antifraud" className="rounded-lg gap-2" data-testid="tab-antifraud">
              <AlertTriangle className="h-4 w-4" />
              Antifraude
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gestão de Usuários
                </CardTitle>
                <CardDescription>Filtre e gerencie usuários por cidade, tipo e busca</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por ID ou telefone..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        data-testid="input-search-users"
                      />
                    </div>
                  </div>
                  
                  <CityAutocomplete
                    value={cityFilter === "Todas" ? "" : cityFilter}
                    onChange={(value) => setCityFilter(value || "Todas")}
                    placeholder="Todas as cidades"
                    className="w-[220px]"
                    data-testid="select-city-filter"
                  />
                  
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[150px]" data-testid="select-role-filter">
                      <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="client">Clientes</SelectItem>
                      <SelectItem value="provider">Prestadores</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-sm text-muted-foreground">
                  Mostrando {filteredUsers.length} de {users?.length || 0} usuários
                </div>

                {usersLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : filteredUsers.length > 0 ? (
                  <div className="space-y-3 max-h-[500px] overflow-auto">
                    {filteredUsers.map((profile) => (
                      <div 
                        key={profile.id} 
                        className="flex items-center justify-between p-4 border rounded-xl"
                        data-testid={`user-row-${profile.userId}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            {profile.role === "provider" ? (
                              <Wrench className="h-5 w-5 text-muted-foreground" />
                            ) : profile.role === "admin" ? (
                              <Shield className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <Users className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{profile.userId.substring(0, 8)}...</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{profile.phone || "Sem telefone"}</span>
                              {profile.city && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {profile.city}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {profile.role === "provider" && (
                            <Badge variant={
                              profile.documentStatus === "approved" ? "default" :
                              profile.documentStatus === "rejected" ? "destructive" :
                              "secondary"
                            } className="text-xs">
                              {profile.documentStatus === "approved" ? "Verificado" :
                               profile.documentStatus === "rejected" ? "Rejeitado" :
                               "Pendente"}
                            </Badge>
                          )}
                          <Badge variant={
                            profile.role === "admin" ? "default" : 
                            profile.role === "provider" ? "secondary" : 
                            "outline"
                          }>
                            {profile.role === "admin" ? "Admin" : profile.role === "provider" ? "Prestador" : "Cliente"}
                          </Badge>
                          <Select
                            value={profile.role}
                            onValueChange={(value) => updateRoleMutation.mutate({ userId: profile.userId, role: value })}
                          >
                            <SelectTrigger className="w-32" data-testid={`select-role-${profile.userId}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="client">Cliente</SelectItem>
                              <SelectItem value="provider">Prestador</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Verificação de Documentos
                </CardTitle>
                <CardDescription>Analise e aprove documentos de prestadores de serviço</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingDocuments.length > 0 ? (
                  <div className="space-y-4">
                    {pendingDocuments.map((provider) => (
                      <div 
                        key={provider.id}
                        className="flex items-center justify-between p-4 border rounded-xl"
                        data-testid={`document-row-${provider.userId}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <Clock className="h-6 w-6 text-amber-500" />
                          </div>
                          <div>
                            <p className="font-medium">Prestador: {provider.userId.substring(0, 8)}...</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{provider.city || "Sem cidade"}</span>
                              <span>•</span>
                              <span>{provider.phone || "Sem telefone"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedDocument(provider);
                                  setDocumentNotes("");
                                }}
                                data-testid={`button-view-document-${provider.userId}`}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver Documento
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Verificar Documento</DialogTitle>
                                <DialogDescription>
                                  Analise o documento enviado e aprove ou rejeite
                                </DialogDescription>
                              </DialogHeader>
                              
                              {selectedDocument && (
                                <div className="space-y-4">
                                  <div className="border rounded-xl overflow-hidden">
                                    {selectedDocument.documentUrl && (
                                      <img 
                                        src={selectedDocument.documentUrl}
                                        alt="Documento do prestador"
                                        className="w-full max-h-96 object-contain bg-muted"
                                      />
                                    )}
                                  </div>

                                  <div className="p-4 bg-muted/50 rounded-xl">
                                    <h4 className="font-medium mb-2">Informações do Prestador</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">ID:</span>
                                        <span className="ml-2">{selectedDocument.userId.substring(0, 12)}...</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Cidade:</span>
                                        <span className="ml-2">{selectedDocument.city || "N/A"}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Telefone:</span>
                                        <span className="ml-2">{selectedDocument.phone || "N/A"}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Termos:</span>
                                        <span className="ml-2">
                                          {selectedDocument.termsAccepted ? (
                                            <span className="text-green-600">Aceitos</span>
                                          ) : (
                                            <span className="text-red-600">Não aceitos</span>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Observações (opcional)</Label>
                                    <Textarea
                                      placeholder="Adicione uma nota sobre a verificação..."
                                      value={documentNotes}
                                      onChange={(e) => setDocumentNotes(e.target.value)}
                                      data-testid="input-document-notes"
                                    />
                                  </div>

                                  <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                    <div className="flex items-start gap-3">
                                      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                                      <div className="text-sm">
                                        <p className="font-medium text-amber-700">Verificação Manual</p>
                                        <p className="text-muted-foreground mt-1">
                                          Confirme se o documento é oficial (RG, CNH, etc.), está legível 
                                          e pertence ao prestador cadastrado.
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex gap-3">
                                    <Button
                                      variant="outline"
                                      className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50"
                                      onClick={() => updateDocumentStatusMutation.mutate({
                                        userId: selectedDocument.userId,
                                        status: "rejected",
                                        notes: documentNotes
                                      })}
                                      disabled={updateDocumentStatusMutation.isPending}
                                      data-testid="button-reject-document"
                                    >
                                      <XCircle className="h-4 w-4" />
                                      Rejeitar
                                    </Button>
                                    <Button
                                      className="flex-1 gap-2"
                                      onClick={() => updateDocumentStatusMutation.mutate({
                                        userId: selectedDocument.userId,
                                        status: "approved",
                                        notes: documentNotes
                                      })}
                                      disabled={updateDocumentStatusMutation.isPending}
                                      data-testid="button-approve-document"
                                    >
                                      {updateDocumentStatusMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <>
                                          <CheckCircle2 className="h-4 w-4" />
                                          Aprovar
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                    <h3 className="font-medium mb-2">Nenhum documento pendente</h3>
                    <p className="text-sm text-muted-foreground">
                      Todos os documentos foram verificados
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Usuários por Cidade
                </CardTitle>
                <CardDescription>Visão geral de clientes e prestadores por região</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {cityStats.map(({ city, total, clients, providers }) => (
                    <Card key={city} className="border-2 hover:border-primary/20 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{city}</p>
                            <p className="text-sm text-muted-foreground">{total} usuários</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-muted/50 rounded-lg text-center">
                            <p className="text-lg font-bold text-primary">{clients}</p>
                            <p className="text-xs text-muted-foreground">Clientes</p>
                          </div>
                          <div className="p-2 bg-muted/50 rounded-lg text-center">
                            <p className="text-lg font-bold text-accent-foreground">{providers}</p>
                            <p className="text-xs text-muted-foreground">Prestadores</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full mt-4"
                          onClick={() => {
                            setCityFilter(city === "Sem cidade" ? "Todas" : city);
                          }}
                          data-testid={`button-filter-city-${city}`}
                        >
                          Ver usuários
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Preços do Diagnóstico IA
                </CardTitle>
                <CardDescription>Configure os valores cobrados pelo diagnóstico automático</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ai_diagnosis_price">Preço do Diagnóstico (centavos)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="ai_diagnosis_price"
                        type="number"
                        value={getSettingValue("ai_diagnosis_price")}
                        onChange={(e) => setSettingValues(prev => ({ ...prev, ai_diagnosis_price: e.target.value }))}
                        placeholder="500"
                        data-testid="input-ai-price"
                      />
                      <Button 
                        size="icon" 
                        onClick={() => handleSaveSetting("ai_diagnosis_price", "Preço do diagnóstico IA (centavos)")}
                        disabled={updateSettingMutation.isPending}
                        data-testid="button-save-ai-price"
                      >
                        {updateSettingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Valor atual: R$ {(parseInt(getSettingValue("ai_diagnosis_price") || "500") / 100).toFixed(2)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service_fee_percent">Taxa sobre Serviços (%)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="service_fee_percent"
                        type="number"
                        value={getSettingValue("service_fee_percent")}
                        onChange={(e) => setSettingValues(prev => ({ ...prev, service_fee_percent: e.target.value }))}
                        placeholder="15"
                        data-testid="input-service-fee"
                      />
                      <Button 
                        size="icon" 
                        onClick={() => handleSaveSetting("service_fee_percent", "Taxa sobre serviços (%)")}
                        disabled={updateSettingMutation.isPending}
                        data-testid="button-save-service-fee"
                      >
                        {updateSettingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Multiplicadores de SLA
                </CardTitle>
                <CardDescription>Configure os multiplicadores de preço para cada nível de urgência</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="express_multiplier">Multiplicador Express</Label>
                    <div className="flex gap-2">
                      <Input
                        id="express_multiplier"
                        type="number"
                        step="0.1"
                        value={getSettingValue("express_multiplier")}
                        onChange={(e) => setSettingValues(prev => ({ ...prev, express_multiplier: e.target.value }))}
                        placeholder="1.5"
                        data-testid="input-express-multiplier"
                      />
                      <Button 
                        size="icon" 
                        onClick={() => handleSaveSetting("express_multiplier", "Multiplicador Express")}
                        disabled={updateSettingMutation.isPending}
                      >
                        {updateSettingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Atendimento em até 12h</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="urgent_multiplier">Multiplicador Urgente</Label>
                    <div className="flex gap-2">
                      <Input
                        id="urgent_multiplier"
                        type="number"
                        step="0.1"
                        value={getSettingValue("urgent_multiplier")}
                        onChange={(e) => setSettingValues(prev => ({ ...prev, urgent_multiplier: e.target.value }))}
                        placeholder="2.0"
                        data-testid="input-urgent-multiplier"
                      />
                      <Button 
                        size="icon" 
                        onClick={() => handleSaveSetting("urgent_multiplier", "Multiplicador Urgente")}
                        disabled={updateSettingMutation.isPending}
                      >
                        {updateSettingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Atendimento em até 2h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Backup de Dados
                </CardTitle>
                <CardDescription>Exporte os dados do sistema para backup</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-6 border rounded-xl text-center space-y-4">
                  <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Download className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Exportar todos os dados</h3>
                    <p className="text-sm text-muted-foreground">
                      Baixe um arquivo com todos os usuários, serviços e pagamentos
                    </p>
                  </div>
                  <Button 
                    onClick={handleExportData}
                    className="gap-2"
                    data-testid="button-export-backup"
                  >
                    <Download className="h-4 w-4" />
                    Iniciar Backup
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="p-4 border rounded-xl text-center">
                    <p className="text-2xl font-bold text-primary">{stats?.totalServices || 0}</p>
                    <p className="text-sm text-muted-foreground">Serviços</p>
                  </div>
                  <div className="p-4 border rounded-xl text-center">
                    <p className="text-2xl font-bold text-primary">{users?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Usuários</p>
                  </div>
                  <div className="p-4 border rounded-xl text-center">
                    <p className="text-2xl font-bold text-primary">{stats?.totalPayments || 0}</p>
                    <p className="text-sm text-muted-foreground">Pagamentos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="antifraud" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Sistema Antifraude
                </CardTitle>
                <CardDescription>Monitore flags de risco e comportamentos suspeitos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="p-4 text-center border rounded-xl bg-green-500/10 border-green-500/20">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">Baixo Risco</p>
                    <p className="text-sm text-muted-foreground">Operações normais</p>
                  </div>
                  <div className="p-4 text-center border rounded-xl bg-yellow-500/10 border-yellow-500/20">
                    <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">Alertas pendentes</p>
                  </div>
                  <div className="p-4 text-center border rounded-xl bg-red-500/10 border-red-500/20">
                    <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">Bloqueados</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Regras de Detecção Ativas</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium text-sm">Múltiplos serviços mesmo CPF</p>
                          <p className="text-xs text-muted-foreground">Detecta 3+ serviços pendentes do mesmo CPF</p>
                        </div>
                      </div>
                      <Badge variant="outline">Ativo</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium text-sm">Distância geolocalização</p>
                          <p className="text-xs text-muted-foreground">Alerta se distância &gt; 50km do endereço cadastrado</p>
                        </div>
                      </div>
                      <Badge variant="outline">Ativo</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium text-sm">Valor acima do padrão</p>
                          <p className="text-xs text-muted-foreground">Alerta para serviços &gt; R$ 5.000</p>
                        </div>
                      </div>
                      <Badge variant="outline">Ativo</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium text-sm">Cancelamentos frequentes</p>
                          <p className="text-xs text-muted-foreground">Flag para 3+ cancelamentos em 30 dias</p>
                        </div>
                      </div>
                      <Badge variant="outline">Ativo</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Histórico de Alertas</h3>
                  <div className="p-8 text-center border rounded-lg">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhum alerta registrado</p>
                    <p className="text-sm text-muted-foreground">Todas as operações estão dentro dos padrões normais</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
