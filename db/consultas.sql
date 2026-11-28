-- Consultas útiles. Ejecútalas con:
--   docker compose exec postgres psql -U n8n -d n8n

-- Top 10 ofertas sin revisar
SELECT * FROM cazador.pendientes LIMIT 10;

-- Qué tecnologías se piden más (útil para decidir qué estudiar)
SELECT * FROM cazador.tecnologias_mas_pedidas LIMIT 15;

-- Marcar una oferta como aplicada
UPDATE cazador.ofertas SET estado = 'aplicada' WHERE id = 42;

-- Ofertas encontradas por día y fuente
SELECT date_trunc('day', encontrada_en)::date AS dia, fuente, count(*)
FROM cazador.ofertas
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

-- Distribución de puntuaciones
SELECT puntuacion, count(*) FROM cazador.ofertas
WHERE puntuacion IS NOT NULL
GROUP BY 1 ORDER BY 1 DESC;
