// ─────────────────────────────────────────────────────────────
//  CONFIGURACIÓN · edita este nodo para adaptarlo a tu perfil
// ─────────────────────────────────────────────────────────────
return [{
  json: {
    // Lo que lee la IA para decidir si una oferta encaja contigo
    perfil: `Estudiante de 2º de DAW (Desarrollo de Aplicaciones Web) en Valencia, España.
Busco mi primer empleo o prácticas como desarrollador web junior.
Stack: PHP (Laravel), JavaScript, HTML, CSS, SQL (MySQL/PostgreSQL), Java básico.
También: Docker, Git, CI/CD con Jenkins, nociones de AWS y Big Data.
Idiomas: español nativo, inglés técnico.
Prefiero remoto o presencial/híbrido en Valencia.`,

    // Filtro previo barato (sin IA): al menos una debe aparecer en título, etiquetas o descripción
    palabrasClave: ['php', 'laravel', 'javascript', 'typescript', 'frontend', 'front-end',
      'backend', 'back-end', 'full stack', 'fullstack', 'web developer', 'vue', 'react',
      'node', 'sql', 'java'],

    // Si el título contiene alguna, se descarta directamente
    excluirTitulo: ['senior', 'sr.', 'sr ', 'lead', 'staff', 'principal', 'head of',
      'manager', 'architect', 'director', 'vp '],

    // Ubicaciones aceptadas (se compara en minúsculas). Las ofertas remotas sin restricción también pasan.
    ubicaciones: ['worldwide', 'anywhere', 'europe', 'emea', 'spain', 'españa', 'valencia',
      'madrid', 'barcelona', 'cet', 'eu'],

    puntuacionMinima: 6,      // de 0 a 10: a partir de aquí sale en el resumen
    maxPorEjecucion: 25,      // tope de ofertas que se mandan a la IA por ejecución

    // Por dónde te llegan los avisos: 'whatsapp' (CallMeBot) o 'telegram'
    aviso: 'whatsapp',
    whatsappTelefono: '+34XXXXXXXXX',          // tu número, con prefijo de país
    telegramChatId: 'PON_AQUI_TU_CHAT_ID',     // solo si usas Telegram

    // Cualquier API compatible con OpenAI: Groq (gratis), OpenRouter, OpenAI, Ollama local...
    ia: {
      baseUrl: 'https://api.groq.com/openai/v1',
      modelo: 'openai/gpt-oss-120b',
    },
  },
}];
