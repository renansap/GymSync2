import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BottomNavigation from "../components/bottom-navigation";
import { Users, Search, Shield, Edit } from "lucide-react";
import { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function AdminUsuarios() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newUserType, setNewUserType] = useState<string>("");

  // Check admin authentication
  const { data: adminAuth, isLoading: isLoadingAdminAuth } = useQuery({
    queryKey: ["/api/admin/check"],
    retry: false,
  });

  // Fetch all users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: adminAuth?.authenticated,
  });

  // Update user type mutation
  const updateUserTypeMutation = useMutation({
    mutationFn: ({ userId, userType }: { userId: string; userType: string }) => 
      apiRequest(`/api/admin/users/${userId}/type`, {
        method: "PATCH",
        body: JSON.stringify({ userType }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditingUser(null);
      setNewUserType("");
      toast({
        title: "Tipo de usuário atualizado!",
        description: `Usuário agora é do tipo: ${variables.userType}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Erro ao atualizar tipo de usuário",
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (userId: string, currentType: string) => {
    setEditingUser(userId);
    setNewUserType(currentType);
  };

  const handleSaveUserType = (userId: string) => {
    if (!newUserType) return;
    updateUserTypeMutation.mutate({ userId, userType: newUserType });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setNewUserType("");
  };

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.userType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserTypeLabel = (type: string) => {
    const types = {
      'aluno': 'Aluno',
      'personal': 'Personal Trainer', 
      'academia': 'Academia/Admin'
    };
    return types[type as keyof typeof types] || type;
  };

  const getUserTypeColor = (type: string) => {
    const colors = {
      'aluno': 'bg-blue-100 text-blue-800',
      'personal': 'bg-green-100 text-green-800',
      'academia': 'bg-purple-100 text-purple-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // Count users by type
  const userStats = {
    alunos: users.filter(u => u.userType === 'aluno').length,
    personais: users.filter(u => u.userType === 'personal').length,
    academias: users.filter(u => u.userType === 'academia').length,
    total: users.length
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
                Gestão de Usuários
              </span>
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
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Gestão de Usuários</h2>
          <p className="text-muted-foreground">Gerencie os tipos de usuário do sistema (Aluno, Personal Trainer, Academia)</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Users className="text-blue-600 w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-blue-600" data-testid="text-total-alunos">{userStats.alunos}</p>
                  <p className="text-muted-foreground">Alunos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Shield className="text-green-600 w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-green-600" data-testid="text-total-personais">{userStats.personais}</p>
                  <p className="text-muted-foreground">Personal Trainers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Shield className="text-purple-600 w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-purple-600" data-testid="text-total-academias">{userStats.academias}</p>
                  <p className="text-muted-foreground">Academia/Admin</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <Users className="text-gray-600 w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-600" data-testid="text-total-users">{userStats.total}</p>
                  <p className="text-muted-foreground">Total de Usuários</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar usuários por nome, email ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingUsers ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando usuários...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="space-y-4">
                {filteredUsers.map((user, index) => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
                  >
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mr-4">
                        <span className="font-medium text-muted-foreground" data-testid={`text-user-initials-${index}`}>
                          {user.firstName?.[0] || ''}{user.lastName?.[0] || ''}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium" data-testid={`text-user-name-${index}`}>
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid={`text-user-email-${index}`}>
                          {user.email}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right flex items-center space-x-3">
                      {editingUser === user.id ? (
                        <div className="flex items-center space-x-2">
                          <Select value={newUserType} onValueChange={setNewUserType}>
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="aluno">Aluno</SelectItem>
                              <SelectItem value="personal">Personal Trainer</SelectItem>
                              <SelectItem value="academia">Academia/Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            size="sm" 
                            onClick={() => handleSaveUserType(user.id)}
                            disabled={updateUserTypeMutation.isPending}
                            data-testid={`button-save-${index}`}
                          >
                            {updateUserTypeMutation.isPending ? "..." : "Salvar"}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={handleCancelEdit}
                            data-testid={`button-cancel-${index}`}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span 
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUserTypeColor(user.userType)}`}
                            data-testid={`text-user-type-${index}`}
                          >
                            {getUserTypeLabel(user.userType)}
                          </span>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(user.id, user.userType)}
                            data-testid={`button-edit-${index}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? "Nenhum usuário encontrado para sua busca" : "Nenhum usuário encontrado"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNavigation activeView="academia" />
    </div>
  );
}