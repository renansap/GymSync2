import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import NotFound from "./pages/not-found";
import Home from "./pages/home";
import AlunoDashboard from "./pages/aluno-dashboard";
import PersonalDashboard from "./pages/personal-dashboard";
import AcademiaDashboard from "./pages/academia-dashboard";
import AcademiaAlunos from "./pages/academia-alunos";
import AcademiaPersonais from "./pages/academia-personais";
import AcademiaEngajamento from "./pages/academia-engajamento";
import AcademiaAniversariantes from "./pages/academia-aniversariantes";
import AcademiaRenovacoes from "./pages/academia-renovacoes";
import AdminUsuarios from "./pages/admin-usuarios";
import AdminDashboard from "./pages/admin-dashboard";
import AdminLogin from "./pages/admin-login";
import AdminTemplates from "./pages/admin-templates";
import AdminConfiguracoes from "./pages/admin-configuracoes";
import AdminAcademias from "./pages/admin-academias";
import MultiLogin from "./pages/multi-login";
import DefinirSenha from "./pages/definir-senha";
import TestGifs from "./pages/test-gifs";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Multi-login page - accessible without auth */}
      <Route path="/login" component={MultiLogin} />
      
      {/* Password setup page - accessible without auth */}
      <Route path="/definir-senha" component={DefinirSenha} />
      
      {/* Admin routes - accessible without main auth */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/usuarios" component={AdminUsuarios} />
      <Route path="/admin/academias" component={AdminAcademias} />
      <Route path="/admin/templates" component={AdminTemplates} />
      <Route path="/admin/configuracoes" component={AdminConfiguracoes} />
      <Route path="/admin" component={AdminDashboard} />
      
      {/* Test route for GIFs */}
      <Route path="/test-gifs" component={TestGifs} />
      
      {!isAuthenticated ? (
        <Route path="/" component={MultiLogin} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/aluno" component={AlunoDashboard} />
          <Route path="/personal" component={PersonalDashboard} />
          <Route path="/academia" component={AcademiaDashboard} />
          <Route path="/academia/alunos" component={AcademiaAlunos} />
          <Route path="/academia/personais" component={AcademiaPersonais} />
          <Route path="/academia/engajamento" component={AcademiaEngajamento} />
          <Route path="/academia/aniversariantes" component={AcademiaAniversariantes} />
          <Route path="/academia/renovacoes" component={AcademiaRenovacoes} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
