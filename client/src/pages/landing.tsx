import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { 
  Zap, 
  MessageSquare, 
  Shield, 
  Clock, 
  CheckCircle2,
  Sparkles,
  Wrench,
  ArrowRight,
  Camera,
  Users,
  BadgeCheck,
  Banknote,
  Plug,
  Droplets,
  Paintbrush,
  Armchair,
  Hammer,
  Smartphone,
  User,
  Briefcase,
  Settings
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Header />
      
      <section className="relative min-h-[90vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-3xl" />
        
        <div className="container relative px-6 py-20 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="space-y-8 text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-tight">
                Deu problema em casa?
                <br />
                <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                  Chama o Pereirão.
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Você explica, manda foto e a gente encontra quem resolve — sem enrolação, com valor definido e atendimento rápido.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button 
                  size="lg" 
                  asChild 
                  className="gap-3 rounded-2xl shadow-lg shadow-primary/25" 
                  data-testid="button-start"
                >
                  <a href="/login/cliente">
                    <Wrench className="h-5 w-5" />
                    Descrever meu problema
                  </a>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  asChild 
                  className="gap-3 rounded-2xl" 
                  data-testid="button-client-login"
                >
                  <a href="/login/cliente">
                    <User className="h-5 w-5" />
                    Entrar como cliente
                  </a>
                </Button>
              </div>
              
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 pt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Diagnóstico inteligente
                </div>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  Profissionais verificados
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Atendimento rápido
                </div>
              </div>
            </div>
            
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl transform rotate-6" />
              <div className="relative rounded-3xl bg-card/80 backdrop-blur-xl p-8 shadow-2xl border border-white/10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                    <Sparkles className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Assistente IA</p>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <p className="text-sm text-muted-foreground">Online agora</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="rounded-2xl bg-muted/50 backdrop-blur p-4 text-sm leading-relaxed">
                    Olá! Me conta o que está acontecendo. 
                    Pode mandar fotos também que eu analiso!
                  </div>
                  <div className="rounded-2xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground p-4 text-sm ml-auto max-w-[85%] leading-relaxed">
                    A torneira da cozinha tá pingando...
                  </div>
                  <div className="rounded-2xl bg-muted/50 backdrop-blur p-4 text-sm leading-relaxed">
                    Entendi! Provavelmente é a{" "}
                    <span className="font-semibold text-primary">vedação do registro</span>. 
                    Serviço simples! Posso chamar um encanador agora?
                  </div>
                </div>
                
                <div className="mt-6 flex gap-3">
                  <Button variant="outline" size="icon" className="rounded-xl">
                    <Camera className="h-5 w-5" />
                  </Button>
                  <div className="flex-1 min-h-9 rounded-xl bg-muted/50 backdrop-blur flex items-center px-4 text-sm text-muted-foreground">
                    Digite sua mensagem...
                  </div>
                  <Button size="icon" className="rounded-xl">
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="py-24 lg:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent" />
        <div className="container relative px-6">
          <div className="text-center mb-16 lg:mb-20 space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Simples assim:
            </h2>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            <Card className="relative overflow-visible bg-card/50 backdrop-blur border-2 border-transparent hover:border-primary/20 transition-all duration-300 rounded-3xl group">
              <div className="absolute -top-6 left-8">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-lg group-hover:scale-110 transition-transform">
                  1
                </div>
              </div>
              <CardContent className="pt-10 pb-8 px-8">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold text-xl mb-3">Você explica o problema</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Escreva ou envie fotos do que precisa arrumar. Pode ser qualquer coisa!
                </p>
              </CardContent>
            </Card>
            
            <Card className="relative overflow-visible bg-card/50 backdrop-blur border-2 border-transparent hover:border-accent/20 transition-all duration-300 rounded-3xl group">
              <div className="absolute -top-6 left-8">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center text-2xl font-bold text-accent-foreground shadow-lg group-hover:scale-110 transition-transform">
                  2
                </div>
              </div>
              <CardContent className="pt-10 pb-8 px-8">
                <div className="h-16 w-16 rounded-2xl bg-accent/20 flex items-center justify-center mb-6">
                  <Sparkles className="h-8 w-8 text-accent-foreground" />
                </div>
                <h3 className="font-bold text-xl mb-3">Nossa IA analisa</h3>
                <p className="text-muted-foreground leading-relaxed">
                  O sistema entende a situação e sugere a melhor solução com preço estimado.
                </p>
              </CardContent>
            </Card>
            
            <Card className="relative overflow-visible bg-card/50 backdrop-blur border-2 border-transparent hover:border-primary/20 transition-all duration-300 rounded-3xl group">
              <div className="absolute -top-6 left-8">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-lg group-hover:scale-110 transition-transform">
                  3
                </div>
              </div>
              <CardContent className="pt-10 pb-8 px-8">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold text-xl mb-3">Um profissional é chamado</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Você escolhe o prazo e o preço. A gente cuida do resto.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-32 relative">
        <div className="container px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Por que usar o{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Pereirão Express?
              </span>
            </h2>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            <div className="group p-8 rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 hover:border-primary/30 transition-all duration-300">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Sparkles className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-2">Sem adivinhação</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Você já recebe um diagnóstico antes da visita
              </p>
            </div>
            
            <div className="group p-8 rounded-3xl bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/10 hover:border-accent/30 transition-all duration-300">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Banknote className="h-8 w-8 text-accent-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-2">Preço antes do serviço</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nada de surpresa no final
              </p>
            </div>
            
            <div className="group p-8 rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 hover:border-primary/30 transition-all duration-300">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <BadgeCheck className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-2">Profissionais avaliados</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Só entra quem trabalha bem
              </p>
            </div>
            
            <div className="group p-8 rounded-3xl bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/10 hover:border-accent/30 transition-all duration-300">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Zap className="h-8 w-8 text-accent-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-2">Mais rápido que indicação</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Em poucos minutos seu pedido já está em andamento
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent" />
        <div className="container relative px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              O que a gente resolve pra você
            </h2>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 max-w-5xl mx-auto">
            <div className="flex flex-col items-center p-6 rounded-2xl bg-card/50 backdrop-blur border hover:border-primary/30 transition-all duration-300 group">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plug className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-center">Problemas elétricos</h3>
            </div>
            
            <div className="flex flex-col items-center p-6 rounded-2xl bg-card/50 backdrop-blur border hover:border-primary/30 transition-all duration-300 group">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Droplets className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-center">Vazamentos e encanamentos</h3>
            </div>
            
            <div className="flex flex-col items-center p-6 rounded-2xl bg-card/50 backdrop-blur border hover:border-primary/30 transition-all duration-300 group">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Paintbrush className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-center">Diaristas e limpeza</h3>
            </div>
            
            <div className="flex flex-col items-center p-6 rounded-2xl bg-card/50 backdrop-blur border hover:border-primary/30 transition-all duration-300 group">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Armchair className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-center">Montagem de móveis</h3>
            </div>
            
            <div className="flex flex-col items-center p-6 rounded-2xl bg-card/50 backdrop-blur border hover:border-primary/30 transition-all duration-300 group">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Hammer className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-center">Pequenos reparos</h3>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-32 relative">
        <div className="container px-6">
          <div className="relative rounded-[2.5rem] overflow-hidden bg-card border">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
            <div className="relative p-12 lg:p-16 text-center">
              <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-8 shadow-xl">
                <Shield className="h-10 w-10 text-primary-foreground" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Pode confiar, a gente leva isso a sério.
              </h2>
              <p className="max-w-2xl mx-auto text-muted-foreground text-lg leading-relaxed mb-8">
                Profissionais verificados, pagamentos protegidos e suporte durante todo o serviço.
                <br />
                <span className="flex items-center justify-center gap-2 mt-4">
                  <Smartphone className="h-5 w-5 text-primary" />
                  Você acompanha tudo direto pelo celular.
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-32">
        <div className="container px-6">
          <div className="relative rounded-[2.5rem] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-accent" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
            <div className="relative p-12 lg:p-20 text-center">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-primary-foreground mb-4">
                Chamou. Resolveu.
              </h2>
              <p className="text-2xl text-primary-foreground/90 mb-10">
                Simples assim.
              </p>
              <Button 
                size="lg" 
                variant="secondary" 
                asChild 
                className="gap-3 rounded-2xl shadow-xl" 
                data-testid="button-cta-footer"
              >
                <a href="/login/cliente">
                  <Wrench className="h-5 w-5" />
                  Quero resolver meu problema agora
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 border-t bg-muted/30">
        <div className="container px-6">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-lg">
              <Briefcase className="h-8 w-8 text-accent-foreground" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              É prestador de serviços?
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Cadastre-se e receba chamados na sua região. Você define seus horários e aceita os trabalhos que quiser.
            </p>
            <Button 
              size="lg" 
              variant="outline"
              asChild 
              className="gap-3 rounded-2xl" 
              data-testid="button-provider-login"
            >
              <a href="/login/prestador">
                <Wrench className="h-5 w-5" />
                Entrar como prestador
              </a>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t py-12 relative">
        <div className="container px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/logo-vertical.png" alt="Pereirão Express" className="h-24 object-contain" />
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Pereirão Express. Todos os direitos reservados.
            </p>
          </div>
        </div>
        <a 
          href="/login/admin" 
          className="absolute bottom-3 left-3 p-1.5 rounded-md text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
          title="Acesso administrativo"
          data-testid="link-admin-login"
        >
          <Settings className="h-4 w-4" />
        </a>
      </footer>
    </div>
  );
}
