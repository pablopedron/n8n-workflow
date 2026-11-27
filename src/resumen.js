// Monta el mensaje con las mejores ofertas del día, en formato WhatsApp o Telegram.
const cfg = $('Configuración').first().json;
const stats = $('Normalizar y filtrar').first().json;
const nuevas = $('Guardar nuevas').all().filter((i) => i.json.es_nueva === true).length;

const todas = $input.all().map((i) => i.json);
const buenas = todas
  .filter((o) => o.puntuacion !== null && o.puntuacion !== undefined && o.puntuacion >= cfg.puntuacionMinima)
  .sort((a, b) => b.puntuacion - a.puntuacion);
const sinPuntuar = todas.filter((o) => o.id && o.puntuacion === null).length;

const barra = (p) => '●'.repeat(p) + '○'.repeat(10 - p);

// Cada canal tiene su formato: WhatsApp usa *negrita* y _cursiva_; Telegram, HTML
const formatos = {
  whatsapp: {
    max: 1500, // CallMeBot manda el texto en la URL: mejor mensajes cortos
    maxOfertas: 5,
    esc: (s = '') => String(s).replace(/[*_~`]/g, ''),
    negrita: (s) => `*${s}*`,
    cursiva: (s) => `_${s}_`,
    enlace: (texto, url) => `${texto}\n🔗 ${url}`,
  },
  telegram: {
    max: 3900, // límite de Telegram: 4096
    maxOfertas: 10,
    esc: (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    negrita: (s) => `<b>${s}</b>`,
    cursiva: (s) => `<i>${s}</i>`,
    enlace: (texto, url) => `<a href="${url}">${texto}</a>`,
  },
};

const canal = cfg.aviso === 'telegram' ? 'telegram' : 'whatsapp';
const f = formatos[canal];

let texto = `🎯 ${f.negrita('Cazador de ofertas')}\n`
  + `${stats.total_descargadas} revisadas · ${stats.total_filtradas} pasan el filtro · `
  + `${nuevas} nuevas · ${f.negrita(`${buenas.length} encajan contigo`)}\n`;

if (sinPuntuar) texto += `\n⏳ La IA no pudo puntuar ${sinPuntuar} oferta(s); se reintentará en la próxima ejecución.\n`;
if (stats.errores?.length) {
  texto += `\n⚠️ Fuentes con error: ${f.esc(stats.errores.join(' | ')).slice(0, 300)}\n`;
}

for (const o of buenas.slice(0, f.maxOfertas)) {
  const bloque = `\n${f.negrita(`${o.puntuacion}/10`)} ${barra(o.puntuacion)}\n`
    + `${f.enlace(f.esc(o.titulo), f.esc(o.url))}\n`
    + `🏢 ${f.esc(o.empresa ?? '—')} · 📍 ${f.esc(o.ubicacion ?? '—')}\n`
    + (o.tecnologias?.length ? `🧰 ${f.esc(o.tecnologias.join(', '))}\n` : '')
    + (o.motivo ? `💬 ${f.cursiva(f.esc(o.motivo))}\n` : '');
  if (texto.length + bloque.length > f.max) break;
  texto += bloque;
}

if (buenas.length > f.maxOfertas) texto += `\n…y ${buenas.length - f.maxOfertas} más en la base de datos.`;
if (buenas.length === 0) texto += '\nHoy no hay nada que merezca la pena. Mañana más 💪';

return [{
  json: {
    canal,
    texto,
    telefono: cfg.whatsappTelefono,
    chatId: cfg.telegramChatId,
  },
}];
