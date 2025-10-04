import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Building2, ChevronRight, LogOut } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Gym {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
}

export default function SelectGym() {
  const [, setLocation] = useLocation();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAvailableGyms();
  }, []);

  const fetchAvailableGyms = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/gyms/available', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar academias');
      }

      const data = await response.json();
      setGyms(data);
    } catch (error) {
      console.error('Erro ao carregar academias:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as academias disponíveis',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGym = async (gymId: string) => {
    try {
      setSelecting(gymId);
      const response = await fetch('/api/gyms/set-active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ gymId }),
      });

      if (!response.ok) {
        throw new Error('Erro ao selecionar academia');
      }

      toast({
        title: 'Sucesso',
        description: 'Academia selecionada com sucesso',
      });

      // Redirecionar para o hub da academia
      setLocation('/hub-academia');
    } catch (error) {
      console.error('Erro ao selecionar academia:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível selecionar a academia',
        variant: 'destructive'
      });
    } finally {
      setSelecting(null);
    }
  };

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      .then(() => {
        setLocation('/login');
      })
      .catch(console.error);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando academias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Selecione uma Academia
              </h1>
              <p className="text-gray-600">
                Escolha a academia que deseja gerenciar
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>

          {/* Gym Cards */}
          {gyms.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Nenhuma academia disponível
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2" data-testid="gym-list">
              {gyms.map((gym) => (
                <Card
                  key={gym.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleSelectGym(gym.id)}
                  data-testid={`card-gym-${gym.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-xl" data-testid={`text-gym-name-${gym.id}`}>
                            {gym.name}
                          </CardTitle>
                          {gym.city && gym.state && (
                            <CardDescription data-testid={`text-gym-location-${gym.id}`}>
                              {gym.city}, {gym.state}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-600">
                      {gym.address && (
                        <p data-testid={`text-gym-address-${gym.id}`}>
                          📍 {gym.address}
                        </p>
                      )}
                      {gym.phone && (
                        <p data-testid={`text-gym-phone-${gym.id}`}>
                          📞 {gym.phone}
                        </p>
                      )}
                      {gym.email && (
                        <p data-testid={`text-gym-email-${gym.id}`}>
                          ✉️ {gym.email}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {selecting && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-white rounded-lg p-6 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Selecionando academia...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
