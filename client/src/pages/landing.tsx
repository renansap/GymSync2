import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-primary mb-2" data-testid="app-title">
              GymSync
            </h1>
            <p className="text-muted-foreground" data-testid="app-subtitle">
              Seu treino inteligente
            </p>
          </div>
          
          <div className="space-y-4">
            <Button 
              onClick={handleLogin} 
              className="w-full" 
              size="lg"
              data-testid="button-login"
            >
              Entrar com Replit
            </Button>
            
            <p className="text-center text-sm text-muted-foreground">
              Acesse sua conta para começar a treinar
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
