-- Esquema propio, separado de las tablas internas de n8n (que viven en "public")
CREATE SCHEMA IF NOT EXISTS cazador;

CREATE TABLE IF NOT EXISTS cazador.ofertas (
    id             BIGSERIAL PRIMARY KEY,
    fuente         TEXT        NOT NULL,              -- remotive | arbeitnow | ...
    id_externo     TEXT        NOT NULL,              -- id de la oferta en la fuente
    titulo         TEXT        NOT NULL,
    empresa        TEXT,
    ubicacion      TEXT,
    remoto         BOOLEAN,
    url            TEXT        NOT NULL,
    etiquetas      TEXT[]      NOT NULL DEFAULT '{}',
    descripcion    TEXT,
    publicada_en   TIMESTAMPTZ,
    encontrada_en  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Rellenado por la IA
    puntuacion     SMALLINT    CHECK (puntuacion BETWEEN 0 AND 10),
    nivel          TEXT,                              -- junior | mid | senior | desconocido
    tecnologias    TEXT[]      NOT NULL DEFAULT '{}',
    motivo         TEXT,
    puntuada_en    TIMESTAMPTZ,

    -- Seguimiento manual de candidaturas
    estado         TEXT        NOT NULL DEFAULT 'nueva'
                   CHECK (estado IN ('nueva', 'vista', 'aplicada', 'entrevista', 'descartada')),

    -- La clave de la deduplicación: una oferta nunca se procesa dos veces
    CONSTRAINT ofertas_fuente_id_externo_key UNIQUE (fuente, id_externo)
);

CREATE INDEX IF NOT EXISTS ofertas_puntuacion_idx    ON cazador.ofertas (puntuacion DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS ofertas_encontrada_en_idx ON cazador.ofertas (encontrada_en DESC);

-- Tecnologías más pedidas en las ofertas de los últimos 30 días
CREATE OR REPLACE VIEW cazador.tecnologias_mas_pedidas AS
SELECT lower(t) AS tecnologia, count(*) AS ofertas
FROM cazador.ofertas, unnest(tecnologias) AS t
WHERE encontrada_en > now() - interval '30 days'
GROUP BY 1
ORDER BY ofertas DESC;

-- Mejores ofertas aún sin revisar
CREATE OR REPLACE VIEW cazador.pendientes AS
SELECT id, puntuacion, titulo, empresa, ubicacion, url, motivo, encontrada_en
FROM cazador.ofertas
WHERE estado = 'nueva' AND puntuacion IS NOT NULL
ORDER BY puntuacion DESC, encontrada_en DESC;
