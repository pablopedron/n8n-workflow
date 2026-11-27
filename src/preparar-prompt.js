// Construye la petición a la IA para cada oferta nueva (modo: una vez por item).
const cfg = $('Configuración').first().json;
const o = $json;

const sistema = `Eres un reclutador técnico que evalúa ofertas de empleo para un candidato concreto.
Responde SOLO con un objeto JSON válido con estas claves:
{"puntuacion": entero 0-10, "nivel": "junior"|"mid"|"senior"|"desconocido",
 "tecnologias": [máximo 8 strings], "motivo": "una frase en español, máximo 160 caracteres"}
Criterios: 10 = encaja perfecto con su stack y nivel; 0 = nada que ver.
Penaliza mucho si pide más de 3 años de experiencia o un nivel senior.
Penaliza si exige residir en un país donde el candidato no puede trabajar.`;

const usuario = `PERFIL DEL CANDIDATO:
${cfg.perfil}

OFERTA:
Título: ${o.titulo}
Empresa: ${o.empresa ?? 'desconocida'}
Ubicación: ${o.ubicacion ?? 'desconocida'} ${o.remoto ? '(remoto)' : ''}
Etiquetas: ${(o.etiquetas ?? []).join(', ')}
Descripción:
${String(o.descripcion ?? '').slice(0, 3000)}`;

return {
  json: {
    id: o.id,
    peticion: {
      model: cfg.ia.modelo,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sistema },
        { role: 'user', content: usuario },
      ],
    },
  },
};
