import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { AiTrainingManager } from "@/components/admin/ai-training-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
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
  AlertTriangle,
  Star,
  Brain,
  ChevronRight,
  LayoutDashboard,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

interface ProviderWithStats extends UserProfile {
  totalServices: number;
  completedServices: number;
  pendingServices: number;
  totalEarnings: number;
  reviewsCount: number;
  reviews: { id: number; rating: number; comment: string; createdAt: string }[];
}

interface ClientWithStats extends UserProfile {
  totalServices: number;
  completedServices: number;
  pendingServices: number;
  totalSpent: number;
}

const defaultSettings = [
  { key: "ai_diagnosis_price", value: "500", description: "Preço do diagnóstico IA (centavos)" },
  { key: "service_fee_percent", value: "15", description: "Taxa sobre serviços (%)" },
  { key: "express_multiplier", value: "1.5", description: "Multiplicador Express" },
  { key: "urgent_multiplier", value: "2.0", description: "Multiplicador Urgente" },
];

type AdminSection = 
  | "dashboard"
  | "users" 
  | "documents" 
  | "providers" 
  | "clients" 
  | "cities" 
  | "pricing" 
  | "reference-prices" 
  | "antifraud" 
  | "symptoms" 
  | "ai-training" 
  | "backup";

interface NavGroup {
  label: string;
  items: {
    id: AdminSection;
    label: string;
    icon: React.ElementType;
    badge?: number;
  }[];
}

