import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Users, UserCheck, Building2, Shield, Dumbbell, Zap, Target, Star, Trophy, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import heroImage from "@assets/image_1756404011965.png";

export default function MultiLogin() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const loginOptions = [
    {
      id: "replit",
      title: "Portal do Atleta",
      description: "Acesse treinos personalizados com inteligência artificial e acompanhamento completo",
      icon: Users,
      color: "from-purple-600 to-indigo-600",
      textColor: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-100",
      link: "/login",
      badge: "Alunos & Personal",
      features: ["Treinos com IA", "Análise de Performance", "Comunidade Fitness"]
    },
    {
      id: "admin",
      title: "Central de Controle",
      description: "Painel administrativo avançado para gestão completa do sistema",
      icon: Shield,
      color: "from-purple-600 to-indigo-600",
      textColor: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-100",
      link: "/admin/login",
      badge: "Administração",
      features: ["Gestão Avançada", "Analytics Premium", "Configurações Globais"]
    },
    {
      id: "gym",
      title: "Hub da Academia",
      description: "Plataforma completa para gerenciar sua academia com eficiência máxima",
      icon: Building2,
      color: "from-purple-600 to-indigo-600",
      textColor: "text-green-500",
      bgColor: "bg-green-50",
      borderColor: "border-green-100",
      link: "/academia",
      badge: "Multi-Tenant",
      features: ["Dashboard Inteligente", "Métricas em Tempo Real", "Gestão Unificada"]
    }
  ];

  const stats = [
    { icon: Users, number: "2.5K+", label: "Atletas Conectados", color: "from-purple-500 to-purple-600" },
    { icon: Trophy, number: "150+", label: "Personal Trainers", color: "from-indigo-500 to-indigo-600" },
    { icon: TrendingUp, number: "10K+", label: "Treinos Realizados", color: "from-green-500 to-green-600" },
    { icon: Star, number: "4.9", label: "Avaliação", color: "from-yellow-400 to-yellow-500" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 relative overflow-hidden font-['Inter']">
      {/* Modern Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366f1' fill-opacity='0.08'%3E%3Cpath d='M50 50m-25 0a25,25 0 1,1 50,0a25,25 0 1,1 -50,0'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-16 h-16 bg-purple-200 rounded-full opacity-20 animate-pulse"></div>
      <div className="absolute top-40 right-20 w-12 h-12 bg-indigo-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
      <div className="absolute bottom-40 left-20 w-20 h-20 bg-green-200 rounded-full opacity-20 animate-pulse delay-2000"></div>

      {/* Hero Section */}
      <div className="relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="relative group">
                <img 
                  src={heroImage} 
                  alt="GymSync Portal" 
                  className="w-20 h-20 rounded-2xl shadow-2xl object-cover ring-4 ring-white group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center animate-pulse">
                  <Zap className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3">
              GymSync
            </h1>
            <p className="text-lg md:text-xl text-gray-900 mb-2 font-medium">
              Transforme seus treinos com inteligência artificial
            </p>
            <p className="text-gray-500 max-w-2xl mx-auto text-sm">
              Plataforma multi-tenant para academias, personal trainers e atletas com tecnologia de ponta
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="text-center group">
                  <div className={`w-14 h-14 bg-gradient-to-r ${stat.color} rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.number}</div>
                  <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
                </div>
              );
            })}
          </div>

          {/* Login Options */}
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Escolha seu Portal de Acesso
              </h2>
              <p className="text-gray-500 text-lg font-medium">
                Cada ambiente foi otimizado para sua experiência específica
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {loginOptions.map((option) => {
                const IconComponent = option.icon;
                const isHovered = hoveredCard === option.id;
                
                return (
                  <Card 
                    key={option.id}
                    className={`relative overflow-hidden transition-all duration-300 transform hover:scale-105 cursor-pointer group bg-white shadow-lg hover:shadow-2xl ${option.borderColor} border ${isHovered ? 'brightness-105' : ''} rounded-xl`}
                    onMouseEnter={() => setHoveredCard(option.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {/* Background Gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${option.color} opacity-0 group-hover:opacity-3 transition-opacity duration-300`}></div>
                    
                    <CardHeader className="relative z-10 pb-3">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-4 rounded-2xl ${option.bgColor} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                          <IconComponent className={`w-8 h-8 ${option.textColor}`} />
                        </div>
                        <Badge className={`${option.bgColor} ${option.textColor} border-0 group-hover:scale-105 transition-transform duration-300 px-3 py-1 text-xs font-semibold rounded-xl`}>
                          {option.badge}
                        </Badge>
                      </div>
                      
                      <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-gray-800 transition-colors">
                        {option.title}
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="relative z-10 space-y-4 pt-2">
                      <p className="text-gray-500 leading-relaxed text-sm">
                        {option.description}
                      </p>
                      
                      {/* Features */}
                      <div className="space-y-2">
                        {option.features.map((feature, index) => (
                          <div key={index} className="flex items-center text-sm text-gray-600">
                            <div className={`w-2 h-2 rounded-full ${option.id === 'replit' ? 'bg-purple-500' : option.id === 'admin' ? 'bg-indigo-500' : 'bg-green-500'} mr-3 group-hover:scale-125 transition-transform duration-300`}></div>
                            <span className="font-medium">{feature}</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Button */}
                      <Link href={option.link}>
                        <Button 
                          className={`w-full bg-gradient-to-r ${option.color} hover:brightness-110 transition-all duration-300 text-white font-semibold py-3 px-6 rounded-2xl group-hover:scale-105 mt-4`}
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
          <div className="text-center mt-12 mb-6">
            <div className="max-w-2xl mx-auto p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100">
              <blockquote className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
                "Supere seus limites com tecnologia"
              </blockquote>
              <p className="text-gray-600 text-base">
                Cada treino é uma oportunidade de evolução com nossa IA
              </p>
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center text-gray-400 text-xs">
            <p>⚡ Desenvolvido para performance máxima</p>
          </div>
        </div>
      </div>
    </div>
  );
}