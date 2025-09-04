import OpenAI from "openai";
import { env } from './config/env';

const openai = new OpenAI({ 
  apiKey: env.OPENAI_API_KEY || "sk-no-key-set"
});

export interface WorkoutRequest {
  objetivo: string; // hipertrofia, emagrecimento, força, resistência
  nivel: string; // iniciante, intermediário, avançado
  diasPorSemana: number;
  historico?: string;
}

export interface ExerciseSet {
  series: number;
  repeticoes: string;
  peso?: string;
  descanso: string;
}

export interface WorkoutExercise {
  nome: string;
  grupo_muscular: string;
  instrucoes: string;
  sets: ExerciseSet;
}

export interface AIWorkoutResponse {
  nome: string;
  tipo: string;
  nivel: string;
  duracao_estimada: number;
  exercicios: WorkoutExercise[];
  observacoes: string[];
}

export async function generateWorkout(request: WorkoutRequest): Promise<AIWorkoutResponse> {
  try {
    const prompt = `
Você é um personal trainer experiente. Crie um treino personalizado baseado nas seguintes informações:

- Objetivo: ${request.objetivo}
- Nível: ${request.nivel}
- Dias por semana: ${request.diasPorSemana}
${request.historico ? `- Histórico: ${request.historico}` : ''}

Retorne um treino completo em formato JSON com a seguinte estrutura:
{
  "nome": "Nome do treino",
  "tipo": "tipo do treino",
  "nivel": "nível",
  "duracao_estimada": minutos_estimados,
  "exercicios": [
    {
      "nome": "Nome do exercício",
      "grupo_muscular": "grupo muscular trabalhado",
      "instrucoes": "instruções detalhadas de execução",
      "sets": {
        "series": número_de_séries,
        "repeticoes": "faixa de repetições (ex: 8-12)",
        "peso": "orientação de peso (ex: moderado, 70% 1RM)",
        "descanso": "tempo de descanso (ex: 60-90s)"
      }
    }
  ],
  "observacoes": ["dicas importantes", "cuidados especiais"]
}

Inclua 6-8 exercícios apropriados para o objetivo e nível especificados.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "Você é um personal trainer experiente especializado em criar treinos personalizados. Sempre responda em JSON válido."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const workoutData = JSON.parse(response.choices[0].message.content!);
    return workoutData as AIWorkoutResponse;
  } catch (error) {
    console.error("Error generating workout with AI:", error);
    throw new Error("Failed to generate workout with AI");
  }
}
