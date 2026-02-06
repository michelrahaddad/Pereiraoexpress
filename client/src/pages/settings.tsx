import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Phone, MapPin, Bell, Shield, Moon, Sun, Camera, Loader2, ArrowLeft, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";
import { useUpload } from "@/hooks/use-upload";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Settings() {
  const { user, isAuthenticated, refetch } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [state, setState] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  const { data: profile } = useQuery<any>({
    queryKey: ["/api/user/profile"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setPhone((user as any).phone || "");
      setCity((user as any).city || "");
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      if (!phone && profile.phone) setPhone(profile.phone);
      setAddress(profile.address || "");
      if (!city && profile.city) setCity(profile.city);
    }
  }, [profile]);

  const fetchCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    
    setIsFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP digitado e tente novamente.",
          variant: "destructive",
        });
        return;
      }
      
      setCity(data.localidade || "");
      setState(data.uf || "");
      setNeighborhood(data.bairro || "");
      if (data.logradouro) {
        setAddress(`${data.logradouro}${data.bairro ? `, ${data.bairro}` : ""}`);
      }
      
      toast({
        title: "Endereço encontrado",
        description: `${data.localidade} - ${data.uf}`,
      });
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Não foi possível consultar o CEP. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingCep(false);
    }
  };

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 5) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    return digits;
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setZipCode(formatted);
    
    const clean = formatted.replace(/\D/g, "");
    if (clean.length === 8) {
      fetchCep(clean);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const fullCity = state ? `${city} - ${state}` : city;
      const fullAddress = address + (neighborhood && !address.includes(neighborhood) ? `, ${neighborhood}` : "");
      const res = await apiRequest("PATCH", "/api/user/settings", {
        firstName,
        lastName,
        phone,
        address: fullAddress,
        city: fullCity,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Configurações salvas",
        description: "Suas informações foram atualizadas com sucesso.",
      });
      refetch?.();
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: () => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    },
  });

  const { uploadFile } = useUpload({
    onSuccess: async (response) => {
      try {
        await apiRequest("PATCH", "/api/user/profile-image", {
          profileImageUrl: response.objectPath,
        });
        setProfileImage(response.objectPath);
        refetch?.();
        toast({
          title: "Foto atualizada!",
          description: "Sua foto de perfil foi atualizada com sucesso.",
        });
      } catch (error) {
        toast({
          title: "Erro ao salvar foto",
          description: "Não foi possível salvar a foto de perfil.",
          variant: "destructive",
        });
      }
      setIsUploadingPhoto(false);
    },
    onError: (error) => {
      toast({
        title: "Erro no upload",
        description: error.message || "Não foi possível fazer upload da foto.",
        variant: "destructive",
      });
      setIsUploadingPhoto(false);
    },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingPhoto(true);
    await uploadFile(file);
  };

  const getInitials = () => {
    if (!user) return "U";
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || "U";
  };

  const handleCancel = () => {
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
    setPhone((user as any)?.phone || profile?.phone || "");
    setAddress(profile?.address || "");
    const savedCity = (user as any)?.city || profile?.city || "";
    if (savedCity.includes(" - ")) {
      const [c, s] = savedCity.split(" - ");
      setCity(c);
      setState(s);
    } else {
      setCity(savedCity);
      setState("");
    }
    setZipCode("");
    setNeighborhood("");
    toast({
      title: "Alterações descartadas",
      description: "Os campos voltaram aos valores originais.",
    });
  };

  const currentProfileImage = profileImage || user?.profileImageUrl;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container px-6 py-16 text-center">
          <p className="text-muted-foreground">Faça login para acessar as configurações.</p>
          <Button asChild className="mt-4 rounded-xl">
            <Link href="/login/cliente">Entrar</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-6 py-8 max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mb-4 gap-2" 
          onClick={() => setLocation(user?.role === "provider" ? "/provider" : user?.role === "admin" ? "/admin" : "/client")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground mt-1">Gerencie seu perfil e preferências</p>
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Perfil
              </CardTitle>
              <CardDescription>Suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24 rounded-2xl">
                    <AvatarImage src={currentProfileImage || undefined} />
                    <AvatarFallback className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-2xl font-semibold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    data-testid="input-profile-photo"
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 h-9 w-9 rounded-xl shadow-lg"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    data-testid="button-upload-photo"
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div>
                  <p className="font-semibold text-lg" data-testid="text-settings-name">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique no ícone para alterar sua foto
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input 
                    id="firstName" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="rounded-xl"
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Sobrenome</Label>
                  <Input 
                    id="lastName" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="rounded-xl"
                    data-testid="input-last-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefone
                </Label>
                <Input 
                  id="phone" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999" 
                  className="rounded-xl"
                  data-testid="input-phone"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Localização
              </CardTitle>
              <CardDescription>Seu endereço para buscar profissionais próximos (máx. 300km)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="zipCode">CEP</Label>
                <div className="flex gap-2">
                  <Input 
                    id="zipCode"
                    value={zipCode}
                    onChange={handleCepChange}
                    placeholder="00000-000"
                    maxLength={9}
                    className="rounded-xl flex-1"
                    data-testid="input-zip-code"
                  />
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => fetchCep(zipCode)}
                    disabled={isFetchingCep || zipCode.replace(/\D/g, "").length !== 8}
                    data-testid="button-search-cep"
                  >
                    {isFetchingCep ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Digite o CEP para preencher o endereço automaticamente</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input 
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: São Paulo"
                    className="rounded-xl"
                    data-testid="input-city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input 
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Ex: SP"
                    className="rounded-xl"
                    data-testid="input-state"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço completo</Label>
                <Textarea 
                  id="address" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número, bairro" 
                  className="rounded-xl resize-none"
                  data-testid="input-address"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações
              </CardTitle>
              <CardDescription>Configure como você quer ser notificado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notificações por email</p>
                  <p className="text-sm text-muted-foreground">Receba atualizações dos seus serviços</p>
                </div>
                <Switch defaultChecked data-testid="switch-email-notifications" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notificações push</p>
                  <p className="text-sm text-muted-foreground">Alertas no navegador</p>
                </div>
                <Switch data-testid="switch-push-notifications" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">SMS</p>
                  <p className="text-sm text-muted-foreground">Mensagens de texto para urgências</p>
                </div>
                <Switch data-testid="switch-sms-notifications" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                Aparência
              </CardTitle>
              <CardDescription>Personalize a interface do aplicativo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Modo escuro</p>
                  <p className="text-sm text-muted-foreground">Alterne entre tema claro e escuro</p>
                </div>
                <Switch 
                  checked={theme === "dark"} 
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  data-testid="switch-dark-mode"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Segurança
              </CardTitle>
              <CardDescription>Gerencie a segurança da sua conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Autenticação em dois fatores</p>
                  <p className="text-sm text-muted-foreground">Adicione uma camada extra de segurança</p>
                </div>
                <Button variant="outline" className="rounded-xl" data-testid="button-2fa">
                  Configurar
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 pt-4">
            <Button 
              variant="outline" 
              className="rounded-xl" 
              onClick={handleCancel}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button 
              className="rounded-xl" 
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              data-testid="button-save"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar alterações
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
