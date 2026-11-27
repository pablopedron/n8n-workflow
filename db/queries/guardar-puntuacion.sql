-- $1 = array JSON con {id, puntuacion, nivel, tecnologias, motivo}
UPDATE cazador.ofertas AS o
SET puntuacion  = p.puntuacion,
    nivel       = p.nivel,
    tecnologias = ARRAY(SELECT jsonb_array_elements_text(coalesce(p.tecnologias, '[]'::jsonb))),
    motivo      = p.motivo,
    puntuada_en = CASE WHEN p.puntuacion IS NULL THEN NULL ELSE now() END
FROM jsonb_to_recordset($1::jsonb) AS p(
    id bigint, puntuacion smallint, nivel text, tecnologias jsonb, motivo text
)
WHERE o.id = p.id
RETURNING o.id, o.titulo, o.empresa, o.ubicacion, o.url, o.puntuacion, o.nivel, o.tecnologias, o.motivo;
