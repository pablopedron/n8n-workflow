// Copia el workflow real apuntando las URLs externas al servidor falso.
import { readFileSync, writeFileSync } from 'node:fs';

const MOCK = process.env.MOCK_URL ?? 'http://localhost:9999';
const wf = JSON.parse(readFileSync(new URL('../../workflows/cazador-ofertas.json', import.meta.url), 'utf8'));
const nodo = (n) => wf.nodes.find((x) => x.name === n);

wf.id = 'e2eCazadorOfertas1';
wf.name = 'Cazador de ofertas (e2e)';
nodo('Remotive').parameters.url = `${MOCK}/remotive`;
nodo('Arbeitnow').parameters.url = `${MOCK}/arbeitnow`;
nodo('Configuración').parameters.jsCode = nodo('Configuración').parameters.jsCode
  .replace("'https://api.groq.com/openai/v1'", `'${MOCK}/ia'`)
  .replace("'PON_AQUI_TU_CHAT_ID'", "'123456'");
nodo('Puntuar con IA').parameters.options.batching.batch.batchInterval = 0;
nodo('Puntuar con IA').waitBetweenTries = 0;

// Asigna las credenciales de prueba
nodo('Guardar nuevas').credentials = { postgres: { id: 'e2ePostgres000001', name: 'Postgres e2e' } };
nodo('Guardar puntuación').credentials = { postgres: { id: 'e2ePostgres000001', name: 'Postgres e2e' } };
nodo('Puntuar con IA').credentials = { httpHeaderAuth: { id: 'e2eIaHeader000001', name: 'IA e2e' } };
nodo('Enviar a Telegram').credentials = { telegramApi: { id: 'e2eTelegram000001', name: 'Telegram e2e' } };

writeFileSync(new URL('./workflow-e2e.json', import.meta.url), JSON.stringify(wf, null, 2));
writeFileSync(new URL('./credenciales-e2e.json', import.meta.url), JSON.stringify([
  { id: 'e2ePostgres000001', name: 'Postgres e2e', type: 'postgres',
    data: { host: process.env.PGHOST ?? 'localhost', port: 5432, database: 'n8n', user: 'n8n', password: process.env.PGPASSWORD ?? '', ssl: 'disable' } },
  { id: 'e2eIaHeader000001', name: 'IA e2e', type: 'httpHeaderAuth',
    data: { name: 'Authorization', value: 'Bearer clave-de-prueba' } },
  { id: 'e2eTelegram000001', name: 'Telegram e2e', type: 'telegramApi',
    data: { accessToken: 'TOKEN_PRUEBA', baseUrl: `${MOCK}/telegram` } },
], null, 2));
console.log('✔ workflow-e2e.json y credenciales-e2e.json listos');