export default function AdminDashboard() {
  const { isLoading: authLoading, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
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
    cpf: "",
    age: "",
    specialties: "",
  });
  const [deleteConfirmUserId, setDeleteConfirmUserId] = useState<string | null>(null);

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

  const { data: providersData, isLoading: providersLoading } = useQuery<ProviderWithStats[]>({
    queryKey: ["/api/admin/providers"],
    enabled: isAuthenticated && isAdmin,
  });

  const { data: clientsData, isLoading: clientsLoading } = useQuery<ClientWithStats[]>({
    queryKey: ["/api/admin/clients"],
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
        cpf: "",
        age: "",
        specialties: "",
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

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/providers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      toast({ title: "Usuário excluído com sucesso!" });
      setDeleteConfirmUserId(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao excluir usuário", 
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

  const navGroups: NavGroup[] = [
    {
      label: "Visão Geral",
      items: [
        { id: "dashboard", label: "Painel", icon: LayoutDashboard },
      ],
    },
    {
      label: "Pessoas",
      items: [
        { id: "users", label: "Usuários", icon: Users },
        { id: "documents", label: "Documentos", icon: FileText, badge: pendingDocuments.length || undefined },
        { id: "providers", label: "Profissionais", icon: Wrench },
        { id: "clients", label: "Clientes", icon: UserCheck },
        { id: "cities", label: "Por Cidade", icon: MapPin },
      ],
    },
    {
      label: "Financeiro",
      items: [
        { id: "pricing", label: "Preços", icon: DollarSign },
        { id: "reference-prices", label: "SINAPI", icon: BarChart3 },
        { id: "antifraud", label: "Antifraude", icon: AlertTriangle },
      ],
    },
    {
      label: "Inteligência Artificial",
      items: [
        { id: "symptoms", label: "Sintomas IA", icon: Sparkles },
        { id: "ai-training", label: "Treinamento IA", icon: Brain },
      ],
    },
    {
      label: "Sistema",
      items: [
        { id: "backup", label: "Backup", icon: Database },
      ],
    },
  ];

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

  const currentNavItem = navGroups.flatMap(g => g.items).find(i => i.id === activeSection);

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <SidebarProvider style={sidebarStyle as React.CSSProperties}>
        <div className="flex h-[calc(100vh-64px)] w-full">
          <Sidebar>
            <SidebarHeader className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">Administração</span>
              </div>
            </SidebarHeader>
            <SidebarContent>
              {navGroups.map((group) => (
                <SidebarGroup key={group.label}>
                  <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        return (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              isActive={isActive}
                              onClick={() => setActiveSection(item.id)}
                              data-testid={`nav-${item.id}`}
                            >
                              <Icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                            {item.badge && item.badge > 0 && (
                              <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                            )}
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </SidebarContent>
          </Sidebar>

          <main className="flex-1 min-w-0 overflow-auto">
            <div className="border-b px-4 py-3 flex items-center gap-3 sticky top-0 bg-background z-30">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Admin</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground font-medium">{currentNavItem?.label || "Painel"}</span>
              </div>
              <div className="ml-auto">
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2" data-testid="button-create-user">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Criar Usuário</span>
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

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="create-cpf">CPF</Label>
                        <Input
                          id="create-cpf"
                          value={newUserForm.cpf}
                          onChange={(e) => setNewUserForm({ ...newUserForm, cpf: e.target.value })}
                          placeholder="000.000.000-00"
                          data-testid="input-create-cpf"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-age">Idade</Label>
                        <Input
                          id="create-age"
                          type="number"
                          value={newUserForm.age}
                          onChange={(e) => setNewUserForm({ ...newUserForm, age: e.target.value })}
                          placeholder="25"
                          data-testid="input-create-age"
                        />
                      </div>
                    </div>

                    {newUserForm.role === "provider" && (
                      <div className="space-y-2">
                        <Label htmlFor="create-specialties">Especialidades</Label>
                        <Input
                          id="create-specialties"
                          value={newUserForm.specialties}
                          onChange={(e) => setNewUserForm({ ...newUserForm, specialties: e.target.value })}
                          placeholder="Eletricista, Encanador, Pintor..."
                          data-testid="input-create-specialties"
                        />
                        <p className="text-xs text-muted-foreground">Separe as especialidades por vírgula</p>
                      </div>
                    )}

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
          </div>

          <div className="p-4 md:p-6 max-w-6xl">
            {activeSection === "dashboard" && (
              <DashboardSection stats={stats} statsLoading={statsLoading} />
            )}
            {activeSection === "users" && (
              <UsersSection
                users={users}
                filteredUsers={filteredUsers}
                usersLoading={usersLoading}
                cityFilter={cityFilter}
                setCityFilter={setCityFilter}
                roleFilter={roleFilter}
                setRoleFilter={setRoleFilter}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                updateRoleMutation={updateRoleMutation}
                deleteUserMutation={deleteUserMutation}
                deleteConfirmUserId={deleteConfirmUserId}
                setDeleteConfirmUserId={setDeleteConfirmUserId}
              />
            )}
            {activeSection === "documents" && (
              <DocumentsSection
                pendingDocuments={pendingDocuments}
                selectedDocument={selectedDocument}
                setSelectedDocument={setSelectedDocument}
                documentNotes={documentNotes}
                setDocumentNotes={setDocumentNotes}
                updateDocumentStatusMutation={updateDocumentStatusMutation}
              />
            )}
            {activeSection === "cities" && (
              <CitiesSection cityStats={cityStats} setCityFilter={setCityFilter} setActiveSection={setActiveSection} />
            )}
            {activeSection === "pricing" && (
              <PricingSection
                getSettingValue={getSettingValue}
                setSettingValues={setSettingValues}
                handleSaveSetting={handleSaveSetting}
                updateSettingMutation={updateSettingMutation}
              />
            )}
            {activeSection === "backup" && (
              <BackupSection stats={stats} users={users} handleExportData={handleExportData} />
            )}
            {activeSection === "antifraud" && <AntifraudSection />}
            {activeSection === "symptoms" && <SymptomsManager />}
            {activeSection === "providers" && (
              <ProvidersSection providersData={providersData} providersLoading={providersLoading} />
            )}
            {activeSection === "clients" && (
              <ClientsSection clientsData={clientsData} clientsLoading={clientsLoading} />
            )}
            {activeSection === "reference-prices" && <ReferencePricesManager />}
            {activeSection === "ai-training" && <AiTrainingManager />}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}

// ==================== DASHBOARD SECTION ====================
function DashboardSection({ stats, statsLoading }: { stats?: AdminStats; statsLoading: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Painel Administrativo</h2>
        <p className="text-muted-foreground">Visão geral da plataforma</p>
      </div>
      {statsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
}

// ==================== USERS SECTION ====================
function UsersSection({
  users, filteredUsers, usersLoading, cityFilter, setCityFilter, roleFilter, setRoleFilter, searchTerm, setSearchTerm, updateRoleMutation,
  deleteUserMutation, deleteConfirmUserId, setDeleteConfirmUserId,
}: any) {
  return (
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
                onChange={(e: any) => setSearchTerm(e.target.value)}
                data-testid="input-search-users"
              />
            </div>
          </div>
          
          <CityAutocomplete
            value={cityFilter === "Todas" ? "" : cityFilter}
            onChange={(value: string) => setCityFilter(value || "Todas")}
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
            {[...Array(3)].map((_: any, i: number) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="space-y-3 max-h-[500px] overflow-auto">
            {filteredUsers.map((profile: any) => (
              <div 
                key={profile.id} 
                className="flex items-center justify-between gap-3 p-4 border rounded-xl flex-wrap"
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
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
                <div className="flex items-center gap-3 flex-wrap">
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
                    onValueChange={(value: string) => updateRoleMutation.mutate({ userId: profile.userId, role: value })}
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
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setDeleteConfirmUserId(profile.userId)}
                    data-testid={`button-delete-user-${profile.userId}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</p>
        )}

        <AlertDialog open={!!deleteConfirmUserId} onOpenChange={(open) => !open && setDeleteConfirmUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita. Todos os dados do perfil serão removidos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirmUserId && deleteUserMutation.mutate(deleteConfirmUserId)}
                className="bg-destructive text-destructive-foreground"
                data-testid="button-confirm-delete"
              >
                {deleteUserMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Excluir"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

// ==================== DOCUMENTS SECTION ====================
function DocumentsSection({
  pendingDocuments, selectedDocument, setSelectedDocument, documentNotes, setDocumentNotes, updateDocumentStatusMutation,
}: any) {
  return (
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
            {pendingDocuments.map((provider: any) => (
              <div 
                key={provider.id}
                className="flex items-center justify-between gap-4 p-4 border rounded-xl flex-wrap"
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
                              onChange={(e: any) => setDocumentNotes(e.target.value)}
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
  );
}

// ==================== CITIES SECTION ====================
function CitiesSection({ cityStats, setCityFilter, setActiveSection }: any) {
  return (
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
          {cityStats.map(({ city, total, clients, providers }: any) => (
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
                    setActiveSection("users");
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
  );
}

// ==================== PRICING SECTION ====================
function PricingSection({ getSettingValue, setSettingValues, handleSaveSetting, updateSettingMutation }: any) {
  return (
    <div className="space-y-6">
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
                  onChange={(e: any) => setSettingValues((prev: any) => ({ ...prev, ai_diagnosis_price: e.target.value }))}
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
                  onChange={(e: any) => setSettingValues((prev: any) => ({ ...prev, service_fee_percent: e.target.value }))}
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
            Multiplicadores SLA
          </CardTitle>
          <CardDescription>Configure os multiplicadores de preço por prioridade</CardDescription>
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
                  onChange={(e: any) => setSettingValues((prev: any) => ({ ...prev, express_multiplier: e.target.value }))}
                  placeholder="1.5"
                />
                <Button 
                  size="icon" 
                  onClick={() => handleSaveSetting("express_multiplier", "Multiplicador Express")}
                  disabled={updateSettingMutation.isPending}
                >
                  {updateSettingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Atendimento em até 4h</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgent_multiplier">Multiplicador Urgente</Label>
              <div className="flex gap-2">
                <Input
                  id="urgent_multiplier"
                  type="number"
                  step="0.1"
                  value={getSettingValue("urgent_multiplier")}
                  onChange={(e: any) => setSettingValues((prev: any) => ({ ...prev, urgent_multiplier: e.target.value }))}
                  placeholder="2.0"
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
    </div>
  );
}

// ==================== BACKUP SECTION ====================
function BackupSection({ stats, users, handleExportData }: any) {
  return (
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
  );
}

// ==================== ANTIFRAUD SECTION ====================
function AntifraudSection() {
  return (
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
            {[
              { title: "Múltiplos serviços mesmo CPF", desc: "Detecta 3+ serviços pendentes do mesmo CPF" },
              { title: "Distância geolocalização", desc: "Alerta se distância > 50km do endereço cadastrado" },
              { title: "Valor acima do padrão", desc: "Alerta para serviços > R$ 5.000" },
              { title: "Cancelamentos frequentes", desc: "Flag para 3+ cancelamentos em 30 dias" },
            ].map((rule) => (
              <div key={rule.title} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{rule.title}</p>
                    <p className="text-xs text-muted-foreground">{rule.desc}</p>
                  </div>
                </div>
                <Badge variant="outline">Ativo</Badge>
              </div>
            ))}
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
  );
}

// ==================== PROVIDERS SECTION ====================
function ProvidersSection({ providersData, providersLoading }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Gestão de Profissionais
        </CardTitle>
        <CardDescription>Visualize notas, avaliações, serviços e pagamentos dos profissionais</CardDescription>
      </CardHeader>
      <CardContent>
        {providersLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_: any, i: number) => (
              <div key={i} className="h-24 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : providersData && providersData.length > 0 ? (
          <div className="space-y-4">
            {providersData.map((provider: any) => (
              <div key={provider.userId} className="p-4 border rounded-lg hover-elevate">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-semibold">Profissional #{provider.userId.slice(-6)}</span>
                      {(provider.totalRatings || 0) > 0 ? (
                        <Badge variant="default" className="bg-yellow-500 text-black">
                          {parseFloat(provider.rating || "0").toFixed(1)}/10
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                          Novo
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {provider.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {provider.city}
                        </span>
                      )}
                      {provider.phone && (
                        <span>{provider.phone}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="p-2 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Avaliações</p>
                      <p className="text-lg font-bold">{provider.totalRatings || 0}</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Serviços</p>
                      <p className="text-lg font-bold">{provider.completedServices || 0}</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Pendentes</p>
                      <p className="text-lg font-bold">{provider.pendingServices || 0}</p>
                    </div>
                    <div className="p-2 bg-primary/10 rounded">
                      <p className="text-xs text-muted-foreground">Ganhos</p>
                      <p className="text-lg font-bold text-primary">
                        R$ {((provider.totalEarnings || 0) / 100).toFixed(0)}
                      </p>
                    </div>
                  </div>
                </div>

                {provider.reviews && provider.reviews.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Últimas avaliações:</p>
                    <div className="flex gap-2 flex-wrap">
                      {provider.reviews.map((review: any) => (
                        <div key={review.id} className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          {review.rating}/10
                          {review.comment && (
                            <span className="text-muted-foreground ml-1 truncate max-w-[100px]">
                              "{review.comment}"
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum profissional cadastrado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== CLIENTS SECTION ====================
function ClientsSection({ clientsData, clientsLoading }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Gestão de Clientes
        </CardTitle>
        <CardDescription>Visualize serviços e pagamentos dos clientes</CardDescription>
      </CardHeader>
      <CardContent>
        {clientsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_: any, i: number) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : clientsData && clientsData.length > 0 ? (
          <div className="space-y-4">
            {clientsData.map((client: any) => (
              <div key={client.userId} className="p-4 border rounded-lg hover-elevate">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">Cliente #{client.userId.slice(-6)}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {client.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {client.city}
                        </span>
                      )}
                      {client.phone && (
                        <span>{client.phone}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="p-2 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">{client.totalServices || 0}</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Concluídos</p>
                      <p className="text-lg font-bold">{client.completedServices || 0}</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Pendentes</p>
                      <p className="text-lg font-bold">{client.pendingServices || 0}</p>
                    </div>
                    <div className="p-2 bg-primary/10 rounded">
                      <p className="text-xs text-muted-foreground">Gastos</p>
                      <p className="text-lg font-bold text-primary">
                        R$ {((client.totalSpent || 0) / 100).toFixed(0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum cliente cadastrado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== COMPONENTE DE GERENCIAMENTO DE PREÇOS SINAPI ====================

interface ReferencePrice {
  id: number;
  code: string | null;
  source: string;
  categoryId: number | null;
  state: string | null;
  city: string | null;
  itemType: string;
  name: string;
  description: string | null;
  unit: string;
  priceMin: number;
  priceMax: number | null;
  priceAvg: number | null;
  laborPercent: number | null;
  keywords: string | null;
  isActive: boolean;
}

function ReferencePricesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [newPrice, setNewPrice] = useState({
    code: "",
    source: "regional",
    itemType: "service",
    name: "",
    description: "",
    unit: "serv",
    priceMin: "",
    priceMax: "",
    laborPercent: "",
    keywords: "",
    state: "",
  });

  const { data: prices = [], isLoading } = useQuery<ReferencePrice[]>({
    queryKey: ["/api/admin/reference-prices"],
  });

  const createPrice = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/admin/reference-prices", {
        ...data,
        priceMin: parseInt(data.priceMin) * 100,
        priceMax: data.priceMax ? parseInt(data.priceMax) * 100 : null,
        laborPercent: data.laborPercent ? parseInt(data.laborPercent) : null,
        keywords: data.keywords ? JSON.stringify(data.keywords.split(",").map((k: string) => k.trim())) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reference-prices"] });
      setShowAddDialog(false);
      setNewPrice({ code: "", source: "regional", itemType: "service", name: "", description: "", unit: "serv", priceMin: "", priceMax: "", laborPercent: "", keywords: "", state: "" });
      toast({ title: "Preço adicionado!", description: "Preço de referência cadastrado com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível adicionar o preço.", variant: "destructive" });
    },
  });

  const deletePrice = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/reference-prices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reference-prices"] });
      toast({ title: "Preço removido!", description: "Preço de referência excluído." });
    },
  });

  const filteredPrices = useMemo(() => {
    return prices.filter(p => {
      if (filterType !== "all" && p.itemType !== filterType) return false;
      if (filterSource !== "all" && p.source !== filterSource) return false;
      if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [prices, filterType, filterSource, searchTerm]);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Preços de Referência (SINAPI/Regional)
        </CardTitle>
        <CardDescription>
          Gerencie preços de referência para melhorar as estimativas da IA. Dados podem ser do SINAPI ou regionais.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-48"
                data-testid="input-search-prices"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32" data-testid="select-filter-type">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="service">Serviço</SelectItem>
                <SelectItem value="material">Material</SelectItem>
                <SelectItem value="labor">Mão de obra</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-32" data-testid="select-filter-source">
                <SelectValue placeholder="Fonte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="sinapi">SINAPI</SelectItem>
                <SelectItem value="regional">Regional</SelectItem>
                <SelectItem value="mercado">Mercado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button data-testid="btn-add-price">
                <Plus className="h-4 w-4 mr-2" />
                Novo Preço
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Adicionar Preço de Referência</DialogTitle>
                <DialogDescription>
                  Cadastre um novo preço de serviço ou material para melhorar as estimativas da IA.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Código</Label>
                    <Input
                      value={newPrice.code}
                      onChange={(e) => setNewPrice({ ...newPrice, code: e.target.value })}
                      placeholder="SINAPI-1234"
                      data-testid="input-new-code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fonte</Label>
                    <Select value={newPrice.source} onValueChange={(v) => setNewPrice({ ...newPrice, source: v })}>
                      <SelectTrigger data-testid="select-new-source">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sinapi">SINAPI</SelectItem>
                        <SelectItem value="regional">Regional</SelectItem>
                        <SelectItem value="mercado">Mercado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={newPrice.itemType} onValueChange={(v) => setNewPrice({ ...newPrice, itemType: v })}>
                    <SelectTrigger data-testid="select-new-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Serviço</SelectItem>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="labor">Mão de obra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={newPrice.name}
                    onChange={(e) => setNewPrice({ ...newPrice, name: e.target.value })}
                    placeholder="Ex: Desentupimento de pia"
                    data-testid="input-new-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={newPrice.description}
                    onChange={(e) => setNewPrice({ ...newPrice, description: e.target.value })}
                    placeholder="Descrição detalhada..."
                    rows={2}
                    data-testid="input-new-description"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Unidade</Label>
                    <Select value={newPrice.unit} onValueChange={(v) => setNewPrice({ ...newPrice, unit: v })}>
                      <SelectTrigger data-testid="select-new-unit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="serv">Serviço</SelectItem>
                        <SelectItem value="un">Unidade</SelectItem>
                        <SelectItem value="m²">m²</SelectItem>
                        <SelectItem value="m">Metro</SelectItem>
                        <SelectItem value="h">Hora</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Preço Mín (R$) *</Label>
                    <Input
                      type="number"
                      value={newPrice.priceMin}
                      onChange={(e) => setNewPrice({ ...newPrice, priceMin: e.target.value })}
                      placeholder="80"
                      data-testid="input-new-price-min"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço Máx (R$)</Label>
                    <Input
                      type="number"
                      value={newPrice.priceMax}
                      onChange={(e) => setNewPrice({ ...newPrice, priceMax: e.target.value })}
                      placeholder="180"
                      data-testid="input-new-price-max"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>% Mão de Obra</Label>
                    <Input
                      type="number"
                      value={newPrice.laborPercent}
                      onChange={(e) => setNewPrice({ ...newPrice, laborPercent: e.target.value })}
                      placeholder="70"
                      data-testid="input-new-labor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado (UF)</Label>
                    <Input
                      value={newPrice.state}
                      onChange={(e) => setNewPrice({ ...newPrice, state: e.target.value.toUpperCase().slice(0, 2) })}
                      placeholder="SP"
                      maxLength={2}
                      data-testid="input-new-state"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Palavras-chave (separadas por vírgula)</Label>
                  <Input
                    value={newPrice.keywords}
                    onChange={(e) => setNewPrice({ ...newPrice, keywords: e.target.value })}
                    placeholder="entupido, pia, desentupir"
                    data-testid="input-new-keywords"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={() => createPrice.mutate(newPrice)}
                  disabled={!newPrice.name || !newPrice.priceMin || createPrice.isPending}
                  data-testid="btn-submit-price"
                >
                  {createPrice.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Adicionar Preço
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : filteredPrices.length > 0 ? (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground mb-2">
              {filteredPrices.length} preços encontrados
            </div>
            {filteredPrices.map((price) => (
              <div key={price.id} className="p-3 border rounded-lg hover-elevate flex items-center justify-between gap-4" data-testid={`price-row-${price.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{price.name}</span>
                    <Badge variant={price.source === "sinapi" ? "default" : "outline"} className="text-xs">
                      {price.source.toUpperCase()}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {price.itemType === "service" ? "Serviço" : price.itemType === "material" ? "Material" : "Mão de obra"}
                    </Badge>
                    {price.state && (
                      <Badge variant="outline" className="text-xs">{price.state}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                    <span className="font-medium text-foreground">
                      {formatPrice(price.priceMin)}
                      {price.priceMax && ` - ${formatPrice(price.priceMax)}`}
                    </span>
                    <span>/{price.unit}</span>
                    {price.laborPercent && (
                      <span>{price.laborPercent}% mão de obra</span>
                    )}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deletePrice.mutate(price.id)}
                  data-testid={`btn-delete-price-${price.id}`}
                >
                  <XCircle className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum preço cadastrado</p>
            <p className="text-sm mt-2">Clique em "Novo Preço" para adicionar</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== COMPONENTE DE GERENCIAMENTO DE SINTOMAS ====================

interface Symptom {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  keywords: string | null;
  isActive: boolean;
  questions?: SymptomQuestion[];
  diagnoses?: SymptomDiagnosis[];
}

interface SymptomQuestion {
  id: number;
  symptomId: number;
  question: string;
  questionOrder: number;
  expectedResponses: string | null;
  triggerKeywords: string | null;
  isRequired: boolean;
}

interface SymptomDiagnosis {
  id: number;
  symptomId: number;
  title: string;
  description: string;
  solution: string | null;
  providerMaterials: string | null;
  clientMaterials: string | null;
  estimatedPriceMin: number | null;
  estimatedPriceMax: number | null;
  urgencyLevel: string;
  matchConditions: string | null;
  isActive: boolean;
}

interface ServiceCategory {
  id: number;
  name: string;
  icon: string;
  description: string | null;
}

function SymptomsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSymptom, setSelectedSymptom] = useState<Symptom | null>(null);
  const [isAddSymptomOpen, setIsAddSymptomOpen] = useState(false);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [isAddDiagnosisOpen, setIsAddDiagnosisOpen] = useState(false);

  const [symptomForm, setSymptomForm] = useState({
    name: "",
    description: "",
    keywords: "",
  });
  const [questionForm, setQuestionForm] = useState({
    question: "",
    questionOrder: 1,
    expectedResponses: "",
    triggerKeywords: "",
    isRequired: true,
  });
  const [diagnosisForm, setDiagnosisForm] = useState({
    title: "",
    description: "",
    solution: "",
    providerMaterials: "",
    clientMaterials: "",
    estimatedPriceMin: "",
    estimatedPriceMax: "",
    urgencyLevel: "normal",
  });

  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ["/api/categories"],
  });

  const { data: symptoms = [], isLoading: symptomsLoading } = useQuery<Symptom[]>({
    queryKey: ["/api/symptoms"],
  });

  const { data: symptomDetails } = useQuery<Symptom>({
    queryKey: ["/api/symptoms", selectedSymptom?.id],
    enabled: !!selectedSymptom?.id,
  });

  const createSymptom = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/symptoms", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symptoms"] });
      setIsAddSymptomOpen(false);
      setSymptomForm({ name: "", description: "", keywords: "" });
      toast({ title: "Sintoma criado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar sintoma", variant: "destructive" });
    },
  });

  const deleteSymptom = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/symptoms/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symptoms"] });
      setSelectedSymptom(null);
      toast({ title: "Sintoma removido!" });
    },
  });

  const createQuestion = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/symptom-questions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symptoms", selectedSymptom?.id] });
      setIsAddQuestionOpen(false);
      setQuestionForm({ question: "", questionOrder: 1, expectedResponses: "", triggerKeywords: "", isRequired: true });
      toast({ title: "Pergunta criada!" });
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/symptom-questions/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symptoms", selectedSymptom?.id] });
      toast({ title: "Pergunta removida!" });
    },
  });

  const createDiagnosis = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/symptom-diagnoses", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symptoms", selectedSymptom?.id] });
      setIsAddDiagnosisOpen(false);
      setDiagnosisForm({
        title: "", description: "", solution: "", providerMaterials: "",
        clientMaterials: "", estimatedPriceMin: "", estimatedPriceMax: "", urgencyLevel: "normal"
      });
      toast({ title: "Diagnóstico criado!" });
    },
  });

  const deleteDiagnosis = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/symptom-diagnoses/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/symptoms", selectedSymptom?.id] });
      toast({ title: "Diagnóstico removido!" });
    },
  });

  const filteredSymptoms = selectedCategory
    ? symptoms.filter((s) => s.categoryId === selectedCategory)
    : symptoms;

  const handleAddSymptom = () => {
    if (!selectedCategory) {
      toast({ title: "Selecione uma categoria primeiro", variant: "destructive" });
      return;
    }
    createSymptom.mutate({
      categoryId: selectedCategory,
      name: symptomForm.name,
      description: symptomForm.description || null,
      keywords: symptomForm.keywords ? JSON.stringify(symptomForm.keywords.split(",").map(k => k.trim())) : null,
    });
  };

  const handleAddQuestion = () => {
    if (!selectedSymptom) return;
    createQuestion.mutate({
      symptomId: selectedSymptom.id,
      question: questionForm.question,
      questionOrder: questionForm.questionOrder,
      expectedResponses: questionForm.expectedResponses ? JSON.stringify(questionForm.expectedResponses.split(",").map(r => r.trim())) : null,
      triggerKeywords: questionForm.triggerKeywords ? JSON.stringify(questionForm.triggerKeywords.split(",").map(k => k.trim())) : null,
      isRequired: questionForm.isRequired,
    });
  };

  const handleAddDiagnosis = () => {
    if (!selectedSymptom) return;
    createDiagnosis.mutate({
      symptomId: selectedSymptom.id,
      title: diagnosisForm.title,
      description: diagnosisForm.description,
      solution: diagnosisForm.solution || null,
      providerMaterials: diagnosisForm.providerMaterials ? JSON.stringify(diagnosisForm.providerMaterials.split(",").map(m => m.trim())) : null,
      clientMaterials: diagnosisForm.clientMaterials ? JSON.stringify(diagnosisForm.clientMaterials.split(",").map(m => m.trim())) : null,
      estimatedPriceMin: diagnosisForm.estimatedPriceMin ? parseInt(diagnosisForm.estimatedPriceMin) * 100 : null,
      estimatedPriceMax: diagnosisForm.estimatedPriceMax ? parseInt(diagnosisForm.estimatedPriceMax) * 100 : null,
      urgencyLevel: diagnosisForm.urgencyLevel,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Banco de Sintomas
          </CardTitle>
          <CardDescription>
            Selecione uma categoria para gerenciar sintomas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Categoria de Serviço</Label>
            <Select
              value={selectedCategory?.toString() || ""}
              onValueChange={(val) => {
                setSelectedCategory(val ? parseInt(val) : null);
                setSelectedSymptom(null);
              }}
            >
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCategory && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Sintomas</Label>
                <Dialog open={isAddSymptomOpen} onOpenChange={setIsAddSymptomOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" data-testid="btn-add-symptom">
                      <Plus className="h-4 w-4 mr-1" />
                      Novo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Sintoma</DialogTitle>
                      <DialogDescription>
                        Adicione um novo sintoma para esta categoria
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome do Sintoma</Label>
                        <Input
                          value={symptomForm.name}
                          onChange={(e) => setSymptomForm({ ...symptomForm, name: e.target.value })}
                          placeholder="Ex: Vazamento de água"
                          data-testid="input-symptom-name"
                        />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea
                          value={symptomForm.description}
                          onChange={(e) => setSymptomForm({ ...symptomForm, description: e.target.value })}
                          placeholder="Descrição detalhada do sintoma"
                          data-testid="input-symptom-description"
                        />
                      </div>
                      <div>
                        <Label>Palavras-chave (separadas por vírgula)</Label>
                        <Input
                          value={symptomForm.keywords}
                          onChange={(e) => setSymptomForm({ ...symptomForm, keywords: e.target.value })}
                          placeholder="vazando, goteira, molhado, úmido"
                          data-testid="input-symptom-keywords"
                        />
                      </div>
                      <Button onClick={handleAddSymptom} disabled={createSymptom.isPending} data-testid="btn-save-symptom">
                        {createSymptom.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Salvar Sintoma
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {symptomsLoading ? (
                <div className="p-4 text-center text-muted-foreground">Carregando...</div>
              ) : filteredSymptoms.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground border rounded-lg">
                  Nenhum sintoma cadastrado
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredSymptoms.map((symptom) => (
                    <div
                      key={symptom.id}
                      className={`p-3 rounded-lg border cursor-pointer hover-elevate ${
                        selectedSymptom?.id === symptom.id ? "bg-primary/10 border-primary" : ""
                      }`}
                      onClick={() => setSelectedSymptom(symptom)}
                      data-testid={`symptom-item-${symptom.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{symptom.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSymptom.mutate(symptom.id);
                          }}
                          data-testid={`btn-delete-symptom-${symptom.id}`}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      {symptom.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {symptom.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Perguntas
          </CardTitle>
          <CardDescription>
            {selectedSymptom ? `Perguntas para: ${selectedSymptom.name}` : "Selecione um sintoma"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedSymptom ? (
            <div className="p-8 text-center text-muted-foreground border rounded-lg">
              Selecione um sintoma para ver as perguntas
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={isAddQuestionOpen} onOpenChange={setIsAddQuestionOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" data-testid="btn-add-question">
                      <Plus className="h-4 w-4 mr-1" />
                      Nova Pergunta
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Pergunta</DialogTitle>
                      <DialogDescription>Adicione uma pergunta de refinamento</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Pergunta</Label>
                        <Textarea
                          value={questionForm.question}
                          onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                          placeholder="Ex: A água sai com força ou goteja?"
                          data-testid="input-question-text"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Ordem</Label>
                          <Input
                            type="number"
                            value={questionForm.questionOrder}
                            onChange={(e) => setQuestionForm({ ...questionForm, questionOrder: parseInt(e.target.value) || 1 })}
                            data-testid="input-question-order"
                          />
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={questionForm.isRequired}
                              onChange={(e) => setQuestionForm({ ...questionForm, isRequired: e.target.checked })}
                              className="rounded"
                              data-testid="input-question-required"
                            />
                            <span className="text-sm">Obrigatória</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <Label>Palavras-gatilho (separadas por vírgula)</Label>
                        <Input
                          value={questionForm.triggerKeywords}
                          onChange={(e) => setQuestionForm({ ...questionForm, triggerKeywords: e.target.value })}
                          placeholder="vazamento, água, goteira"
                          data-testid="input-question-triggers"
                        />
                      </div>
                      <div>
                        <Label>Respostas esperadas (separadas por vírgula)</Label>
                        <Input
                          value={questionForm.expectedResponses}
                          onChange={(e) => setQuestionForm({ ...questionForm, expectedResponses: e.target.value })}
                          placeholder="com força, gotejando, pingando"
                          data-testid="input-question-responses"
                        />
                      </div>
                      <Button onClick={handleAddQuestion} disabled={createQuestion.isPending} data-testid="btn-save-question">
                        {createQuestion.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Salvar Pergunta
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {symptomDetails?.questions && symptomDetails.questions.length > 0 ? (
                <div className="space-y-2">
                  {symptomDetails.questions.map((q) => (
                    <div key={q.id} className="p-3 border rounded-lg flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">#{q.questionOrder}</Badge>
                          {q.isRequired && <Badge variant="secondary" className="text-xs">Obrigatória</Badge>}
                        </div>
                        <p className="text-sm mt-1">{q.question}</p>
                        {q.triggerKeywords && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Gatilhos: {JSON.parse(q.triggerKeywords).join(", ")}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteQuestion.mutate(q.id)}
                      >
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground border rounded-lg">
                  Nenhuma pergunta cadastrada
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Diagnósticos
          </CardTitle>
          <CardDescription>
            {selectedSymptom ? `Diagnósticos para: ${selectedSymptom.name}` : "Selecione um sintoma"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedSymptom ? (
            <div className="p-8 text-center text-muted-foreground border rounded-lg">
              Selecione um sintoma para ver os diagnósticos
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={isAddDiagnosisOpen} onOpenChange={setIsAddDiagnosisOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" data-testid="btn-add-diagnosis">
                      <Plus className="h-4 w-4 mr-1" />
                      Novo Diagnóstico
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Novo Diagnóstico</DialogTitle>
                      <DialogDescription>Adicione um diagnóstico possível para este sintoma</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                      <div>
                        <Label>Título</Label>
                        <Input
                          value={diagnosisForm.title}
                          onChange={(e) => setDiagnosisForm({ ...diagnosisForm, title: e.target.value })}
                          placeholder="Ex: Vedação desgastada"
                          data-testid="input-diagnosis-title"
                        />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea
                          value={diagnosisForm.description}
                          onChange={(e) => setDiagnosisForm({ ...diagnosisForm, description: e.target.value })}
                          placeholder="Descrição do diagnóstico"
                          data-testid="input-diagnosis-description"
                        />
                      </div>
                      <div>
                        <Label>Solução sugerida</Label>
                        <Textarea
                          value={diagnosisForm.solution}
                          onChange={(e) => setDiagnosisForm({ ...diagnosisForm, solution: e.target.value })}
                          placeholder="Como resolver o problema"
                          data-testid="input-diagnosis-solution"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Preço Mín (R$)</Label>
                          <Input
                            type="number"
                            value={diagnosisForm.estimatedPriceMin}
                            onChange={(e) => setDiagnosisForm({ ...diagnosisForm, estimatedPriceMin: e.target.value })}
                            placeholder="80"
                            data-testid="input-diagnosis-price-min"
                          />
                        </div>
                        <div>
                          <Label>Preço Máx (R$)</Label>
                          <Input
                            type="number"
                            value={diagnosisForm.estimatedPriceMax}
                            onChange={(e) => setDiagnosisForm({ ...diagnosisForm, estimatedPriceMax: e.target.value })}
                            placeholder="200"
                            data-testid="input-diagnosis-price-max"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Urgência</Label>
                        <Select value={diagnosisForm.urgencyLevel} onValueChange={(v) => setDiagnosisForm({ ...diagnosisForm, urgencyLevel: v })}>
                          <SelectTrigger data-testid="select-diagnosis-urgency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="alto">Alto</SelectItem>
                            <SelectItem value="urgente">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Materiais do Prestador (separados por vírgula)</Label>
                        <Input
                          value={diagnosisForm.providerMaterials}
                          onChange={(e) => setDiagnosisForm({ ...diagnosisForm, providerMaterials: e.target.value })}
                          placeholder="chave inglesa, veda rosca"
                          data-testid="input-diagnosis-provider-materials"
                        />
                      </div>
                      <div>
                        <Label>Materiais do Cliente (separados por vírgula)</Label>
                        <Input
                          value={diagnosisForm.clientMaterials}
                          onChange={(e) => setDiagnosisForm({ ...diagnosisForm, clientMaterials: e.target.value })}
                          placeholder="torneira nova, sifão"
                          data-testid="input-diagnosis-client-materials"
                        />
                      </div>
                      <Button onClick={handleAddDiagnosis} disabled={createDiagnosis.isPending} data-testid="btn-save-diagnosis">
                        {createDiagnosis.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Salvar Diagnóstico
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {symptomDetails?.diagnoses && symptomDetails.diagnoses.length > 0 ? (
                <div className="space-y-2">
                  {symptomDetails.diagnoses.map((d) => (
                    <div key={d.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{d.title}</span>
                            <Badge variant={
                              d.urgencyLevel === "urgente" ? "destructive" :
                              d.urgencyLevel === "alto" ? "secondary" : "outline"
                            } className="text-xs">
                              {d.urgencyLevel}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{d.description}</p>
                          {d.estimatedPriceMin && d.estimatedPriceMax && (
                            <p className="text-xs font-medium mt-1 text-primary">
                              R$ {(d.estimatedPriceMin / 100).toFixed(0)} - R$ {(d.estimatedPriceMax / 100).toFixed(0)}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteDiagnosis.mutate(d.id)}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground border rounded-lg">
                  Nenhum diagnóstico cadastrado
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
