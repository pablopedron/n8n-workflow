// Genera workflows/*.json a partir del código de src/.
// Así el JavaScript de los nodos Code se puede leer, versionar y testear como código normal.
//   node scripts/build-workflow.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => readFileSync(join(raiz, 'src', f), 'utf8');
const sql = (f) => readFileSync(join(raiz, 'db', 'queries', f), 'utf8');

// IDs estables para que el diff en git sea limpio entre builds
let n = 0;
const id = () => `c4zad0r0-0000-4000-8000-${String(++n).padStart(12, '0')}`;

const cfg = "$('Configuración').first().json";

const nodos = [
  {
    name: 'Cada día a las 8:00',
    type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [0, 0],
    parameters: { rule: { interval: [{ field: 'cronExpression', expression: '0 8 * * *' }] } },
  },
  {
    name: 'Probar ahora',
    type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 200],
    parameters: {},
  },
  {
    name: 'Configuración',
    type: 'n8n-nodes-base.code', typeVersion: 2, position: [240, 100],
    parameters: { jsCode: src('configuracion.js') },
  },
  {
    name: 'Remotive',
    type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [480, 0],
    onError: 'continueRegularOutput', retryOnFail: true, maxTries: 3, waitBetweenTries: 5000,
    notes: 'API pública de remotive.com (máx. 4 peticiones/día, hay que citar la fuente)',
    parameters: {
      url: 'https://remotive.com/api/remote-jobs',
      sendQuery: true,
      queryParameters: { parameters: [
        { name: 'category', value: 'software-dev' },
        { name: 'limit', value: '150' },
      ] },
      options: { timeout: 30000, response: { response: { responseFormat: 'json' } } },
    },
  },
  {
    name: 'Arbeitnow',
    type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [480, 200],
    onError: 'continueRegularOutput', retryOnFail: true, maxTries: 3, waitBetweenTries: 5000,
    notes: 'API pública de arbeitnow.com (Europa, sin clave)',
    parameters: {
      url: 'https://www.arbeitnow.com/api/job-board-api',
      options: { timeout: 30000, response: { response: { responseFormat: 'json' } } },
    },
  },
  {
    name: 'Juntar fuentes',
    type: 'n8n-nodes-base.merge', typeVersion: 3, position: [720, 100],
    parameters: {},
  },
  {
    name: 'Normalizar y filtrar',
    type: 'n8n-nodes-base.code', typeVersion: 2, position: [940, 100],
    parameters: { jsCode: src('normalizar.js') },
  },
  {
    name: 'Guardar nuevas',
    type: 'n8n-nodes-base.postgres', typeVersion: 2.8, position: [1160, 100],
    alwaysOutputData: true,
    notes: 'Inserta las nuevas (ON CONFLICT DO NOTHING) y devuelve las que faltan por puntuar',
    parameters: {
      operation: 'executeQuery',
      query: sql('guardar-nuevas.sql'),
      options: {
        queryReplacement: `={{ JSON.stringify($json.ofertas) }}, {{ ${cfg}.maxPorEjecucion }}`,
      },
    },
  },
  {
    name: '¿Hay que puntuar?',
    type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [1380, 100],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{
          id: id(),
          leftValue: '={{ Boolean($json.id) }}',
          rightValue: '',
          operator: { type: 'boolean', operation: 'true', singleValue: true },
        }],
        combinator: 'and',
      },
      options: {},
    },
  },
  {
    name: 'Preparar prompt',
    type: 'n8n-nodes-base.code', typeVersion: 2, position: [1600, 0],
    parameters: { mode: 'runOnceForEachItem', jsCode: src('preparar-prompt.js') },
  },
  {
    name: 'Puntuar con IA',
    type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [1820, 0],
    onError: 'continueRegularOutput', retryOnFail: true, maxTries: 3, waitBetweenTries: 10000,
    notes: 'Cualquier API compatible con OpenAI. Credencial: Header Auth → Authorization: Bearer TU_CLAVE',
    parameters: {
      method: 'POST',
      url: `={{ ${cfg}.ia.baseUrl }}/chat/completions`,
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify($json.peticion) }}',
      options: {
        timeout: 60000,
        // Una oferta cada 4 s para no pasarse del límite gratuito
        batching: { batch: { batchSize: 1, batchInterval: 4000 } },
      },
    },
  },
  {
    name: 'Interpretar respuesta',
    type: 'n8n-nodes-base.code', typeVersion: 2, position: [2040, 0],
    parameters: { mode: 'runOnceForEachItem', jsCode: src('interpretar-respuesta.js') },
  },
  {
    name: 'Agrupar',
    type: 'n8n-nodes-base.code', typeVersion: 2, position: [2260, 0],
    parameters: { jsCode: src('agrupar.js') },
  },
  {
    name: 'Guardar puntuación',
    type: 'n8n-nodes-base.postgres', typeVersion: 2.8, position: [2480, 0],
    parameters: {
      operation: 'executeQuery',
      query: sql('guardar-puntuacion.sql'),
      options: { queryReplacement: '={{ JSON.stringify($json.puntuaciones) }}' },
    },
  },
  {
    name: 'Montar resumen',
    type: 'n8n-nodes-base.code', typeVersion: 2, position: [2700, 100],
    parameters: { jsCode: src('resumen.js') },
  },
  {
    name: 'Enviar a Telegram',
    type: 'n8n-nodes-base.telegram', typeVersion: 1.2, position: [2920, 100],
    parameters: {
      chatId: '={{ $json.chatId }}',
      text: '={{ $json.texto }}',
      additionalFields: { appendAttribution: false, parse_mode: 'HTML', disable_web_page_preview: true },
    },
  },
].map((nodo) => ({ id: id(), ...nodo }));

