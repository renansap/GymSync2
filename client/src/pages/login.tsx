import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Users, Shield, Building2, Zap, Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface LoginForm {
  email: string;
  password: string;
  userType: string;
}

export default function Login() {
  const [formData, setFormData] = useState<LoginForm>({
    email: "",
    password: "",
    userType: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const userTypes = [
    { value: "aluno", label: "Aluno", icon: Users, color: "text-blue-600" },
    { value: "personal", label: "Personal Trainer", icon: Shield, color: "text-purple-600" },
    { value: "academia", label: "Academia", icon: Building2, color: "text-green-600" },
    { value: "admin", label: "Administrador", icon: Shield, color: "text-red-600" }
  ];

  const handleTraditionalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.userType) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Fazer login tradicional
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          userType: formData.userType
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Login bem-sucedido:', data);
        
        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo(a) de volta, ${data.user?.name || 'usuário'}!`,
        });
        
        // Redirecionar baseado no tipo de usuário
        const userType = data.user?.userType;
        console.log('🎯 Redirecionando usuário do tipo:', userType);
        
        if (userType === 'aluno') {
          console.log('📍 Redirecionando para /aluno');
          window.location.href = '/aluno';
        } else if (userType === 'personal') {
          console.log('📍 Redirecionando para /personal');
          window.location.href = '/personal';
        } else if (userType === 'academia' || userType === 'admin') {
          console.log('📍 Redirecionando para /hub-academia');
          window.location.href = '/hub-academia';
        } else {
          console.log('📍 Tipo de usuário não reconhecido, redirecionando para home');
          window.location.href = '/';
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Erro no login",
          description: errorData.message || "Credenciais inválidas. Tente novamente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro no login",
        description: "Ocorreu um erro ao processar seu login. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      // Redirecionar para OAuth do Google
      window.location.href = '/api/auth/google';
    } catch (error) {
      toast({
        title: "Erro no login Google",
        description: "Ocorreu um erro ao iniciar o login com Google. Tente novamente.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl shadow-lg flex items-center justify-center">
                <Zap className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            GymSync
          </h1>
          <p className="text-slate-600">
            Faça login para acessar sua conta
          </p>
        </div>

        {/* Login Form */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl text-slate-800">
              Acesso ao Portal
            </CardTitle>
            <p className="text-sm text-slate-500">
              Escolha sua forma de acesso
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Google Login Button */}
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              variant="outline"
              className="w-full h-11 border-2 border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-semibold"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {isLoading ? "Processando..." : "Continuar com Google"}
            </Button>

            {/* Separator */}
            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-sm text-slate-500">
                ou
              </span>
            </div>

            {/* Traditional Login Form */}
            <form onSubmit={handleTraditionalLogin} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="h-11 pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="h-11 pl-10 pr-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-9 w-9 p-0 hover:bg-slate-100"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400" />
                    )}
                  </Button>
                </div>
              </div>

              {/* User Type */}
              <div className="space-y-2">
                <Label htmlFor="userType" className="text-slate-700 font-medium">
                  Tipo de Usuário
                </Label>
                <Select
                  value={formData.userType}
                  onValueChange={(value) => handleInputChange("userType", value)}
                  required
                >
                  <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Selecione seu tipo de usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {userTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center space-x-2">
                            <IconComponent className={`w-4 h-4 ${type.color}`} />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Entrar
                  </>
                )}
              </Button>
            </form>

            {/* Register Link */}
            <div className="text-center mt-4">
              <p className="text-sm text-slate-600">
                Não tem uma conta?{" "}
                <Link href="/register">
                  <span className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer">
                    Crie uma conta
                  </span>
                </Link>
              </p>
            </div>

            {/* Back to Home */}
            <div className="text-center mt-4">
              <Link href="/">
                <Button variant="ghost" className="text-slate-500 hover:text-slate-700">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Início
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-slate-500">
          <p>✨ Plataforma desenvolvida para maximizar resultados através da tecnologia</p>
        </div>
      </div>
    </div>
  );
} 