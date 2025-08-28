import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UserForm } from "@/components/user-form";
import BottomNavigation from "../components/bottom-navigation";
import { Users, Search, Shield, Edit, Plus, Trash2, Eye } from "lucide-react";
import { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function AdminUsuarios() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newUserType, setNewUserType] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

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

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (userData: any) => 
      apiRequest("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(userData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowCreateForm(false);
      toast({
        title: "Usuário criado com sucesso!",
        description: "O novo usuário foi adicionado ao sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Erro ao criar usuário",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, userData }: { userId: string; userData: any }) => 
      apiRequest(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(userData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowEditForm(false);
      setSelectedUser(null);
      toast({
        title: "Usuário atualizado com sucesso!",
        description: "As informações do usuário foram salvas.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message || "Erro ao atualizar usuário",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => 
      apiRequest(`/api/admin/users/${userId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowDeleteDialog(false);
      setUserToDelete(null);
      toast({
        title: "Usuário excluído com sucesso!",
        description: "O usuário foi removido do sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message || "Erro ao excluir usuário",
        variant: "destructive",
      });
    },
  });

  // Update user type mutation (quick edit)
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

  const handleEditUserType = (userId: string, currentType: string) => {
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

  // Handle functions
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditForm(true);
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const handleCreateUser = (userData: any) => {
    createUserMutation.mutate(userData);
  };

  const handleUpdateUser = (userData: any) => {
    if (selectedUser) {
      updateUserMutation.mutate({ userId: selectedUser.id, userData });
    }
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  // Filter users based on search and type
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || user.userType === filterType;
    
    return matchesSearch && matchesType;
  });

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
                onClick={() => setShowCreateForm(true)}
                data-testid="button-create-user"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Usuário
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

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
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
            <div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger data-testid="select-filter-type">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="aluno">Alunos</SelectItem>
                  <SelectItem value="personal">Personal Trainers</SelectItem>
                  <SelectItem value="academia">Academia/Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                          <div className="flex space-x-1">
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditUser(user)}
                              data-testid={`button-edit-full-${index}`}
                              title="Editar usuário"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditUserType(user.id, user.userType)}
                              data-testid={`button-edit-type-${index}`}
                              title="Editar tipo rapidamente"
                            >
                              <Shield className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              data-testid={`button-delete-${index}`}
                              title="Excluir usuário"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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

      {/* Create User Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
          </DialogHeader>
          <UserForm
            onSubmit={handleCreateUser}
            onCancel={() => setShowCreateForm(false)}
            isSubmitting={createUserMutation.isPending}
            title="Cadastrar Novo Usuário"
          />
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <UserForm
              user={selectedUser}
              onSubmit={handleUpdateUser}
              onCancel={() => {
                setShowEditForm(false);
                setSelectedUser(null);
              }}
              isSubmitting={updateUserMutation.isPending}
              title="Editar Usuário"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong>?
              <br />
              Esta ação não pode ser desfeita e todos os dados do usuário serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteUserMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteUserMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}