import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, ArrowLeft, CheckCircle2, KeyRound, Lock, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email });
      setEmailSent(true);
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar o email. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="p-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Início
          </Button>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-8 pb-8">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-6">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Email Enviado!</h2>
              <p className="text-muted-foreground mb-6">
                Enviamos instruções para <strong>{email}</strong>. 
                Verifique sua caixa de entrada e spam.
              </p>
              <Button 
                variant="outline"
                onClick={() => setLocation("/login/cliente")}
                data-testid="button-back-login"
              >
                Voltar para login
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/")}
          className="gap-2"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
            <CardDescription>
              Informe seu email para receber instruções de recuperação
            </CardDescription>
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-email"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full rounded-xl h-12"
                disabled={isLoading || !email}
                data-testid="button-submit"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Enviar Instruções"
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Lembrou a senha?{" "}
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="p-0 h-auto text-primary hover:underline"
                  onClick={() => setLocation("/login/cliente")}
                >
                  Fazer login
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const token = new URLSearchParams(window.location.search).get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await apiRequest("POST", "/api/auth/reset-password", {
        token,
        password: formData.password,
      });
      setSuccess(true);
      toast({
        title: "Senha alterada!",
        description: "Sua senha foi redefinida com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Token inválido ou expirado. Solicite uma nova recuperação.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Senha Alterada!</h2>
            <p className="text-muted-foreground mb-6">
              Sua senha foi redefinida com sucesso. Faça login com sua nova senha.
            </p>
            <Button onClick={() => setLocation("/login/cliente")}>
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <h2 className="text-2xl font-bold mb-2">Link Inválido</h2>
            <p className="text-muted-foreground mb-6">
              Este link de recuperação é inválido ou expirou.
            </p>
            <Button onClick={() => setLocation("/recuperar-senha")}>
              Solicitar Nova Recuperação
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Nova Senha</CardTitle>
          <CardDescription>Digite sua nova senha</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
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
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="********"
                  className="pl-10"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full rounded-xl h-12"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Redefinir Senha"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
