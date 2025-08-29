import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Users, UserCheck, Building2, Shield, Dumbbell, Zap, Target } from "lucide-react";
import { Link } from "wouter";
import heroImage from "@assets/image_1756404011965.png";

export default function MultiLogin() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const loginOptions = [
    {
      id: "replit",
      title: "Acesso Geral",
      description: "Entre com sua conta Replit para acessar treinos personalizados",
      icon: Users,
      color: "from-blue-500 to-blue-700",
      textColor: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      link: "/login",
      badge: "Alunos & Personal",
      features: ["Treinos Personalizados", "Acompanhamento IA", "Histórico Completo"]
    },
    {
      id: "admin",
      title: "Painel Administrativo",
      description: "Acesso completo para gestão da academia e usuários",
      icon: Shield,
      color: "from-purple-500 to-purple-700",
      textColor: "text-purple-700",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      link: "/admin/login",
      badge: "Academia",
      features: ["Gestão de Usuários", "Configurações", "Relatórios"]
    },
    {
      id: "gym",
      title: "Portal da Academia",
      description: "Gerencie alunos, personal trainers e configurações",
      icon: Building2,
      color: "from-emerald-500 to-emerald-700",
      textColor: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      link: "/academia",
      badge: "Gestão",
      features: ["Dashboard Completo", "Métricas", "Controle Total"]
    }
  ];

  const stats = [
    { icon: Users, number: "500+", label: "Alunos Ativos" },
    { icon: Dumbbell, number: "50+", label: "Personal Trainers" },
    { icon: Target, number: "1000+", label: "Treinos Gerados" },
    { icon: Zap, number: "98%", label: "Satisfação" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e2e8f0' fill-opacity='0.3'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='27' cy='7' r='1'/%3E%3Ccircle cx='47' cy='7' r='1'/%3E%3Ccircle cx='7' cy='27' r='1'/%3E%3Ccircle cx='27' cy='27' r='1'/%3E%3Ccircle cx='47' cy='27' r='1'/%3E%3Ccircle cx='7' cy='47' r='1'/%3E%3Ccircle cx='27' cy='47' r='1'/%3E%3Ccircle cx='47' cy='47' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <img 
                  src={heroImage} 
                  alt="GymSync Portal" 
                  className="w-24 h-24 rounded-2xl shadow-2xl object-cover ring-4 ring-white"
                />
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent mb-4">
              GymSync
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 mb-2 font-medium">
              Seu treino inteligente começa aqui
            </p>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Plataforma completa de gestão fitness com IA integrada para alunos, personal trainers e academias
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800">{stat.number}</div>
                  <div className="text-sm text-slate-600">{stat.label}</div>
                </div>
              );
            })}
          </div>

          {/* Login Options */}
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-800 mb-4">
                Escolha sua forma de acesso
              </h2>
              <p className="text-slate-600">
                Cada portal foi desenvolvido especificamente para sua necessidade
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {loginOptions.map((option) => {
                const IconComponent = option.icon;
                const isHovered = hoveredCard === option.id;
                
                return (
                  <Card 
                    key={option.id}
                    className={`relative overflow-hidden transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl cursor-pointer group ${option.borderColor} border-2 ${isHovered ? 'scale-105' : ''}`}
                    onMouseEnter={() => setHoveredCard(option.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {/* Background Gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${option.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                    
                    <CardHeader className="relative z-10 pb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-xl ${option.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                          <IconComponent className={`w-8 h-8 ${option.textColor}`} />
                        </div>
                        <Badge className={`${option.bgColor} ${option.textColor} border-0 group-hover:scale-105 transition-transform duration-300`}>
                          {option.badge}
                        </Badge>
                      </div>
                      
                      <CardTitle className="text-xl font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
                        {option.title}
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="relative z-10 space-y-4">
                      <p className="text-slate-600 leading-relaxed">
                        {option.description}
                      </p>
                      
                      {/* Features */}
                      <div className="space-y-2">
                        {option.features.map((feature, index) => (
                          <div key={index} className="flex items-center text-sm text-slate-600">
                            <div className={`w-1.5 h-1.5 rounded-full ${option.color.includes('blue') ? 'bg-blue-500' : option.color.includes('purple') ? 'bg-purple-500' : 'bg-emerald-500'} mr-2`}></div>
                            {feature}
                          </div>
                        ))}
                      </div>
                      
                      {/* Button */}
                      <Link href={option.link}>
                        <Button 
                          className={`w-full bg-gradient-to-r ${option.color} hover:shadow-lg transition-all duration-300 group-hover:scale-105 text-white font-semibold py-3`}
                          data-testid={`button-login-${option.id}`}
                        >
                          <span>Acessar Portal</span>
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </CardContent>
                    
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/20 to-transparent rounded-bl-full group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-white/10 to-transparent rounded-tr-full group-hover:scale-150 transition-transform duration-700"></div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Motivational Quote */}
          <div className="text-center mt-16 mb-8">
            <div className="max-w-3xl mx-auto p-8 bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
              <blockquote className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">
                "Sua única limitação é você mesmo"
              </blockquote>
              <p className="text-slate-600 text-lg">
                Transforme seus objetivos em resultados com nossa plataforma inteligente
              </p>
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center text-slate-500 text-sm">
            <p>✨ Plataforma desenvolvida para maximizar resultados através da tecnologia</p>
          </div>
        </div>
      </div>
    </div>
  );
}