const enlace = (...destinos) => destinos.map((d) =>
  d.map(([node, index = 0]) => ({ node, type: 'main', index })));

const connections = {
  'Cada día a las 8:00': { main: enlace([['Configuración']]) },
  'Probar ahora': { main: enlace([['Configuración']]) },
  'Remotive': { main: enlace([['Juntar fuentes', 0]]) },
  'Arbeitnow': { main: enlace([['Juntar fuentes', 1]]) },
  'Juntar fuentes': { main: enlace([['Normalizar y filtrar']]) },
  'Normalizar y filtrar': { main: enlace([['Guardar nuevas']]) },
  'Guardar nuevas': { main: enlace([['¿Hay que puntuar?']]) },
  '¿Hay que puntuar?': { main: enlace([['Preparar prompt']], [['Montar resumen']]) },
  'Preparar prompt': { main: enlace([['Puntuar con IA']]) },
  'Puntuar con IA': { main: enlace([['Interpretar respuesta']]) },
  'Interpretar respuesta': { main: enlace([['Agrupar']]) },
  'Agrupar': { main: enlace([['Guardar puntuación']]) },
  'Guardar puntuación': { main: enlace([['Montar resumen']]) },
  'Montar resumen': { main: enlace([['Enviar a Telegram']]) },
  // "Configuración" sale por una única salida hacia las dos fuentes a la vez
  'Configuración': {
    main: [[{ node: 'Remotive', type: 'main', index: 0 }, { node: 'Arbeitnow', type: 'main', index: 0 }]],
  },
};

const workflow = {
  name: 'Cazador de ofertas',
  nodes: nodos,
  connections,
  settings: { executionOrder: 'v1', timezone: 'Europe/Madrid' },
  pinData: {},
  meta: { templateCredsSetupCompleted: false },
  tags: [],
};

// Workflow auxiliar: avisa por Telegram si el principal falla
const errores = {
  name: 'Cazador de ofertas · avisos de error',
  nodes: [
    {
      id: id(), name: 'Si falla un workflow', type: 'n8n-nodes-base.errorTrigger',
      typeVersion: 1, position: [0, 0], parameters: {},
    },
    {
      id: id(), name: 'Avisar por Telegram', type: 'n8n-nodes-base.telegram',
      typeVersion: 1.2, position: [240, 0],
      parameters: {
        chatId: 'PON_AQUI_TU_CHAT_ID',
        text: "=⚠️ Ha fallado «{{ $json.workflow.name }}»\nNodo: {{ $json.execution.lastNodeExecuted }}\nError: {{ $json.execution.error.message }}\n{{ $json.execution.url }}",
        additionalFields: { appendAttribution: false },
      },
    },
  ],
  connections: {
    'Si falla un workflow': { main: [[{ node: 'Avisar por Telegram', type: 'main', index: 0 }]] },
  },
  settings: { executionOrder: 'v1' },
  pinData: {},
};

writeFileSync(join(raiz, 'workflows', 'cazador-ofertas.json'), JSON.stringify(workflow, null, 2) + '\n');
writeFileSync(join(raiz, 'workflows', 'avisos-de-error.json'), JSON.stringify(errores, null, 2) + '\n');
console.log(`✔ ${nodos.length} nodos → workflows/cazador-ofertas.json`);
console.log('✔ workflows/avisos-de-error.json');
