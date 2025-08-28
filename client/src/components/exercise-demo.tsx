import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { findExerciseGif } from "@/lib/exercise-gifs";

interface ExerciseDemoProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: {
    name: string;
    instructions: string;
    gifUrl?: string;
  };
}

export default function ExerciseDemo({ isOpen, onClose, exercise }: ExerciseDemoProps) {
  // Busca GIF automaticamente se não foi fornecido
  const gifUrl = exercise.gifUrl || findExerciseGif(exercise.name);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="text-exercise-demo-title">{exercise.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Exercise GIF/Video demonstration */}
          <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
            {gifUrl ? (
              <img 
                src={gifUrl} 
                alt={`Demonstração do exercício: ${exercise.name}`}
                className="w-full h-full object-cover rounded-lg"
                data-testid="img-exercise-demo"
                loading="lazy"
              />
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-2">🏋️</div>
                <p className="text-sm text-muted-foreground">Demonstração do exercício</p>
                <p className="text-xs mt-1">{exercise.name}</p>
              </div>
            )}
          </div>
          
          {/* Instructions */}
          <div>
            <h4 className="font-semibold mb-2">Instruções:</h4>
            <p className="text-sm text-muted-foreground" data-testid="text-exercise-instructions">
              {exercise.instructions || "Instruções detalhadas em breve."}
            </p>
          </div>
          
          <Button onClick={onClose} className="w-full" data-testid="button-close-demo">
            Entendi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
