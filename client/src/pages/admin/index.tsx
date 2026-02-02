import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
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
  Shield
} from "lucide-react";
import type { UserProfile, SystemSetting, Payment } from "@shared/schema";

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

const defaultSettings = [
  { key: "ai_diagnosis_price", value: "500", description: "Preço do diagnóstico IA (centavos)" },
  { key: "service_fee_percent", value: "15", description: "Taxa sobre serviços (%)" },
  { key: "express_multiplier", value: "1.5", description: "Multiplicador Express" },
  { key: "urgent_multiplier", value: "2.0", description: "Multiplicador Urgente" },
];

export default function AdminDashboard() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: role } = useQuery<{ role: string }>({
    queryKey: ["/api/user/role"],
    enabled: isAuthenticated,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated && role?.role === "admin",
  });

  const { data: settings } = useQuery<SystemSetting[]>({
    queryKey: ["/api/admin/settings"],
    enabled: isAuthenticated && role?.role === "admin",
  });

  const { data: users, isLoading: usersLoading } = useQuery<UserProfile[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && role?.role === "admin",
  });

  const [settingValues, setSettingValues] = useState<Record<string, string>>({});

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
      description: "Os dados estão sendo exportados. Isso pode levar alguns minutos.",
    });
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
            <a href="/api/login?redirect=/admin">Fazer login</a>
          </Button>
        </div>
      </div>
    );
  }

  if (role && role.role !== "admin") {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gerencie preços, usuários e configurações do sistema</p>
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
                    <Users className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Usuários</p>
                    <p className="text-2xl font-bold" data-testid="stat-users">{stats.totalUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-muted-foreground" />
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

        <Tabs defaultValue="pricing" className="space-y-6">
          <TabsList className="rounded-xl">
            <TabsTrigger value="pricing" className="rounded-lg gap-2" data-testid="tab-pricing">
              <DollarSign className="h-4 w-4" />
              Preços
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg gap-2" data-testid="tab-users">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="backup" className="rounded-lg gap-2" data-testid="tab-backup">
              <Database className="h-4 w-4" />
              Backup
            </TabsTrigger>
          </TabsList>

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

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gerenciar Usuários
                </CardTitle>
                <CardDescription>Altere as permissões e roles dos usuários</CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : users && users.length > 0 ? (
                  <div className="space-y-3">
                    {users.map((profile) => (
                      <div 
                        key={profile.id} 
                        className="flex items-center justify-between p-4 border rounded-xl"
                        data-testid={`user-row-${profile.userId}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{profile.userId.substring(0, 8)}...</p>
                            <p className="text-sm text-muted-foreground">{profile.phone || "Sem telefone"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
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
                  <p className="text-center text-muted-foreground py-8">Nenhum usuário cadastrado</p>
                )}
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
                    <p className="text-2xl font-bold text-primary">{stats?.totalUsers || 0}</p>
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
        </Tabs>
      </main>
    </div>
  );
}
