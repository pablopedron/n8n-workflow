#!/usr/bin/env bash
# Test de punta a punta: ejecuta el workflow real en n8n contra un servidor falso.
# Requisitos: n8n en el PATH (o N8N=/ruta/a/n8n), Postgres con db/init/01-schema.sql aplicado
# y las variables DB_* de n8n apuntando a esa base de datos.
set -euo pipefail
cd "$(dirname "$0")"
N8N="${N8N:-n8n}"

node mock-server.mjs & MOCK_PID=$!
trap 'kill $MOCK_PID 2>/dev/null' EXIT
sleep 1

node preparar-workflow.mjs
"$N8N" import:credentials --input=credenciales-e2e.json >/dev/null 2>&1
"$N8N" import:workflow --input=workflow-e2e.json >/dev/null 2>&1
"$N8N" execute --id=e2eCazadorOfertas1 --rawOutput > salida.log 2>&1 || true

if grep -q '/callmebot/whatsapp.php' peticiones.log; then
  echo "✔ El workflow terminó y envió el resumen por WhatsApp"
  grep '/callmebot/whatsapp.php' peticiones.log | tail -1 | node -e \
    'process.stdin.on("data",d=>console.log(new URL(JSON.parse(d).url,"http://x").searchParams.get("text")))'
elif grep -q '/sendMessage' peticiones.log; then
  echo "✔ El workflow terminó y envió el resumen a Telegram"
  grep '/sendMessage' peticiones.log | tail -1 | node -e \
    'process.stdin.on("data",d=>console.log(JSON.parse(JSON.parse(d).cuerpo).text))'
else
  echo "✘ El workflow no llegó a enviar el aviso. Mira tests/e2e/salida.log"; exit 1
fi
