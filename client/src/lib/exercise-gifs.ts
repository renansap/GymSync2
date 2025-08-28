// Sistema de mapeamento de GIFs para exercícios
// Baseado nos 477 GIFs importados organizados por grupos musculares

export interface ExerciseGif {
  name: string;
  group: string;
  path: string;
  filename: string;
}

// Mapeamento dos grupos musculares
export const MUSCLE_GROUPS = {
  'Abdomen': 'core',
  'Antebraço': 'forearms', 
  'Biceps': 'biceps',
  'Cardio Academia': 'cardio',
  'Costas': 'back',
  'Eretores da Espinha': 'lower-back',
  'Gluteo': 'glutes',
  'Ombro': 'shoulders',
  'Panturrilha': 'calves',
  'Peitoral': 'chest',
  'Posterior de Coxa': 'hamstrings',
  'Quadriceps': 'quadriceps',
  'Triceps': 'triceps'
} as const;

// Função para buscar GIFs de um grupo específico
export async function getExerciseGifs(muscleGroup?: string): Promise<ExerciseGif[]> {
  const gifs: ExerciseGif[] = [];
  
  try {
    // Se não especificar grupo, busca todos
    const groups = muscleGroup ? [muscleGroup] : Object.keys(MUSCLE_GROUPS);
    
    for (const group of groups) {
      // Simula busca de arquivos - em produção seria uma API
      // Por enquanto, retorna estrutura baseada nos arquivos conhecidos
      const groupPath = `/gifs/exercises/${group}`;
      
      // Exemplos baseados nos arquivos que vimos
      if (group === 'Abdomen') {
        gifs.push(
          { name: 'Abdominal Bicicleta', group, path: `${groupPath}/Abdominal Bicicleta.gif`, filename: 'Abdominal Bicicleta.gif' },
          { name: 'Prancha Frontal Alta', group, path: `${groupPath}/Prancha Frontal Alta (1).gif`, filename: 'Prancha Frontal Alta (1).gif' },
          { name: 'Abdominal Russian Twist', group, path: `${groupPath}/Abdominal Russian Twist.gif`, filename: 'Abdominal Russian Twist.gif' }
        );
      }
      
      if (group === 'Biceps') {
        gifs.push(
          { name: 'Rosca Direta com Barra', group, path: `${groupPath}/Rosca Direta com Barra.gif`, filename: 'Rosca Direta com Barra.gif' },
          { name: 'Rosca Martelo', group, path: `${groupPath}/Rosca martelo.gif`, filename: 'Rosca martelo.gif' },
          { name: 'Rosca Concentrada', group, path: `${groupPath}/Rosca concentrada.gif`, filename: 'Rosca concentrada.gif' }
        );
      }
      
      if (group === 'Peitoral') {
        gifs.push(
          { name: 'Supino com Halteres', group, path: `${groupPath}/Supino com Halteres.gif`, filename: 'Supino com Halteres.gif' },
          { name: 'Crucifixo com Halteres', group, path: `${groupPath}/Crucifixo com halteres.gif`, filename: 'Crucifixo com halteres.gif' },
          { name: 'Flexão de Braço', group, path: `${groupPath}/Flexao de bracos.gif`, filename: 'Flexao de bracos.gif' }
        );
      }
    }
  } catch (error) {
    console.error('Erro ao buscar GIFs:', error);
  }
  
  return gifs;
}

// Função para buscar GIF específico por nome
export function findExerciseGif(exerciseName: string): string | null {
  // Normaliza o nome do exercício para busca
  const normalizedName = exerciseName
    .toLowerCase()
    .replace(/[àáâãä]/g, 'a')
    .replace(/[èéêë]/g, 'e') 
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/ç/g, 'c');
  
  // Mapeamento de exercícios comuns para GIFs
  const exerciseMap: Record<string, string> = {
    // Abdômen
    'abdominal': '/gifs/exercises/Abdomen/Abdominal Completo (1).gif',
    'prancha': '/gifs/exercises/Abdomen/Prancha Frontal Alta (1).gif',
    'russian twist': '/gifs/exercises/Abdomen/Abdominal Russian Twist.gif',
    'bicicleta': '/gifs/exercises/Abdomen/Abdominal Bicicleta.gif',
    
    // Bíceps  
    'rosca direta': '/gifs/exercises/Biceps/Rosca Direta com Barra.gif',
    'rosca martelo': '/gifs/exercises/Biceps/Rosca martelo.gif',
    'rosca concentrada': '/gifs/exercises/Biceps/Rosca concentrada.gif',
    'rosca alternada': '/gifs/exercises/Biceps/Rosca alternada com halteres sentado.gif',
    
    // Peitoral
    'supino': '/gifs/exercises/Peitoral/Supino com Halteres.gif',
    'crucifixo': '/gifs/exercises/Peitoral/Crucifixo com halteres.gif',
    'flexao': '/gifs/exercises/Peitoral/Flexao de bracos.gif',
    
    // Costas
    'remada': '/gifs/exercises/Costas/Remada Curvada com Barra.gif',
    'puxada': '/gifs/exercises/Costas/Puxada Alta.gif',
    'barra fixa': '/gifs/exercises/Costas/Barra fixa.gif',
    
    // Ombro
    'desenvolvimento': '/gifs/exercises/Ombro/Desenvolvimento de ombro com halteres em pé com pegada neutra.gif',
    'elevacao lateral': '/gifs/exercises/Ombro/Elevação lateral de braços com halteres.gif',
    'elevacao frontal': '/gifs/exercises/Ombro/Elevação frontal com halteres.gif',
    
    // Pernas
    'agachamento': '/gifs/exercises/Quadriceps/Agachamento com Barra.gif',
    'leg press': '/gifs/exercises/Quadriceps/Leg Press.gif',
    'stiff': '/gifs/exercises/Gluteo/stiff com barra.gif',
    'levantamento terra': '/gifs/exercises/Gluteo/levantamento terra com barra.gif'
  };
  
  // Busca por correspondência parcial
  for (const [key, path] of Object.entries(exerciseMap)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return path;
    }
  }
  
  return null;
}

// Função para listar todos os GIFs disponíveis (para desenvolvimento)
export async function getAllAvailableGifs(): Promise<Record<string, string[]>> {
  // Em produção, isso seria uma chamada à API
  // Por enquanto, retorna estrutura baseada nos arquivos conhecidos
  return {
    'Abdomen': [
      'Abd Concentrado Braços estendidos.gif',
      'Abdominal Bicicleta.gif', 
      'Abdominal com Carga.gif',
      'Prancha Frontal Alta (1).gif',
      'Abdominal Russian Twist.gif'
    ],
    'Biceps': [
      'Rosca Direta com Barra.gif',
      'Rosca martelo.gif',
      'Rosca concentrada.gif',
      'Rosca alternada com halteres sentado.gif'
    ],
    'Peitoral': [
      'Supino com Halteres.gif',
      'Crucifixo com halteres.gif', 
      'Flexao de bracos.gif',
      'Supino com barra declinado.gif'
    ],
    'Costas': [
      'Remada Curvada com Barra.gif',
      'Puxada Alta.gif',
      'Barra fixa.gif',
      'Serrote.gif'
    ]
  };
}