import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ─── Generador del "Why" para una señal ────────────────────────
// Recibe datos de la señal y devuelve una explicación concisa
// basada en metodología SMC/ICT para traders retail

export async function generateSignalWhy(params: {
  asset: string
  direction: 'BUY' | 'SELL'
  market: string
  entryPrice: number
  stopLoss: number
  takeProfits: number[]
}): Promise<string> {
  const { asset, direction, market, entryPrice, stopLoss, takeProfits } = params

  const rr = Math.abs(
    (takeProfits[0]! - entryPrice) / (entryPrice - stopLoss)
  ).toFixed(2)

  const prompt = `Eres el mentor de Two-Nick Academy, experto en Smart Money Concept (SMC) e ICT.
Analiza esta señal de trading y escribe una explicación de máximo 2 oraciones para traders retail.
Menciona el concepto técnico más relevante (Order Block, FVG, Liquidity, BOS, CHoCH, estructura, etc).
Sé directo y educativo. No uses emojis.

Señal:
- Par/Activo: ${asset}
- Mercado: ${market}
- Dirección: ${direction}
- Precio de entrada: ${entryPrice}
- Stop Loss: ${stopLoss}
- Take Profit(s): ${takeProfits.join(', ')}
- Ratio R:R estimado: 1:${rr}

Responde SOLO con la explicación, sin títulos ni formato extra.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 120,
    temperature: 0.4,
  })

  return response.choices[0]?.message?.content?.trim() ?? 'Señal generada por análisis técnico avanzado.'
}
