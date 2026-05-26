// ==========================================
// CONSULTAS AL CALENDARIO Y DISPONIBILIDAD
// ==========================================

function enviarListaDias(numero) {
  const filasDias = obtenerProximosDiasContextuales();
  
  filasDias.push({ "id": "btn_volver", "title": "🔙 Volver al Inicio" });

  const payload = {
    "messaging_product": "whatsapp",
    "to": numero,
    "type": "interactive",
    "interactive": {
      "type": "list",
      "header": { "type": "text", "text": "🗓️ Días disponibles" },
      "body": { "text": "Por favor, tocá el botón y elegí el día:" },
      "action": {
        "button": "Elegir Día",
        "sections": [ { "title": "Próximos días", "rows": filasDias } ]
      }
    }
  };
  enviarAWhatsApp(payload);
}

function enviarListaHorarios(numero, diaElegido, peluquero) {
  const partes = diaElegido.split("-");
  const anio = parseInt(partes[2]);
  const mes = parseInt(partes[1]) - 1; 
  const dia = parseInt(partes[0]);
  const fechaBusqueda = new Date(anio, mes, dia);

  const calendario = CalendarApp.getDefaultCalendar();
  const eventosDelDia = calendario.getEventsForDay(fechaBusqueda);

  let horariosDisponibles = [];
  
  const diaDeLaSemana = fechaBusqueda.getDay(); 
  let horaAperturaDelDia = HORA_APERTURA; 
  if (diaDeLaSemana === 1) {
    horaAperturaDelDia = 16; 
  }

  let horaActual = new Date(anio, mes, dia, horaAperturaDelDia, 0, 0);
  const horaCierreFin = new Date(anio, mes, dia, HORA_CIERRE, 0, 0);
  let ahora = new Date();

  while (horaActual < horaCierreFin) {
    let finTurno = new Date(horaActual.getTime() + INTERVALO_MINUTOS * 60000);
    if (finTurno > horaCierreFin) break;

    let ocupado = false;

    if (horaActual < ahora) {
      ocupado = true;
    }

    for (let i = 0; i < eventosDelDia.length; i++) {
      let evento = eventosDelDia[i];
      let titulo = evento.getTitle().toLowerCase();
      
      if (titulo.includes(peluquero.toLowerCase()) && !titulo.includes("cancelado")) {
        if (horaActual < evento.getEndTime() && finTurno > evento.getStartTime()) {
          ocupado = true;
          break;
        }
      }
    }

    if (!ocupado) {
      let strHora = Utilities.formatDate(horaActual, "America/Argentina/Buenos_Aires", "HH:mm");
      horariosDisponibles.push({ "id": "hora_" + strHora, "title": strHora });
    }

    horaActual = new Date(horaActual.getTime() + INTERVALO_MINUTOS * 60000);

    if (horariosDisponibles.length >= 9) break;
  }

  if (horariosDisponibles.length === 0) {
    enviarMensaje(numero, `Lo siento, *${peluquero}* ya tiene la agenda llena para el ${diaElegido}. Escribí *Hola* para volver a empezar.`);
    return;
  }

  horariosDisponibles.push({ "id": "btn_volver", "title": "🔙 Volver al Inicio" });

  const payload = {
    "messaging_product": "whatsapp",
    "to": numero,
    "type": "interactive",
    "interactive": {
      "type": "list",
      "header": { "type": "text", "text": "⏰ Horarios" },
      "body": { "text": `Turnos libres con *${peluquero}* el ${diaElegido}:` },
      "action": {
        "button": "Ver Horarios",
        "sections": [ { "title": "Disponibles", "rows": horariosDisponibles } ]
      }
    }
  };
  enviarAWhatsApp(payload);
}

function obtenerProximosDiasContextuales() {
  const opcionesDias = [];
  const nombresDias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  let fechaActual = new Date();

  for (let i = 0; i < 15; i++) {
    let diaEvaluado = new Date(fechaActual.getTime() + (i * 24 * 60 * 60 * 1000));
    let numDiaDeLaSemana = diaEvaluado.getDay();

    if (numDiaDeLaSemana !== 0) { // Salteamos los domingos
      let strFechaCorto = Utilities.formatDate(diaEvaluado, "America/Argentina/Buenos_Aires", "dd/MM");
      let strIdFecha = Utilities.formatDate(diaEvaluado, "America/Argentina/Buenos_Aires", "dd-MM-yyyy");

      let tituloMostrar = nombresDias[numDiaDeLaSemana] + " " + strFechaCorto;
      if (i === 0) tituloMostrar = "Hoy (" + strFechaCorto + ")";
      if (i === 1) tituloMostrar = "Mañana (" + strFechaCorto + ")";

      opcionesDias.push({ "id": "dia_" + strIdFecha, "title": tituloMostrar });
    }

    if (opcionesDias.length === 6) break; 
  }
  return opcionesDias;
}