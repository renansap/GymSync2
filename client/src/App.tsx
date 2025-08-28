import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "./pages/not-found";
import Landing from "./pages/landing";
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
      {/* Admin routes - accessible without main auth */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/usuarios" component={AdminUsuarios} />
      <Route path="/admin" component={AdminDashboard} />
      
      {/* Test route for GIFs */}
      <Route path="/test-gifs" component={TestGifs} />
      
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
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
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
