// ==========================================
// LÓGICA DE REGISTRO Y CANCELACIÓN DE TURNOS
// ==========================================

function registrarTurnoDefinitivo(numero, servicio, peluquero, dia, hora) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000); 

    const partesDia = dia.split("-");
    const partesHora = hora.split(":");
    const inicio = new Date(partesDia[2], partesDia[1] - 1, partesDia[0], partesHora[0], partesHora[1]);
    const fin = new Date(inicio.getTime() + INTERVALO_MINUTOS * 60000);

    const calendario = CalendarApp.getCalendarById(ID_CALENDARIO);
    
    const eventos = calendario.getEvents(inicio, fin);
    for (let i = 0; i < eventos.length; i++) {
      let tituloEvento = eventos[i].getTitle().toLowerCase();
      if (tituloEvento.includes(peluquero.toLowerCase()) && !tituloEvento.includes("cancelado")) {
        return false; 
      }
    }

    calendario.createEvent(`${peluquero} - ${servicio} (${numero})`, inicio, fin);

    const hoja = SpreadsheetApp.openById(ID_PLANILLA).getSheets()[0];
    const marcaTemporal = Utilities.formatDate(new Date(), "America/Argentina/Buenos_Aires", "dd/MM/yyyy HH:mm:ss");
    hoja.appendRow([
      marcaTemporal,
      numero,
      servicio,
      peluquero,
      `${dia} a las ${hora}`,
      "ACTIVO"
    ]);

    return true; 

  } catch (e) {
    console.error("Error al guardar turno: " + e.message);
    return false;
  } finally {
    lock.releaseLock();
  }
}

function ejecutarCancelacion(numeroCliente) {
  const memoria = PropertiesService.getScriptProperties();
  let strikes = parseInt(memoria.getProperty("strikes_" + numeroCliente) || "0");
  strikes++;
  
  let recienBloqueado = false;

  if (strikes >= 3) {
    memoria.setProperty("bloqueo_spam_" + numeroCliente, "SI");
    recienBloqueado = true;
  } else {
    memoria.setProperty("strikes_" + numeroCliente, strikes.toString());
  }
  memoria.deleteProperty("estado_" + numeroCliente);

  const calendario = CalendarApp.getCalendarById(ID_CALENDARIO);
  const ahora = new Date();
  const limiteBusqueda = new Date();
  limiteBusqueda.setDate(ahora.getDate() + 15);

  const eventos = calendario.getEvents(ahora, limiteBusqueda);
  let turnoCancelado = false;

  for (let i = 0; i < eventos.length; i++) {
    const evento = eventos[i];
    const titulo = evento.getTitle();

    if (titulo.includes(numeroCliente) && !titulo.toLowerCase().includes("cancelado")) {
      evento.setTitle("🚫 CANCELADO: " + titulo);
      evento.setColor(CalendarApp.EventColor.GRAY);
      turnoCancelado = true;
      break;
    }
  }

  if (turnoCancelado) {
    const hoja = SpreadsheetApp.openById(ID_PLANILLA).getSheets()[0];
    const datos = hoja.getDataRange().getValues();

    for (let i = datos.length - 1; i >= 1; i--) {
      const telefono = String(datos[i][1]).trim(); 
      const estado = String(datos[i][5]).trim().toUpperCase(); 

      if (telefono === String(numeroCliente).trim() && estado === "ACTIVO") {
        const fechaCancelacion = Utilities.formatDate(
          new Date(),
          "America/Argentina/Buenos_Aires",
          "dd/MM/yyyy HH:mm"
        );
        hoja.getRange(i + 1, 6).setValue("CANCELADO - " + fechaCancelacion);
        break; 
      }
    }
    
    if (recienBloqueado) {
      enviarMensaje(numeroCliente, "✅ Tu turno ha sido cancelado correctamente.\n\n⛔ *ATENCIÓN:* Has cancelado demasiados turnos consecutivos. Por seguridad, tu número ha sido bloqueado en nuestro sistema automático.\nPara volver a agendar, llamá al local.");
    } else {
      enviarMensaje(numeroCliente, "✅ Tu turno ha sido cancelado correctamente y el horario ya está disponible.");
    }

  } else {
    if (recienBloqueado) {
      enviarMensaje(numeroCliente, "⛔ Has cancelado demasiados turnos consecutivos. Por seguridad, tu número ha sido bloqueado en nuestro sistema automático.\nPara volver a agendar, llamá al local.");
    } else {
      enviarMensaje(numeroCliente, "✅ No encontré un turno activo para cancelar.");
    }
  }
}