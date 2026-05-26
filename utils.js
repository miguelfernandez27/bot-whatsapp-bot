// ==========================================
// FUNCIONES UTILITARIAS GENERALES
// ==========================================

function formatearNumero(numero) {
  if (numero.startsWith("549")) {
    return "54" + numero.substring(3);
  }
  return numero;
}