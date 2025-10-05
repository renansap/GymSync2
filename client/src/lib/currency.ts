/**
 * Utilitários para formatação de moeda no padrão brasileiro (R$)
 */

/**
 * Formata um valor numérico para o padrão de moeda brasileiro (R$)
 * @param value - Valor numérico a ser formatado
 * @returns String formatada no padrão R$ (ex: "R$ 99,00")
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Converte centavos para reais
 * @param cents - Valor em centavos
 * @returns Valor em reais
 */
export const centsToReais = (cents: number): number => {
  return cents / 100;
};

/**
 * Converte reais para centavos
 * @param reais - Valor em reais
 * @returns Valor em centavos
 */
export const reaisToCents = (reais: number): number => {
  return Math.round(reais * 100);
};

/**
 * Formata um valor em centavos para o padrão de moeda brasileiro
 * @param cents - Valor em centavos
 * @returns String formatada no padrão R$ (ex: "R$ 99,00")
 */
export const formatCurrencyFromCents = (cents: number): string => {
  return formatCurrency(centsToReais(cents));
};
