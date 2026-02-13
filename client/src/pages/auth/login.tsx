import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowLeft, User, Wrench, Settings } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface LoginPageProps {
  userType: "client" | "provider" | "admin";
}

export default function LoginPage({ userType }: LoginPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/login", formData);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao fazer login");
      }

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);

      queryClient.setQueryData(["/api/auth/user"], data.user);

      toast({
        title: "Login realizado!",
        description: `Bem-vindo(a) de volta, ${data.user.firstName}!`,
      });

      const redirectPath = data.user.role === "admin" ? "/admin" : 
                          data.user.role === "provider" ? "/provider" : "/client";
      setLocation(redirectPath);
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message || "Email ou senha incorretos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isClient = userType === "client";
  const isAdmin = userType === "admin";
  const title = isAdmin ? "Área Administrativa" : isClient ? "Área do Cliente" : "Área do Prestador";
  const icon = isAdmin ? <Settings className="h-8 w-8" /> : isClient ? <User className="h-8 w-8" /> : <Wrench className="h-8 w-8" />;
  const registerPath = isClient ? "/cadastro/cliente" : "/cadastro/prestador";
  const gradientClass = isAdmin 
    ? "from-gray-700 to-gray-900"
    : isClient 
    ? "from-primary to-primary/80" 
    : "from-accent to-accent/80";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/")}
          className="gap-2"
          data-testid="button-back-home"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-2">
            <div className={`mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white mb-4`}>
              {icon}
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>Entre com sua conta para continuar</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    className="pl-10 pr-10"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="text-right">
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="p-0 h-auto text-sm text-primary hover:underline"
                  onClick={() => setLocation("/recuperar-senha")}
                  data-testid="link-forgot-password"
                >
                  Esqueceu a senha?
                </Button>
              </div>

              <Button 
                type="submit" 
                className="w-full rounded-xl h-12"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Entrar"
                )}
              </Button>

              {!isAdmin && (
                <div className="text-center text-sm text-muted-foreground">
                  Não tem conta?{" "}
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="p-0 h-auto text-primary hover:underline"
                    onClick={() => setLocation(registerPath)}
                    data-testid="link-register"
                  >
                    Criar conta
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export function ClientLoginPage() {
  return <LoginPage userType="client" />;
}

export function ProviderLoginPage() {
  return <LoginPage userType="provider" />;
}

export function AdminLoginPage() {
  return <LoginPage userType="admin" />;
}
