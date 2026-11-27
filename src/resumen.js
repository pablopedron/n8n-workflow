// Monta el mensaje de Telegram con las mejores ofertas del día.
const cfg = $('Configuración').first().json;
const stats = $('Normalizar y filtrar').first().json;
const nuevas = $('Guardar nuevas').all().filter((i) => i.json.es_nueva === true).length;

const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const buenas = $input.all()
  .map((i) => i.json)
  .filter((o) => o.puntuacion !== null && o.puntuacion >= cfg.puntuacionMinima)
  .sort((a, b) => b.puntuacion - a.puntuacion);

const barra = (p) => '●'.repeat(p) + '○'.repeat(10 - p);

let texto = `<b>🎯 Cazador de ofertas</b>\n`
  + `${stats.total_descargadas} revisadas · ${stats.total_filtradas} pasan el filtro · `
  + `${nuevas} nuevas · <b>${buenas.length} encajan contigo</b>\n`;

const sinPuntuar = $input.all().filter((i) => i.json.id && i.json.puntuacion === null).length;
if (sinPuntuar) texto += `\n⏳ La IA no pudo puntuar ${sinPuntuar} oferta(s); se reintentará en la próxima ejecución.\n`;

if (stats.errores?.length) {
  texto += `\n⚠️ Fuentes con error: ${esc(stats.errores.join(' | ')).slice(0, 300)}\n`;
}

for (const o of buenas.slice(0, 10)) {
  const bloque = `\n<b>${o.puntuacion}/10</b> ${barra(o.puntuacion)}\n`
    + `<a href="${esc(o.url)}">${esc(o.titulo)}</a>\n`
    + `🏢 ${esc(o.empresa ?? '—')} · 📍 ${esc(o.ubicacion ?? '—')}\n`
    + (o.tecnologias?.length ? `🧰 ${esc(o.tecnologias.join(', '))}\n` : '')
    + (o.motivo ? `💬 <i>${esc(o.motivo)}</i>\n` : '');
  if (texto.length + bloque.length > 3900) break; // límite de Telegram: 4096
  texto += bloque;
}

if (buenas.length === 0) texto += '\nHoy no hay nada que merezca la pena. Mañana más 💪';

return [{ json: { texto, chatId: cfg.telegramChatId } }];
