import { MONTH_NAME } from '../data/season';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

export async function generateSwapMessage(params: {
  from: string;
  to: string;
  day: number;
  month: string;
  shift: string;
  note: string;
}): Promise<string> {
  const { from, to, day, month, shift, note } = params;
  const mn = (MONTH_NAME as Record<string, string>)[month] ?? month;

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system:
        'Eres el sistema de gestión de turnos de una piscina municipal. Redacta un mensaje corto, amable y directo en español estilo WhatsApp para pedir un cambio de turno entre socorristas. Solo el texto del mensaje, sin "Hola" al inicio, sin explicaciones. Máximo 2-3 frases.',
      messages: [
        {
          role: 'user',
          content: `${from} quiere pedirle un cambio de turno a ${to} para el día ${day} de ${mn} (turno: ${shift}).${note ? ' Motivo: ' + note : ''} Escribe el mensaje.`,
        },
      ],
    }),
  });

  const data = await res.json();
  return (
    data.content?.[0]?.text ??
    `¿Podrías cambiarme el turno del ${day} de ${mn}? Sería el turno de ${shift}.`
  );
}
