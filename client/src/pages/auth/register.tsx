import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { CityAutocomplete } from "@/components/city-autocomplete";
import { 
  Eye, EyeOff, Loader2, Mail, Lock, ArrowLeft, User, Wrench,
  Phone, Calendar, CreditCard, CheckCircle2, AlertCircle, Upload, FileText, Shield, MapPin, Search, DollarSign
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface RegisterPageProps {
  userType: "client" | "provider";
}

function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
}

function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
}

function formatCEP(value: string): string {
  const numbers = value.replace(/\D/g, "").slice(0, 8);
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
}

function PasswordStrengthIndicator({ password }: { password: string }) {
  const checks = [
    { label: "8+ caracteres", valid: password.length >= 8 },
    { label: "Letra maiúscula", valid: /[A-Z]/.test(password) },
    { label: "Letra minúscula", valid: /[a-z]/.test(password) },
    { label: "Número", valid: /[0-9]/.test(password) },
    { label: "Caractere especial", valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const validCount = checks.filter(c => c.valid).length;
  const strength = validCount === 5 ? "Forte" : validCount >= 3 ? "Média" : "Fraca";
  const strengthColor = validCount === 5 ? "text-green-500" : validCount >= 3 ? "text-yellow-500" : "text-red-500";

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${validCount === 5 ? "bg-green-500" : validCount >= 3 ? "bg-yellow-500" : "bg-red-500"}`}
            style={{ width: `${(validCount / 5) * 100}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${strengthColor}`}>{strength}</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center gap-1 text-xs">
            {check.valid ? (
              <CheckCircle2 className="h-3 w-3 text-green-500" />
            ) : (
              <AlertCircle className="h-3 w-3 text-muted-foreground" />
            )}
            <span className={check.valid ? "text-green-500" : "text-muted-foreground"}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RegisterPage({ userType }: RegisterPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isProvider = userType === "provider";
  const totalSteps = isProvider ? 5 : 3;
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    cpf: "",
    phone: "",
    age: "",
    city: "",
    cep: "",
    state: "",
    neighborhood: "",
    password: "",
    confirmPassword: "",
    documentFile: null as File | null,
    documentPreview: "",
    termsAccepted: false,
    pixKeyType: "",
    pixKey: "",
    bankName: "",
    bankAgency: "",
    bankAccount: "",
  });
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  const fetchCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    setIsFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          city: data.localidade || prev.city,
          state: data.uf || "",
          neighborhood: data.bairro || "",
        }));
        toast({
          title: "Endereço encontrado",
          description: `${data.localidade} - ${data.uf}`,
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP digitado.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erro ao buscar CEP",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleCepChange = (value: string) => {
    const formatted = formatCEP(value);
    setFormData(prev => ({ ...prev, cep: formatted }));
    const clean = value.replace(/\D/g, "");
    if (clean.length === 8) {
      fetchCep(clean);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O documento deve ter no máximo 10MB",
          variant: "destructive",
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ 
          ...formData, 
          documentFile: file,
          documentPreview: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "As senhas digitadas são diferentes",
        variant: "destructive",
      });
      return;
    }

    if (isProvider && !formData.termsAccepted) {
      toast({
        title: "Aceite os termos",
        description: "Você precisa aceitar os termos para continuar",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const fullCity = formData.state ? `${formData.city} - ${formData.state}` : formData.city;
      const requestData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        cpf: formData.cpf,
        phone: formData.phone,
        age: parseInt(formData.age),
        city: fullCity,
        cep: formData.cep.replace(/\D/g, ""),
        password: formData.password,
        role: userType,
      };

      if (isProvider) {
        requestData.termsAccepted = formData.termsAccepted;
        if (formData.documentPreview) {
          requestData.documentUrl = formData.documentPreview;
        }
        if (formData.pixKeyType && formData.pixKey) {
          requestData.pixKeyType = formData.pixKeyType;
          requestData.pixKey = formData.pixKey;
          requestData.bankName = formData.bankName || undefined;
          requestData.bankAgency = formData.bankAgency || undefined;
          requestData.bankAccount = formData.bankAccount || undefined;
        }
      }

      const response = await apiRequest("POST", "/api/auth/register", requestData);
      const data = await response.json();

      if (!response.ok) {
        if (data.code === "INVALID_DOCUMENT") {
          throw new Error(`Documento inválido: ${data.details || data.error}`);
        }
        throw new Error(data.error || data.details?.join(", ") || "Erro ao criar conta");
      }

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);

      queryClient.setQueryData(["/api/auth/user"], data.user);

      toast({
        title: "Conta criada!",
        description: isProvider 
          ? `Bem-vindo(a), ${data.user.firstName}! Seu documento foi verificado automaticamente.`
          : `Bem-vindo(a) ao Pereirão Express, ${data.user.firstName}!`,
      });

      const redirectPath = userType === "provider" ? "/provider" : "/client";
      setLocation(redirectPath);
    } catch (error: any) {
      toast({
        title: "Erro no cadastro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isClient = userType === "client";
  const title = isClient ? "Cadastro de Cliente" : "Cadastro de Prestador";
  const icon = isClient ? <User className="h-8 w-8" /> : <Wrench className="h-8 w-8" />;
  const loginPath = isClient ? "/login/cliente" : "/login/prestador";
  const gradientClass = isClient 
    ? "from-primary to-primary/80" 
    : "from-accent to-accent/80";

  const canProceedStep1 = formData.firstName && formData.lastName && formData.email;
  const canProceedStep2 = formData.cpf.length >= 14 && formData.phone.length >= 14 && formData.age && formData.city;
  const canProceedStep3Provider = formData.documentFile && formData.termsAccepted;

  const handleNextStep = () => {
    setStep(step + 1);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4">
        <Button 
          variant="ghost" 
          onClick={() => step > 1 ? setStep(step - 1) : setLocation("/")}
          className="gap-2"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
          {step > 1 ? "Voltar" : "Início"}
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-2">
            <div className={`mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white mb-4`}>
              {icon}
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>
              {step === 1 && "Informe seus dados pessoais"}
              {step === 2 && "Complete seu perfil"}
              {step === 3 && isProvider && "Envie seu documento"}
              {step === 3 && !isProvider && "Crie sua senha"}
              {step === 4 && isProvider && "Dados bancários para recebimento"}
              {step === 5 && isProvider && "Crie sua senha"}
            </CardDescription>
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div 
                  key={i}
                  className={`h-2 w-8 rounded-full transition-colors ${
                    i + 1 <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Nome</Label>
                      <Input
                        id="firstName"
                        placeholder="João"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                        data-testid="input-firstname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Sobrenome</Label>
                      <Input
                        id="lastName"
                        placeholder="Silva"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                        data-testid="input-lastname"
                      />
                    </div>
                  </div>

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

                  <Button 
                    type="button"
                    className="w-full rounded-xl h-12"
                    disabled={!canProceedStep1}
                    onClick={() => setStep(2)}
                    data-testid="button-next-step1"
                  >
                    Continuar
                  </Button>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="cpf"
                        placeholder="000.000.000-00"
                        className="pl-10"
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                        required
                        data-testid="input-cpf"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Celular</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="(00) 00000-0000"
                        className="pl-10"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                        required
                        data-testid="input-phone"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="age">Idade</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="age"
                        type="number"
                        min="18"
                        max="120"
                        placeholder="25"
                        className="pl-10"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        required
                        data-testid="input-age"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="cep"
                        placeholder="00000-000"
                        className="pl-10"
                        value={formData.cep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        data-testid="input-cep"
                      />
                      {isFetchingCep && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Digite o CEP para preencher a cidade automaticamente
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <CityAutocomplete
                        value={formData.city}
                        onChange={(value) => setFormData({ ...formData, city: value })}
                        placeholder="Buscar cidade..."
                        data-testid="select-city"
                      />
                    </div>
                    {formData.state && (
                      <div className="space-y-2">
                        <Label>Estado</Label>
                        <Input
                          value={formData.state}
                          disabled
                          className="bg-muted"
                          data-testid="input-state"
                        />
                      </div>
                    )}
                  </div>

                  <Button 
                    type="button"
                    className="w-full rounded-xl h-12"
                    disabled={!canProceedStep2}
                    onClick={handleNextStep}
                    data-testid="button-next-step2"
                  >
                    Continuar
                  </Button>
                </>
              )}

              {step === 3 && isProvider && (
                <>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-xl border border-dashed">
                      <div className="text-center space-y-3">
                        <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">Documento Oficial</h3>
                          <p className="text-sm text-muted-foreground">
                            Envie RG, CNH ou outro documento com foto
                          </p>
                        </div>
                        
                        {formData.documentPreview ? (
                          <div className="space-y-2">
                            <div className="relative mx-auto w-32 h-32 rounded-lg overflow-hidden border">
                              <img 
                                src={formData.documentPreview} 
                                alt="Preview do documento"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <p className="text-sm text-green-600 flex items-center justify-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              {formData.documentFile?.name}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              Trocar documento
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2"
                            onClick={() => fileInputRef.current?.click()}
                            data-testid="button-upload-document"
                          >
                            <Upload className="h-4 w-4" />
                            Selecionar arquivo
                          </Button>
                        )}
                        
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={handleFileChange}
                          data-testid="input-document"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-700">Verificação de Documento</p>
                          <p className="text-muted-foreground mt-1">
                            Seu documento será analisado por nossa equipe para verificar sua autenticidade. 
                            Este processo pode levar até 24 horas.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-xl">
                      <Checkbox
                        id="terms"
                        checked={formData.termsAccepted}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, termsAccepted: checked as boolean })
                        }
                        data-testid="checkbox-terms"
                      />
                      <div className="space-y-1 leading-none">
                        <label
                          htmlFor="terms"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Aceito os termos e condições
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Declaro que as informações são verdadeiras e aceito os{" "}
                          <a href="#" className="text-primary hover:underline">termos de uso</a>{" "}
                          e{" "}
                          <a href="#" className="text-primary hover:underline">política de privacidade</a>.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="button"
                    className="w-full rounded-xl h-12"
                    disabled={!canProceedStep3Provider}
                    onClick={handleNextStep}
                    data-testid="button-next-step3"
                  >
                    Continuar
                  </Button>
                </>
              )}

              {step === 4 && isProvider && (
                <>
                  <div className="space-y-4">
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                      <div className="flex items-start gap-3">
                        <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium">Dados para Recebimento via PIX</p>
                          <p className="text-muted-foreground mt-1">
                            Informe sua chave PIX para receber os pagamentos dos serviços realizados.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pixKeyType">Tipo de Chave PIX</Label>
                      <select
                        id="pixKeyType"
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={formData.pixKeyType}
                        onChange={(e) => setFormData({ ...formData, pixKeyType: e.target.value, pixKey: "" })}
                        data-testid="select-pix-key-type"
                      >
                        <option value="">Selecione...</option>
                        <option value="cpf">CPF</option>
                        <option value="phone">Celular</option>
                        <option value="email">Email</option>
                        <option value="random">Chave aleatória</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pixKey">Chave PIX</Label>
                      <Input
                        id="pixKey"
                        placeholder={
                          formData.pixKeyType === "cpf" ? "000.000.000-00" :
                          formData.pixKeyType === "phone" ? "(00) 00000-0000" :
                          formData.pixKeyType === "email" ? "seu@email.com" :
                          "Cole sua chave aleatória"
                        }
                        value={formData.pixKey}
                        onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                        data-testid="input-pix-key"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bankName">Banco (opcional)</Label>
                      <Input
                        id="bankName"
                        placeholder="Ex: Nubank, Bradesco, Itaú..."
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        data-testid="input-bank-name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bankAgency">Agência (opcional)</Label>
                        <Input
                          id="bankAgency"
                          placeholder="0001"
                          value={formData.bankAgency}
                          onChange={(e) => setFormData({ ...formData, bankAgency: e.target.value })}
                          data-testid="input-bank-agency"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankAccount">Conta (opcional)</Label>
                        <Input
                          id="bankAccount"
                          placeholder="00000-0"
                          value={formData.bankAccount}
                          onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                          data-testid="input-bank-account"
                        />
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="button"
                    className="w-full rounded-xl h-12"
                    disabled={!formData.pixKeyType || !formData.pixKey}
                    onClick={handleNextStep}
                    data-testid="button-next-step4"
                  >
                    Continuar
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={handleNextStep}
                    data-testid="button-skip-bank"
                  >
                    Pular por agora
                  </Button>
                </>
              )}

              {((step === 3 && !isProvider) || (step === 5 && isProvider)) && (
                <>
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
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <PasswordStrengthIndicator password={formData.password} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Senha</Label>
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
                        data-testid="input-confirm-password"
                      />
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        As senhas não coincidem
                      </p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full rounded-xl h-12"
                    disabled={isLoading || formData.password !== formData.confirmPassword}
                    data-testid="button-register"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      "Criar Conta"
                    )}
                  </Button>
                </>
              )}

              <div className="text-center text-sm text-muted-foreground">
                Já tem conta?{" "}
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="p-0 h-auto text-primary hover:underline"
                  onClick={() => setLocation(loginPath)}
                  data-testid="link-login"
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

export function ClientRegisterPage() {
  return <RegisterPage userType="client" />;
}

export function ProviderRegisterPage() {
  return <RegisterPage userType="provider" />;
}
