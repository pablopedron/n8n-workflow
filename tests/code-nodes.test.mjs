// Tests de los nodos Code sin necesidad de levantar n8n.
// Simulan las variables que n8n inyecta ($input, $json, $('Nodo')).
//   npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leer = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');
const src = (f) => leer(`../src/${f}`);
const fixture = (f) => JSON.parse(leer(`./fixtures/${f}`));
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

// Ejecuta el código de un nodo Code con un contexto falso
async function ejecutar(codigo, { items = [], json, nodos = {} } = {}) {
  const $ = (nombre) => {
    const salida = nodos[nombre];
    if (!salida) throw new Error(`Nodo no simulado: ${nombre}`);
    return {
      first: () => salida[0],
      all: () => salida,
      item: salida[0],
    };
  };
  const $input = { all: () => items, first: () => items[0] };
  return new AsyncFunction('$input', '$', '$json', codigo)($input, $, json);
}

const config = (await ejecutar(src('configuracion.js')))[0];

test('Configuración devuelve un único item con los campos necesarios', () => {
  for (const campo of ['perfil', 'palabrasClave', 'excluirTitulo', 'ubicaciones',
    'puntuacionMinima', 'maxPorEjecucion', 'ia']) {
    assert.ok(campo in config.json, `falta ${campo}`);
  }
});

test('Normalizar: unifica fuentes y aplica el filtro previo', async () => {
  const [salida] = await ejecutar(src('normalizar.js'), {
    items: [{ json: fixture('remotive.json') }, { json: fixture('arbeitnow.json') }],
    nodos: { 'Configuración': [config] },
  });
  const { ofertas, total_descargadas, errores } = salida.json;
  assert.equal(total_descargadas, 7);
  assert.deepEqual(errores, []);

  const ids = ofertas.map((o) => `${o.fuente}:${o.id_externo}`).sort();
  assert.deepEqual(ids, [
    'arbeitnow:java-dev-remote-789',        // remoto sin restricción
    'arbeitnow:web-developer-valencia-123', // Valencia
    'remotive:1001',                        // junior PHP en Europa
    'remotive:1004',                        // fullstack JS worldwide
  ]);
  // Descartadas: senior (título), solo USA (ubicación), data analyst (sin palabras clave)

  const php = ofertas.find((o) => o.id_externo === '1001');
  assert.equal(php.descripcion.includes('<'), false, 'el HTML se limpia');
  assert.match(php.descripcion, /PHP developer & Laravel/);
  assert.match(php.publicada_en, /^2026-11-2\dT\d\d:00:00\.000Z$/, 'fecha en ISO');

  const valencia = ofertas.find((o) => o.fuente === 'arbeitnow' && o.ubicacion.includes('Valencia'));
  assert.equal(valencia.publicada_en, new Date(1764150000 * 1000).toISOString());
  assert.deepEqual(valencia.etiquetas, ['php', 'full time']);
});

test('Normalizar: una fuente caída no rompe el resto', async () => {
  const [salida] = await ejecutar(src('normalizar.js'), {
    items: [{ json: { error: { message: '503 Service Unavailable' } } }, { json: fixture('arbeitnow.json') }],
    nodos: { 'Configuración': [config] },
  });
  assert.deepEqual(salida.json.errores, ['503 Service Unavailable']);
  assert.equal(salida.json.ofertas.length, 2);
});

test('Preparar prompt: construye una petición compatible con OpenAI', async () => {
  const salida = await ejecutar(src('preparar-prompt.js'), {
    json: { id: '7', titulo: 'Junior PHP', empresa: 'Acme', ubicacion: 'Europe', remoto: true,
      etiquetas: ['php'], descripcion: 'x'.repeat(10000) },
    nodos: { 'Configuración': [config] },
  });
  const { peticion } = salida.json;
  assert.equal(salida.json.id, '7');
  assert.equal(peticion.model, config.json.ia.modelo);
  assert.equal(peticion.messages.length, 2);
  assert.ok(peticion.messages[1].content.length < 4500, 'la descripción se recorta');
});

