function ok() {
  return ContentService
    .createTextOutput("OK");
}

function normalizarNumero(numero) {
  if (numero.startsWith("549")) {
    return "54" + numero.substring(3);
  }

  return numero;
}

function formatearFecha(fecha, formato) {
  return Utilities.formatDate(
    fecha,
    "America/Argentina/Buenos_Aires",
    formato
  );
}