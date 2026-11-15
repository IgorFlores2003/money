/** Data AAAA-MM-DD formatada em pt-BR (meio-dia evita pular de dia pelo fuso). */
export const formatDate = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", options);
