import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ExerciseGifPlayer, ExerciseGifGrid } from '@/components/exercise-gif-player';
import { findExerciseGif } from '@/lib/exercise-gifs';
import ExerciseDemo from '@/components/exercise-demo';

export default function TestGifs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [demoOpen, setDemoOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);

  // Exercícios de teste com base nos GIFs importados
  const sampleExercises = [
    {
      name: 'Supino com Halteres',
      group: 'Peitoral',
      sets: 3,
      reps: 12,
      weight: 20
    },
    {
      name: 'Rosca Direta com Barra', 
      group: 'Biceps',
      sets: 3,
      reps: 10,
      weight: 25
    },
    {
      name: 'Abdominal Bicicleta',
      group: 'Abdomen',
      sets: 3,
      reps: 15
    },
    {
      name: 'Prancha Frontal Alta',
      group: 'Abdomen', 
      sets: 3,
      reps: 30
    },
    {
      name: 'Rosca Martelo',
      group: 'Biceps',
      sets: 3,
      reps: 12,
      weight: 15
    },
    {
      name: 'Crucifixo com Halteres',
      group: 'Peitoral',
      sets: 3, 
      reps: 12,
      weight: 12
    },
    {
      name: 'Remada Curvada com Barra',
      group: 'Costas',
      sets: 3,
      reps: 10,
      weight: 30
    },
    {
      name: 'Elevação Lateral de Braços',
      group: 'Ombro',
      sets: 3,
      reps: 15,
      weight: 8
    }
  ];

  const openDemo = (exercise: any) => {
    setSelectedExercise({
      name: exercise.name,
      instructions: `Exercício de ${exercise.group.toLowerCase()}. Execute ${exercise.sets} séries de ${exercise.reps} repetições${exercise.weight ? ` com ${exercise.weight}kg` : ''}.`,
      gifUrl: findExerciseGif(exercise.name)
    });
    setDemoOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🏋️ Teste dos GIFs de Exercícios</h1>
        <p className="text-muted-foreground">
          Visualize os 477 GIFs importados do projeto FitnessTracker
        </p>
      </div>

      {/* Busca */}
      <Card>
        <CardHeader>
          <CardTitle>🔍 Buscar Exercício</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Digite o nome do exercício (ex: supino, rosca, abdominal...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
            data-testid="input-search-exercise"
          />
          
          {searchTerm && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Resultado da busca:</h4>
              <ExerciseGifPlayer
                exerciseName={searchTerm}
                size="lg"
                showControls={true}
                className="max-w-md mx-auto"
                data-testid="search-result-gif"
              />
              <p className="text-center text-sm text-muted-foreground mt-2">
                GIF encontrado: {findExerciseGif(searchTerm) ? '✅ Sim' : '❌ Não'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid de exercícios de exemplo */}
      <Card>
        <CardHeader>
          <CardTitle>🎯 Exercícios de Exemplo</CardTitle>
          <p className="text-sm text-muted-foreground">
            Clique em um exercício para ver a demonstração completa
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sampleExercises.map((exercise, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => openDemo(exercise)}
                data-testid={`exercise-card-${index}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">{exercise.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {exercise.group}
                    </Badge>
                  </div>
                  
                  <ExerciseGifPlayer
                    exerciseName={exercise.name}
                    exerciseGroup={exercise.group}
                    size="sm"
                    autoPlay={false}
                    showControls={false}
                    className="mb-2"
                  />
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>📊 {exercise.sets} séries × {exercise.reps} reps</div>
                    {exercise.weight && <div>🏋️ {exercise.weight}kg</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Estatísticas dos GIFs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">477</div>
              <div className="text-sm text-muted-foreground">GIFs Importados</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">13</div>
              <div className="text-sm text-muted-foreground">Grupos Musculares</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">100%</div>
              <div className="text-sm text-muted-foreground">Organizados</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">✅</div>
              <div className="text-sm text-muted-foreground">Prontos</div>
            </div>
          </div>
          
          <div className="mt-6 text-sm text-muted-foreground">
            <h4 className="font-semibold mb-2">Grupos disponíveis:</h4>
            <div className="flex flex-wrap gap-2">
              {[
                'Abdomen', 'Antebraço', 'Biceps', 'Cardio Academia', 'Costas',
                'Eretores da Espinha', 'Gluteo', 'Ombro', 'Panturrilha', 'Peitoral',
                'Posterior de Coxa', 'Quadriceps', 'Triceps'
              ].map((group) => (
                <Badge key={group} variant="outline" className="text-xs">
                  {group}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de demonstração */}
      {selectedExercise && (
        <ExerciseDemo
          isOpen={demoOpen}
          onClose={() => setDemoOpen(false)}
          exercise={selectedExercise}
        />
      )}
    </div>
  );
}