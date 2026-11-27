// Convierte las respuestas de cada fuente a un formato común y aplica el filtro previo.
const cfg = $('Configuración').first().json;

const limpiarHtml = (html = '') => String(html)
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<br\s*\/?>|<\/p>|<\/li>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();

const aFecha = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const d = typeof v === 'number' ? new Date(v * 1000) : new Date(v);
  return isNaN(d) ? null : d.toISOString();
};

const desdeRemotive = (j) => ({
  fuente: 'remotive',
  id_externo: String(j.id),
  titulo: j.title,
  empresa: j.company_name ?? null,
  ubicacion: j.candidate_required_location || 'Remote',
  remoto: true,
  url: j.url,
  etiquetas: Array.isArray(j.tags) ? j.tags : [],
  descripcion: limpiarHtml(j.description),
  publicada_en: aFecha(j.publication_date),
});

const desdeArbeitnow = (j) => ({
  fuente: 'arbeitnow',
  id_externo: String(j.slug ?? j.url),
  titulo: j.title,
  empresa: j.company_name ?? null,
  ubicacion: j.location || (j.remote ? 'Remote' : null),
  remoto: Boolean(j.remote),
  url: j.url,
  etiquetas: [...(j.tags ?? []), ...(j.job_types ?? [])],
  descripcion: limpiarHtml(j.description),
  publicada_en: aFecha(j.created_at),
});

// 1. Normalizar todo lo que llega de las fuentes
const ofertas = [];
const errores = [];
for (const item of $input.all()) {
  const r = item.json;
  if (Array.isArray(r.jobs)) ofertas.push(...r.jobs.map(desdeRemotive));
  else if (Array.isArray(r.data)) ofertas.push(...r.data.map(desdeArbeitnow));
  else if (r.error) errores.push(r.error.message ?? String(r.error));
}

// 2. Filtro previo, sin gastar llamadas a la IA
const contiene = (texto, lista) => lista.some((p) => texto.includes(p));
const vistas = new Set();

const filtradas = ofertas.filter((o) => {
  if (!o.titulo || !o.url) return false;
  const clave = `${o.fuente}:${o.id_externo}`;
  if (vistas.has(clave)) return false;
  vistas.add(clave);

  const titulo = ` ${o.titulo.toLowerCase()} `;
  if (contiene(titulo, cfg.excluirTitulo)) return false;

  const texto = `${titulo} ${o.etiquetas.join(' ')} ${o.descripcion}`.toLowerCase();
  if (!contiene(texto, cfg.palabrasClave)) return false;

  const ubicacion = (o.ubicacion ?? '').toLowerCase();
  const ubicacionOk = contiene(ubicacion, cfg.ubicaciones)
    || (o.remoto && (ubicacion === '' || ubicacion === 'remote'));
  return ubicacionOk;
});

// Se manda todo en un solo item para insertarlo con una única consulta SQL
return [{
  json: {
    total_descargadas: ofertas.length,
    total_filtradas: filtradas.length,
    errores,
    ofertas: filtradas,
  },
}];
