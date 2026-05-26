// ==========================================
// MANEJO DE ESTADO Y MEMORIA
// ==========================================

function limpiarTurnoVencido(estadoUsuario, infoTurno, numeroCliente, memoria) {
  if (estadoUsuario === "CON_TURNO" && infoTurno.dia && infoTurno.hora) {
    const pDia = infoTurno.dia.split("-");
    const pHora = infoTurno.hora.split(":");
    const fechaDelTurno = new Date(pDia[2], pDia[1] - 1, pDia[0], pHora[0], pHora[1]);
    
    if (new Date() > fechaDelTurno) {
      memoria.deleteProperty("estado_" + numeroCliente); 
      memoria.deleteProperty("strikes_" + numeroCliente);
      return true; // El estado fue limpiado
    }
  }
  return false; // No estaba vencido
}

function limpiarBloqueosAutomaticos() {
  const memoria = PropertiesService.getScriptProperties();
  const todasLasPropiedades = memoria.getProperties();

  for (let clave in todasLasPropiedades) {
    if (clave.startsWith("strikes_") || clave.startsWith("bloqueo_spam_")) {
      memoria.deleteProperty(clave);
    }
  }
  
  console.log("✅ Limpieza automática de 12hs: Strikes y bloqueos eliminados.");
}