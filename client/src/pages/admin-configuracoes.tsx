import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BottomNavigation from "../components/bottom-navigation";
import { ArrowLeft, Settings, Mail, Send, Shield, Database, FileText, Activity, Bell, UserCheck } from "lucide-react";
import { Link } from "wouter";

export default function AdminConfiguracoes() {
  // Check admin authentication
  const { data: adminAuth, isLoading: isLoadingAdminAuth } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/admin/check"],
    retry: false,
  });

  if (isLoadingAdminAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Redirect to admin login if not authenticated
  if (!adminAuth || !adminAuth.authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Acesso Administrativo Restrito</h2>
          <p className="text-muted-foreground mb-4">Você precisa fazer login como administrador para acessar esta área</p>
          <Button onClick={() => window.location.href = "/admin/login"}>
            Login Administrativo
          </Button>
        </div>
      </div>
    );
  }

  const configSections = [
    {
      title: "Templates de Email",
      description: "Configure e gerencie modelos de email do sistema",
      icon: Mail,
      link: "/admin/templates",
      badge: "Ativo",
      color: "bg-green-100 text-green-700"
    },
    
    {
      title: "Banco de Dados",
      description: "Monitore performance e integridade dos dados",
      icon: Database,
      link: "/admin/database",
      badge: "Em breve",
      color: "bg-gray-100 text-gray-600"
    },
    {
      title: "Logs do Sistema",
      description: "Monitore atividades e eventos do sistema",
      icon: Activity,
      link: "/admin/logs",
      badge: "Em breve",
      color: "bg-gray-100 text-gray-600"
    },
    {
      title: "Relatórios",
      description: "Gere relatórios detalhados de uso e performance",
      icon: FileText,
      link: "/admin/reports",
      badge: "Em breve",
      color: "bg-gray-100 text-gray-600"
    },
    {
      title: "Segurança",
      description: "Configure políticas de segurança e auditoria",
      icon: Shield,
      link: "/admin/security",
      badge: "Em breve",
      color: "bg-gray-100 text-gray-600"
    },
    {
      title: "Configurações Gerais",
      description: "Configurações básicas do sistema e aplicação",
      icon: Settings,
      link: "/admin/general",
      badge: "Em breve", 
      color: "bg-gray-100 text-gray-600"
    },
    {
      title: "Notificações",
      description: "Configure alertas e notificações do sistema",
      icon: Bell,
      link: "/admin/notifications",
      badge: "Em breve",
      color: "bg-gray-100 text-gray-600"
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/admin" data-testid="button-back">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-primary" data-testid="app-title">GymSync</h1>
                <span className="ml-3 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                  Configurações Globais
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => window.location.href = "/api/logout"}
                data-testid="button-logout"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Settings className="w-8 h-8 text-primary mr-3" />
            <div>
              <h2 className="text-3xl font-bold text-foreground">Configurações Globais</h2>
              <p className="text-muted-foreground">Gerencie todas as configurações e funcionalidades administrativas do sistema</p>
            </div>
          </div>
        </div>

        {/* Configuration Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {configSections.map((section) => {
            const IconComponent = section.icon;
            const isEnabled = section.badge !== "Em breve";
            
            return (
              <Card 
                key={section.title} 
                className={`hover:shadow-md transition-all duration-200 ${
                  isEnabled ? 'hover:border-primary/20 cursor-pointer' : 'opacity-60'
                }`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        isEnabled ? 'bg-primary/10' : 'bg-gray-100'
                      }`}>
                        <IconComponent className={`w-6 h-6 ${
                          isEnabled ? 'text-primary' : 'text-gray-400'
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{section.title}</CardTitle>
                      </div>
                    </div>
                    <Badge className={section.color}>
                      {section.badge}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    {section.description}
                  </p>
                  
                  {isEnabled ? (
                    <Link href={section.link}>
                      <Button 
                        className="w-full"
                        data-testid={`button-${section.title.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        Acessar
                      </Button>
                    </Link>
                  ) : (
                    <Button 
                      className="w-full" 
                      disabled
                      data-testid={`button-${section.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      Em desenvolvimento
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Status do Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Database className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Database</p>
                    <p className="font-semibold text-green-600">Conectado</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email Service</p>
                    <p className="font-semibold text-blue-600">Ativo</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Autenticação</p>
                    <p className="font-semibold text-purple-600">Seguro</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Activity className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sistema</p>
                    <p className="font-semibold text-orange-600">Operacional</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <BottomNavigation activeView="academia" />
    </div>
  );
}