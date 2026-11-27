// Junta todos los items en uno solo para guardarlos con una única consulta SQL.
return [{ json: { puntuaciones: $input.all().map((i) => i.json) } }];
