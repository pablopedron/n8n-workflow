// Lee la respuesta de la IA y la valida (modo: una vez por item).
// Si la IA falla o devuelve algo raro, la oferta se guarda con puntuación null y se reintenta otro día.
const oferta = $('Preparar prompt').item.json;

let r = {};
try {
  const contenido = $json.choices?.[0]?.message?.content ?? '';
  // Algunos modelos envuelven el JSON en ```json ... ```
  const limpio = contenido.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  r = JSON.parse(limpio);
} catch (e) {
  r = {};
}

const n = Number.parseInt(r.puntuacion, 10);
const puntuacion = Number.isFinite(n) ? Math.min(10, Math.max(0, n)) : null;
const niveles = ['junior', 'mid', 'senior', 'desconocido'];

return {
  json: {
    id: oferta.id,
    puntuacion,
    nivel: niveles.includes(r.nivel) ? r.nivel : 'desconocido',
    tecnologias: Array.isArray(r.tecnologias)
      ? r.tecnologias.filter((t) => typeof t === 'string').slice(0, 8)
      : [],
    motivo: typeof r.motivo === 'string' ? r.motivo.slice(0, 300) : null,
  },
};
