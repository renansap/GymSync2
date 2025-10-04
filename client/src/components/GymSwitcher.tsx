import { useState } from 'react';
import { Building2, Check, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function GymSwitcher() {
  const { availableGyms, activeGymId, setActiveGym, user } = useAuth();
  const [isChanging, setIsChanging] = useState(false);

  // Só mostrar se o usuário tiver mais de uma academia disponível
  if (availableGyms.length <= 1) {
    return null;
  }

  const activeGym = availableGyms.find(gym => gym.id === activeGymId);

  const handleGymChange = async (gymId: string) => {
    if (gymId === activeGymId) return;

    try {
      setIsChanging(true);
      await setActiveGym(gymId);
      // Recarregar a página para refletir a mudança de academia
      window.location.reload();
    } catch (error) {
      console.error('Error changing gym:', error);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          disabled={isChanging}
          data-testid="button-gym-switcher"
        >
          <Building2 className="w-4 h-4" />
          <span className="hidden sm:inline" data-testid="text-active-gym-name">
            {activeGym?.name || 'Selecionar Academia'}
          </span>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" data-testid="dropdown-gym-list">
        {availableGyms.map((gym) => (
          <DropdownMenuItem
            key={gym.id}
            onClick={() => handleGymChange(gym.id)}
            className="cursor-pointer"
            data-testid={`dropdown-item-gym-${gym.id}`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="font-medium" data-testid={`text-gym-name-${gym.id}`}>
                  {gym.name}
                </span>
                {gym.city && gym.state && (
                  <span className="text-xs text-muted-foreground" data-testid={`text-gym-location-${gym.id}`}>
                    {gym.city}, {gym.state}
                  </span>
                )}
              </div>
              {gym.id === activeGymId && (
                <Check className="w-4 h-4 text-primary" data-testid={`icon-check-${gym.id}`} />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
