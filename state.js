function obtenerEstado(numero) {
  const memoria = PropertiesService.getScriptProperties();

  const raw = memoria.getProperty("estado_" + numero);

  if (!raw) {
    return null;
  }

  return JSON.parse(raw);
}

function guardarEstado(numero, data) {
  const memoria = PropertiesService.getScriptProperties();

  memoria.setProperty(
    "estado_" + numero,
    JSON.stringify(data)
  );
}

function limpiarEstado(numero) {
  const memoria = PropertiesService.getScriptProperties();

  memoria.deleteProperty("estado_" + numero);
}