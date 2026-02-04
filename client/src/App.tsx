import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import NewService from "@/pages/client/new-service";
import ServiceDetails from "@/pages/client/service-details";
import SelectProvider from "@/pages/client/select-provider";
import RateProvider from "@/pages/client/rate-provider";
import ProviderDashboard from "@/pages/provider";
import AdminDashboard from "@/pages/admin";
import Settings from "@/pages/settings";
import { ClientLoginPage, ProviderLoginPage, AdminLoginPage } from "@/pages/auth/login";
import { ClientRegisterPage, ProviderRegisterPage } from "@/pages/auth/register";
import ForgotPasswordPage, { ResetPasswordPage } from "@/pages/auth/forgot-password";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/client" component={Home} />
      <Route path="/client/new" component={NewService} />
      <Route path="/client/service/:id" component={ServiceDetails} />
      <Route path="/cliente/selecionar-profissional/:serviceId" component={SelectProvider} />
      <Route path="/cliente/avaliar/:serviceId" component={RateProvider} />
      <Route path="/provider" component={ProviderDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/settings" component={Settings} />
      
      <Route path="/login/cliente" component={ClientLoginPage} />
      <Route path="/login/prestador" component={ProviderLoginPage} />
      <Route path="/login/admin" component={AdminLoginPage} />
      <Route path="/cadastro/cliente" component={ClientRegisterPage} />
      <Route path="/cadastro/prestador" component={ProviderRegisterPage} />
      <Route path="/recuperar-senha" component={ForgotPasswordPage} />
      <Route path="/redefinir-senha" component={ResetPasswordPage} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="pereirao-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
