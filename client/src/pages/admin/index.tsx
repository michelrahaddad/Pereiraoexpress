import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { LoadingSkeleton, CardSkeleton } from "@/components/loading-skeleton";
import { 
  Users, 
  Wrench, 
  DollarSign, 
  TrendingUp,
  MessageSquare,
  Star,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3
} from "lucide-react";
import type { ServiceRequest, ServiceCategory } from "@shared/schema";
import type { User } from "@shared/models/auth";

interface DashboardStats {
  totalUsers: number;
  totalProviders: number;
  totalServices: number;
  completedServices: number;
  pendingServices: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated,
  });
  
  const { data: recentServices, isLoading: servicesLoading } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/admin/services"],
    enabled: isAuthenticated,
  });
  
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated,
  });

  const { data: categories } = useQuery<ServiceCategory[]>({
    queryKey: ["/api/categories"],
    enabled: isAuthenticated,
  });

  if (authLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingSkeleton />
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    pending: "Aguardando",
    diagnosed: "Diagnosticado",
    waiting_provider: "Buscando profissional",
    accepted: "Aceito",
    in_progress: "Em andamento",
    completed: "Concluído",
    cancelled: "Cancelado",
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Painel Administrativo</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema Pereirão Express
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Usuários</p>
                  <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Prestadores</p>
                  <p className="text-2xl font-bold">{stats?.totalProviders || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <Wrench className="h-5 w-5 text-accent-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Serviços</p>
                  <p className="text-2xl font-bold">{stats?.totalServices || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Receita Mensal</p>
                  <p className="text-2xl font-bold">
                    R$ {((stats?.monthlyRevenue || 0) / 100).toFixed(0)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-accent-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Resumo de Serviços
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">{stats?.pendingServices || 0}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-2">
                    <Wrench className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <p className="text-2xl font-bold">
                    {(stats?.totalServices || 0) - (stats?.completedServices || 0) - (stats?.pendingServices || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Em andamento</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">{stats?.completedServices || 0}</p>
                  <p className="text-sm text-muted-foreground">Concluídos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                IA Diagnósticos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Precisão média</span>
                  <Badge variant="secondary">92%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Diagnósticos hoje</span>
                  <Badge variant="secondary">24</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Tempo médio</span>
                  <Badge variant="secondary">1.2s</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="services" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="services" data-testid="tab-admin-services">Serviços Recentes</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-admin-users">Usuários</TabsTrigger>
            <TabsTrigger value="categories" data-testid="tab-admin-categories">Categorias</TabsTrigger>
          </TabsList>
          
          <TabsContent value="services">
            <Card>
              <CardContent className="p-0">
                {servicesLoading ? (
                  <div className="p-4">
                    <CardSkeleton />
                  </div>
                ) : recentServices && recentServices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>SLA</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentServices.slice(0, 10).map(service => (
                        <TableRow key={service.id}>
                          <TableCell className="font-mono">#{service.id}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{service.title}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {statusLabels[service.status] || service.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={service.slaPriority === "urgent" ? "destructive" : "outline"}>
                              {service.slaPriority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            R$ {((service.estimatedPrice || 0) / 100).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {new Date(service.createdAt!).toLocaleDateString("pt-BR")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhum serviço encontrado
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="users">
            <Card>
              <CardContent className="p-0">
                {usersLoading ? (
                  <div className="p-4">
                    <CardSkeleton />
                  </div>
                ) : users && users.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Desde</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map(u => (
                        <TableRow key={u.id}>
                          <TableCell>{u.firstName} {u.lastName}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-BR") : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhum usuário encontrado
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="categories">
            <Card>
              <CardContent className="p-0">
                {categories && categories.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Preço Base</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map(cat => (
                        <TableRow key={cat.id}>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell className="max-w-[300px] truncate">{cat.description}</TableCell>
                          <TableCell>
                            R$ {((cat.basePrice || 0) / 100).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhuma categoria cadastrada
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
