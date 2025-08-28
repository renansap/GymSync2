import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import BottomNavigation from "../components/bottom-navigation";
import { Mail, Plus, Edit, Trash2, Send, Shield, Eye } from "lucide-react";
import { EmailTemplate } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function AdminTemplates() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  // Check admin authentication
  const { data: adminAuth, isLoading: isLoadingAdminAuth } = useQuery({
    queryKey: ["/api/admin/check"],
    retry: false,
  });

  // Fetch all templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/admin/email-templates"],
    enabled: adminAuth?.authenticated,
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: (templateData: any) => 
      apiRequest("POST", "/api/admin/email-templates", templateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      setShowCreateForm(false);
      toast({
        title: "Template criado com sucesso!",
        description: "O template de email foi adicionado ao sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar template",
        description: error.message || "Erro ao criar template de email",
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: ({ templateId, templateData }: { templateId: string; templateData: any }) => 
      apiRequest("PATCH", `/api/admin/email-templates/${templateId}`, templateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      setShowEditForm(false);
      setSelectedTemplate(null);
      toast({
        title: "Template atualizado com sucesso!",
        description: "As alterações foram salvas.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar template",
        description: error.message || "Erro ao atualizar template",
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId: string) => 
      apiRequest("DELETE", `/api/admin/email-templates/${templateId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      setShowDeleteDialog(false);
      setTemplateToDelete(null);
      toast({
        title: "Template excluído com sucesso!",
        description: "O template foi removido do sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir template",
        description: error.message || "Erro ao excluir template",
        variant: "destructive",
      });
    },
  });

  // Seed templates mutation
  const seedTemplatesMutation = useMutation({
    mutationFn: () => 
      apiRequest("POST", "/api/admin/seed-templates"),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      toast({
        title: "Templates padrão criados!",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar templates padrão",
        description: error.message || "Erro ao criar templates",
        variant: "destructive",
      });
    },
  });

  // Test email mutation
  const testEmailMutation = useMutation({
    mutationFn: ({ email, userType, templateType }: { email: string; userType: string; templateType: string }) => 
      apiRequest("POST", "/api/admin/test-email", { email, userType, templateType }),
    onSuccess: () => {
      setShowTestDialog(false);
      setTestEmail("");
      toast({
        title: "Email de teste enviado!",
        description: "Verifique a caixa de entrada do email informado.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar email de teste",
        description: error.message || "Erro ao enviar email",
        variant: "destructive",
      });
    },
  });

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setShowEditForm(true);
  };

  const handleDeleteTemplate = (template: EmailTemplate) => {
    setTemplateToDelete(template);
    setShowDeleteDialog(true);
  };

  const handleTestTemplate = (template: EmailTemplate) => {
    if (template.templateType === 'welcome') {
      setSelectedTemplate(template);
      setShowTestDialog(true);
    } else {
      toast({
        title: "Teste não disponível",
        description: "Apenas templates de boas-vindas podem ser testados no momento.",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteTemplate = () => {
    if (templateToDelete) {
      deleteTemplateMutation.mutate(templateToDelete.id);
    }
  };

  const confirmTestEmail = () => {
    if (selectedTemplate && testEmail) {
      testEmailMutation.mutate({
        email: testEmail,
        userType: selectedTemplate.userType,
        templateType: selectedTemplate.templateType,
      });
    }
  };

  const getUserTypeLabel = (type: string) => {
    const types = {
      'aluno': 'Aluno',
      'personal': 'Personal Trainer', 
      'academia': 'Academia/Admin'
    };
    return types[type as keyof typeof types] || type;
  };

  const getTemplateTypeLabel = (type: string) => {
    const types = {
      'welcome': 'Boas-vindas',
      'password_reset': 'Redefinição de Senha'
    };
    return types[type as keyof typeof types] || type;
  };

  if (isLoading || isLoadingAdminAuth) {
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
  if (!adminAuth?.authenticated) {
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

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary" data-testid="app-title">GymSync</h1>
              <span className="ml-3 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                Templates de Email
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline"
                onClick={() => seedTemplatesMutation.mutate()}
                disabled={seedTemplatesMutation.isPending}
                data-testid="button-seed-templates"
              >
                {seedTemplatesMutation.isPending ? "Criando..." : "Criar Templates Padrão"}
              </Button>
              <Button 
                onClick={() => setShowCreateForm(true)}
                data-testid="button-create-template"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Template
              </Button>
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
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Templates de Email</h2>
          <p className="text-muted-foreground">Gerencie os templates de email por tipo de usuário (Aluno, Personal Trainer, Academia)</p>
        </div>

        {/* Templates List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingTemplates ? (
            <div className="col-span-full text-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando templates...</p>
            </div>
          ) : templates.length > 0 ? (
            templates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{getTemplateTypeLabel(template.templateType)}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getUserTypeLabel(template.userType)}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      template.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {template.isActive ? 'Ativo' : 'Inativo'}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm">Assunto:</h4>
                      <p className="text-sm text-muted-foreground">{template.subject}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm">Conteúdo:</h4>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {template.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center pt-3 border-t">
                      <div className="flex space-x-2">
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditTemplate(template)}
                          data-testid={`button-edit-template-${template.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestTemplate(template)}
                          data-testid={`button-test-template-${template.id}`}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteTemplate(template)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-delete-template-${template.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <Mail className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum template encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Crie templates de email para diferentes tipos de usuário
              </p>
              <Button onClick={() => seedTemplatesMutation.mutate()}>
                Criar Templates Padrão
              </Button>
            </div>
          )}
        </div>
      </div>

      <BottomNavigation activeView="academia" />

      {/* Dialogs and forms would be added here */}
    </div>
  );
}