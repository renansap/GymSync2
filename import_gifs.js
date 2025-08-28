// Script para importar GIFs de exercícios do projeto FitnessTracker
// Como não podemos acessar diretamente o projeto privado, este script serve como guia

import fs from 'fs';
import path from 'path';
import https from 'https';

const GIFS_DIR = './client/public/gifs/exercises';

// Lista de exercícios comuns que provavelmente existem no FitnessTracker
const commonExercises = [
  'push-ups',
  'squats', 
  'burpees',
  'jumping-jacks',
  'plank',
  'lunges',
  'mountain-climbers',
  'sit-ups',
  'pull-ups',
  'deadlift',
  'bench-press',
  'bicep-curls',
  'tricep-dips',
  'shoulder-press',
  'leg-press',
  'calf-raises',
  'hip-thrust',
  'russian-twists',
  'high-knees',
  'butt-kicks'
];

// Função para baixar um GIF (exemplo)
async function downloadGif(exerciseName, url) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(GIFS_DIR, `${exerciseName}.gif`));
    
    https.get(url, (response) => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: ${exerciseName}.gif`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(path.join(GIFS_DIR, `${exerciseName}.gif`), () => {});
        reject(err);
      });
    }).on('error', reject);
  });
}

// Função para organizar GIFs por grupo muscular
function organizeGifsByMuscleGroup() {
  const muscleGroups = {
    'upper-body': ['push-ups', 'pull-ups', 'bench-press', 'bicep-curls', 'tricep-dips', 'shoulder-press'],
    'lower-body': ['squats', 'lunges', 'leg-press', 'calf-raises', 'hip-thrust'],
    'core': ['plank', 'sit-ups', 'russian-twists'],
    'cardio': ['burpees', 'jumping-jacks', 'mountain-climbers', 'high-knees', 'butt-kicks'],
    'full-body': ['deadlift']
  };

  Object.keys(muscleGroups).forEach(group => {
    const groupDir = path.join(GIFS_DIR, group);
    if (!fs.existsSync(groupDir)) {
      fs.mkdirSync(groupDir, { recursive: true });
      console.log(`📁 Created directory: ${group}`);
    }
  });
}

// Função para importar manualmente os GIFs
function setupManualImport() {
  console.log(`
📋 INSTRUÇÕES PARA IMPORTAR OS GIFS:

1. Acesse seu projeto FitnessTracker: https://replit.com/@renansap/FitnessTracker

2. Navegue até client/public/gifs/

3. Para cada arquivo GIF, faça o seguinte:
   - Clique com botão direito no arquivo
   - Selecione "Download" 
   - Salve na pasta correspondente em nosso projeto

4. Estrutura sugerida:
   client/public/gifs/exercises/
   ├── upper-body/
   ├── lower-body/
   ├── core/
   ├── cardio/
   └── full-body/

5. Após importar, execute: npm run organize-gifs

✨ Alternativa mais rápida:
   Se você tiver acesso ao código fonte do FitnessTracker, pode copiar
   toda a pasta client/public/gifs/ diretamente para este projeto.
  `);
}

// Função principal
function main() {
  console.log('🎯 Iniciando setup de importação de GIFs...');
  
  // Criar estrutura de diretórios
  organizeGifsByMuscleGroup();
  
  // Mostrar instruções
  setupManualImport();
  
  console.log('🚀 Setup concluído! Siga as instruções acima para importar os GIFs.');
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { downloadGif, organizeGifsByMuscleGroup, commonExercises };