import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="text-exercise-demo-title">{exercise.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Exercise GIF/Video placeholder */}
          <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
            {exercise.gifUrl ? (
              <img 
                src={exercise.gifUrl} 
                alt={exercise.name}
                className="w-full h-full object-cover rounded-lg"
                data-testid="img-exercise-demo"
              />
            ) : (
              <div className="text-center">
                <i className="fas fa-play text-4xl text-muted-foreground mb-2"></i>
                <p className="text-sm text-muted-foreground">Demo em breve</p>
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
