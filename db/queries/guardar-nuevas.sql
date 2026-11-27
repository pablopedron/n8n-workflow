-- $1 = array JSON con las ofertas normalizadas · $2 = máximo a puntuar
WITH entrada AS (
    SELECT *
    FROM jsonb_to_recordset($1::jsonb) AS x(
        fuente text, id_externo text, titulo text, empresa text, ubicacion text,
        remoto boolean, url text, etiquetas jsonb, descripcion text, publicada_en timestamptz
    )
),
insertadas AS (
    INSERT INTO cazador.ofertas
        (fuente, id_externo, titulo, empresa, ubicacion, remoto, url, etiquetas, descripcion, publicada_en)
    SELECT fuente, id_externo, titulo, empresa, ubicacion, remoto, url,
           ARRAY(SELECT jsonb_array_elements_text(coalesce(etiquetas, '[]'::jsonb))),
           descripcion, publicada_en
    FROM entrada
    ON CONFLICT ON CONSTRAINT ofertas_fuente_id_externo_key DO NOTHING
    RETURNING id, titulo, empresa, ubicacion, remoto, etiquetas, descripcion, true AS es_nueva
),
pendientes AS (
    -- Ofertas de días anteriores que la IA no pudo puntuar: se reintentan
    SELECT id, titulo, empresa, ubicacion, remoto, etiquetas, descripcion, false AS es_nueva
    FROM cazador.ofertas
    WHERE puntuacion IS NULL AND encontrada_en > now() - interval '7 days'
)
SELECT * FROM (
    SELECT * FROM insertadas
    UNION ALL
    SELECT * FROM pendientes
) t
ORDER BY es_nueva DESC, id DESC
LIMIT $2::int;
