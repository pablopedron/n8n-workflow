// Servidor falso que imita Remotive, Arbeitnow, la API de IA, CallMeBot (WhatsApp) y Telegram.
// Permite ejecutar el workflow completo de punta a punta sin internet ni claves.
import { createServer } from 'node:http';
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs';

const PUERTO = Number(process.env.PUERTO ?? 9999);
const fixture = (f) => readFileSync(new URL(`../fixtures/${f}`, import.meta.url), 'utf8');
const registro = new URL('./peticiones.log', import.meta.url);
writeFileSync(registro, '');

// Puntuación determinista según el título, para poder comprobar el resultado
const puntuar = (texto) => {
  if (/Junior PHP/.test(texto)) return { puntuacion: 9, nivel: 'junior', tecnologias: ['PHP', 'Laravel', 'MySQL'], motivo: 'Stack idéntico y nivel junior' };
  if (/Título: Web Developer/.test(texto)) return { puntuacion: 8, nivel: 'junior', tecnologias: ['PHP', 'JavaScript', 'SQL'], motivo: 'En Valencia y con tu stack' };
  if (/Full Stack JavaScript/.test(texto)) return { puntuacion: 6, nivel: 'mid', tecnologias: ['Vue', 'Node'], motivo: 'Buen stack, algo más de nivel' };
  return { puntuacion: 3, nivel: 'mid', tecnologias: ['Java', 'Spring'], motivo: 'Poco relacionado' };
};

createServer((req, res) => {
  let cuerpo = '';
  req.on('data', (c) => { cuerpo += c; });
  req.on('end', () => {
    appendFileSync(registro, JSON.stringify({ metodo: req.method, url: req.url, auth: req.headers.authorization ?? null, cuerpo }) + '\n');
    const json = (obj) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };

    if (req.url.startsWith('/remotive')) return json(JSON.parse(fixture('remotive.json')));
    if (req.url.startsWith('/arbeitnow')) return json(JSON.parse(fixture('arbeitnow.json')));
    if (req.url.startsWith('/ia/chat/completions')) {
      if (process.env.IA_FALLA) { res.writeHead(429, { 'content-type': 'application/json' }); return res.end('{"error":{"message":"Rate limit"}}'); }
      const { messages } = JSON.parse(cuerpo);
      return json({ choices: [{ message: { role: 'assistant', content: JSON.stringify(puntuar(messages[1].content)) } }] });
    }
    if (req.url.startsWith('/callmebot/whatsapp.php')) {
      const q = new URL(req.url, 'http://x').searchParams;
      if (!q.get('apikey')) { res.writeHead(401); return res.end('APIKey is invalid'); }
      res.writeHead(200, { 'content-type': 'text/html' });
      return res.end(`Message queued. You will receive it in a few seconds. (to ${q.get('phone')})`);
    }
    if (/^\/telegram\/bot[^/]+\/sendMessage/.test(req.url)) {
      return json({ ok: true, result: { message_id: 1, text: JSON.parse(cuerpo).text } });
    }
    res.writeHead(404); res.end('no encontrado');
  });
}).listen(PUERTO, () => console.log(`mock escuchando en :${PUERTO}`));