const interpretar = (contenido) => ejecutar(src('interpretar-respuesta.js'), {
  json: { choices: [{ message: { content: contenido } }] },
  nodos: { 'Preparar prompt': [{ json: { id: '7' } }] },
});

test('Interpretar: lee un JSON correcto', async () => {
  const r = await interpretar('{"puntuacion": 8, "nivel": "junior", "tecnologias": ["PHP","Laravel"], "motivo": "Encaja"}');
  assert.deepEqual(r.json, { id: '7', puntuacion: 8, nivel: 'junior', tecnologias: ['PHP', 'Laravel'], motivo: 'Encaja' });
});

test('Interpretar: acepta JSON dentro de ```json y limita la puntuación a 0-10', async () => {
  const r = await interpretar('```json\n{"puntuacion": 15, "nivel": "experto"}\n```');
  assert.equal(r.json.puntuacion, 10);
  assert.equal(r.json.nivel, 'desconocido');
});

test('Interpretar: si la IA falla, puntuación null (se reintenta otro día)', async () => {
  const r = await ejecutar(src('interpretar-respuesta.js'), {
    json: { error: { message: '429 Too Many Requests' } },
    nodos: { 'Preparar prompt': [{ json: { id: '7' } }] },
  });
  assert.equal(r.json.puntuacion, null);
});

test('Resumen: ordena, filtra por puntuación mínima y escapa HTML', async () => {
  const [salida] = await ejecutar(src('resumen.js'), {
    items: [
      { json: { id: '1', puntuacion: 5, titulo: 'Floja', url: 'https://a', empresa: 'A' } },
      { json: { id: '2', puntuacion: 9, titulo: 'Top <script>', url: 'https://b?x=1&y=2', empresa: 'B & Co', tecnologias: ['PHP'], motivo: 'Muy bien' } },
      { json: { id: '3', puntuacion: 7, titulo: 'Buena', url: 'https://c', empresa: 'C' } },
    ],
    nodos: {
      'Configuración': [config],
      'Normalizar y filtrar': [{ json: { total_descargadas: 100, total_filtradas: 20, errores: [] } }],
      'Guardar nuevas': [{ json: { id: '1', es_nueva: true } }, { json: { id: '2', es_nueva: true } }, { json: { id: '3', es_nueva: false } }],
    },
  });
  const { texto } = salida.json;
  assert.match(texto, /2 nuevas/);
  assert.match(texto, /2 encajan contigo/);
  assert.ok(texto.indexOf('9/10') < texto.indexOf('7/10'), 'ordenadas de mayor a menor');
  assert.equal(texto.includes('Floja'), false);
  assert.match(texto, /Top &lt;script&gt;/);
  assert.match(texto, /B &amp; Co/);
});

test('Resumen: mensaje aunque no haya nada nuevo', async () => {
  const [salida] = await ejecutar(src('resumen.js'), {
    items: [{ json: {} }],
    nodos: {
      'Configuración': [config],
      'Normalizar y filtrar': [{ json: { total_descargadas: 50, total_filtradas: 3, errores: [] } }],
      'Guardar nuevas': [{ json: {} }],
    },
  });
  assert.match(salida.json.texto, /0 nuevas/);
  assert.match(salida.json.texto, /Mañana más/);
});

test('Resumen: avisa de las ofertas que la IA no pudo puntuar', async () => {
  const [salida] = await ejecutar(src('resumen.js'), {
    items: [{ json: { id: '1', puntuacion: null, titulo: 'X', url: 'https://x' } }],
    nodos: {
      'Configuración': [config],
      'Normalizar y filtrar': [{ json: { total_descargadas: 5, total_filtradas: 1, errores: [] } }],
      'Guardar nuevas': [{ json: { id: '1', es_nueva: true } }],
    },
  });
  assert.match(salida.json.texto, /no pudo puntuar 1 oferta/);
});
