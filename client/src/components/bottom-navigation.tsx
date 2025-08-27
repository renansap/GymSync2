import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Dumbbell, Bus, Building, LogOut } from "lucide-react";

interface BottomNavigationProps {
  activeView: "aluno" | "personal" | "academia";
}

export default function BottomNavigation({ activeView }: BottomNavigationProps) {
  const [, navigate] = useLocation();

  const handleNavigation = (view: string) => {
    navigate(`/${view}`);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden">
      <div className="grid grid-cols-4 h-16">
        <button 
          onClick={() => handleNavigation('aluno')}
          className={cn(
            "flex flex-col items-center justify-center space-y-1 transition-colors",
            activeView === 'aluno' ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
          data-testid="button-nav-aluno"
        >
          <Dumbbell className="w-5 h-5" />
          <span className="text-xs">Treino</span>
        </button>
        
        <button 
          onClick={() => handleNavigation('personal')}
          className={cn(
            "flex flex-col items-center justify-center space-y-1 transition-colors",
            activeView === 'personal' ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
          data-testid="button-nav-personal"
        >
          <Bus className="w-5 h-5" />
          <span className="text-xs">Personal</span>
        </button>
        
        <button 
          onClick={() => handleNavigation('academia')}
          className={cn(
            "flex flex-col items-center justify-center space-y-1 transition-colors",
            activeView === 'academia' ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
          data-testid="button-nav-academia"
        >
          <Building className="w-5 h-5" />
          <span className="text-xs">Academia</span>
        </button>
      </div>
    </nav>
  );
}
