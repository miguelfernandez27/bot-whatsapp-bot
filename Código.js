// --- CONFIGURACIÓN ---
const token = PropertiesService.getScriptProperties().getProperty('VERIFY_TOKEN');
const TOKEN_META = PropertiesService.getScriptProperties().getProperty('TOKEN_META');
const ID_NUMERO = "1062341756953619";
const ID_CALENDARIO = PropertiesService.getScriptProperties().getProperty('ID_CALENDARIO');
const ID_PLANILLA = PropertiesService.getScriptProperties().getProperty('ID_PLANILLA');
const HORA_APERTURA = 10; 
const HORA_CIERRE = 21;   
const INTERVALO_MINUTOS = 45; 

function doGet(e) {
  if (e.parameter['hub.verify_token'] === token) {
    return ContentService.createTextOutput(e.parameter['hub.challenge']);
  }
  return ContentService.createTextOutput("Error de validación");
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (!data.entry || !data.entry[0].changes[0].value.messages) {
      return ContentService.createTextOutput("OK");
    }

    const msg = data.entry[0].changes[0].value.messages[0];
    let numeroCliente = msg.from;

    if (numeroCliente.startsWith("549")) {
      numeroCliente = "54" + numeroCliente.substring(3);
    }

    const memoria = PropertiesService.getScriptProperties();
    const datosGuardados = memoria.getProperty("estado_" + numeroCliente);

    let estadoUsuario = null;
    let infoTurno = { paso: "NINGUNO" };

    if (datosGuardados) {
      try {
        infoTurno = JSON.parse(datosGuardados);
        estadoUsuario = infoTurno.estado;
      } catch (err) {
        estadoUsuario = datosGuardados;
      }
    }

    // --- 🧹 AUTO-LIMPIEZA DE TURNOS VENCIDOS ---
    if (estadoUsuario === "CON_TURNO" && infoTurno.dia && infoTurno.hora) {
      const pDia = infoTurno.dia.split("-");
      const pHora = infoTurno.hora.split(":");
      const fechaDelTurno = new Date(pDia[2], pDia[1] - 1, pDia[0], pHora[0], pHora[1]);
      
      if (new Date() > fechaDelTurno) {
        memoria.deleteProperty("estado_" + numeroCliente); 
        estadoUsuario = null; 
        infoTurno = { paso: "NINGUNO" };
        memoria.deleteProperty("strikes_" + numeroCliente);
      }
    }
    
    // --- 🛡️ SISTEMA ANTI-SPAM---
    const estaBloqueado = memoria.getProperty("bloqueo_spam_" + numeroCliente);
    if (estaBloqueado === "SI") {
      if (msg.type === "text") {
        enviarMensaje(numeroCliente, "⛔ *ACCESO RESTRINGIDO*\nHas superado el límite de cancelaciones permitidas. Por favor, para agendar un turno comunicate por llamada telefónica al local.");
      }
      return ContentService.createTextOutput("OK");
    }

    // ==========================================
    // RESPUESTA A BOTONES INTERACTIVOS
    // ==========================================
    if (msg.type === "interactive") {

      let idInteractivo = "";
      if (msg.interactive.type === "button_reply") {
        idInteractivo = msg.interactive.button_reply.id;
      } else if (msg.interactive.type === "list_reply") {
        idInteractivo = msg.interactive.list_reply.id;
      }

      // --- BOTÓN: VOLVER AL PRINCIPIO ---
      if (idInteractivo === "btn_volver") {
        memoria.deleteProperty("estado_" + numeroCliente);
        enviarMenu(numeroCliente);
        return ContentService.createTextOutput("OK");
      }

      // --- BOTÓN: CANCELAR TURNO ---
      if (idInteractivo === "btn_cancelar") {
        ejecutarCancelacion(numeroCliente);
        return ContentService.createTextOutput("OK");
      }

      // --- SI EL USUARIO YA TIENE TURNO ---
      if (estadoUsuario === "CON_TURNO") {
        enviarMensajeConBotonCancelar(numeroCliente, "⏳ Ya tenés un turno agendado.\nSi necesitás darlo de baja, tocá el botón de abajo:");
        return ContentService.createTextOutput("OK");
      }

      if (idInteractivo === "btn_turno") {
        enviarBotonesServicios(numeroCliente);
      } 
      else if (idInteractivo === "serv_corte") {
        peluqueros(numeroCliente, "Corte");
      } 
      else if (idInteractivo === "serv_barba") {
        peluqueros(numeroCliente, "Barba");
      } 
      else if (idInteractivo === "serv_corteybarba") {
        peluqueros(numeroCliente, "Corte y Barba");
      }
      else if (idInteractivo === "serv_completo") {
        peluqueros(numeroCliente, "Corte, Barba y Cejas");
      }
      else if (idInteractivo.startsWith("peluquero_")) {
        const partes = idInteractivo.split("_");
        const nombrePeluquero = partes[1].charAt(0).toUpperCase() + partes[1].slice(1);
        
        let servicioReal = "Corte";
        if (partes[2] === "barba") servicioReal = "Barba";
        else if (partes[2] === "cortebarba") servicioReal = "Corte y Barba";
        else if (partes[2] === "completo") servicioReal = "Corte, Barba y Cejas";

        infoTurno.paso = "ESPERANDO_DIA";
        infoTurno.servicio = servicioReal;
        infoTurno.peluquero = nombrePeluquero;

        memoria.setProperty("estado_" + numeroCliente, JSON.stringify(infoTurno));
        enviarListaDias(numeroCliente);
      }
      else if (idInteractivo.startsWith("dia_")) {
        const diaElegido = idInteractivo.split("_")[1];

        infoTurno.paso = "ESPERANDO_HORA";
        infoTurno.dia = diaElegido;

        memoria.setProperty("estado_" + numeroCliente, JSON.stringify(infoTurno));
        enviarListaHorarios(numeroCliente, diaElegido, infoTurno.peluquero);
      }
      else if (idInteractivo.startsWith("hora_")) {
        const horaElegida = idInteractivo.split("_")[1];

        enviarMensaje(numeroCliente, "⏳ Procesando tu turno...");

        let exito = registrarTurnoDefinitivo(
          numeroCliente,
          infoTurno.servicio,
          infoTurno.peluquero,
          infoTurno.dia,
          horaElegida
        );

        if (exito) {
          infoTurno.estado = "CON_TURNO";
          infoTurno.hora = horaElegida;
          memoria.setProperty("estado_" + numeroCliente, JSON.stringify(infoTurno));

          // Usamos la nueva función con el Botón Cancelar
          enviarMensajeConBotonCancelar(
            numeroCliente,
            `✅ *¡TURNO CONFIRMADO!*\n\n💈 Servicio: ${infoTurno.servicio}\n💇‍♂️ Peluquero: ${infoTurno.peluquero}\n📅 Fecha: ${infoTurno.dia}\n⏰ Hora: ${horaElegida}\n\n📍 Te esperamos en *Sanfrez Studio*\nCrisólogo Larralde 6560 (entre Salcedo y Victor Hugo).`
          );
        } else {
          enviarMensaje(numeroCliente, "⚠️ Ese horario ya fue tomado. Elegí otro.");
          enviarListaHorarios(numeroCliente, infoTurno.dia, infoTurno.peluquero);
        }
      }
    }

    // ==========================================
    // RESPUESTA A TEXTO
    // ==========================================
    else if (msg.type === "text") {

      let textoRecibido = msg.text.body.toLowerCase();

      const NUMEROS_ADMIN = ["541121799988"]; // Entre comillas y , mas numeros.
      
      if (NUMEROS_ADMIN.includes(numeroCliente) && textoRecibido.startsWith("desbloquear")) {
        // El formato que van a usar es: "desbloquear 541122334455"
        let partesComando = textoRecibido.split(" ");
        
        if (partesComando.length > 1) {
          let numeroADesbloquear = partesComando[1].trim();

          memoria.deleteProperty("bloqueo_spam_" + numeroADesbloquear);
          memoria.deleteProperty("strikes_" + numeroADesbloquear);

          enviarMensaje(numeroCliente, `✅ Listo El número ${numeroADesbloquear} fue desbloqueado,ya cuenta con acceso al bot.`);
        } else {
          enviarMensaje(numeroCliente, "⚠️ Te faltó poner el número del cliente. Escribí así: *desbloquear 5411...* SIN GUIONES NI EL 9 ");
        }
        return ContentService.createTextOutput("OK"); 
      }

      // ---- CANCELAR VÍA TEXTO ----
      if (textoRecibido.includes("cancelar")) {
        ejecutarCancelacion(numeroCliente);
      } 

      // ---- CUALQUIER OTRO TEXTO (Hola, buenas, etc) ----
      else {
        if (estadoUsuario === "CON_TURNO") {
          let detalle = "";
          if (infoTurno && infoTurno.dia && infoTurno.hora) {
            detalle = ` para *${infoTurno.servicio}* con *${infoTurno.peluquero}* el día *${infoTurno.dia}* a las *${infoTurno.hora}*`;
          }
          // Usamos la función con el botón Cancelar
          enviarMensajeConBotonCancelar(numeroCliente, `👋 ¡Hola de nuevo!\nRecordá que ya tenés un turno reservado${detalle}.`);
        } else {
          enviarMenu(numeroCliente);
        }
      }
    } 

    return ContentService.createTextOutput("OK");

  } catch (error) {
    console.error("Error en doPost: " + error);
    try {
        const data = JSON.parse(e.postData.contents);
        const msg = data.entry[0].changes[0].value.messages[0];
        let numeroClienteError = msg.from.startsWith("549") ? "54" + msg.from.substring(3) : msg.from;
        enviarMensaje(numeroClienteError, "🐛 *ERROR DEL BOT:* " + error.message);
    } catch (e2) {
        console.error("No se pudo avisar por WhatsApp: " + e2);
    }
    return ContentService.createTextOutput("ERROR");
  }
}

// ==========================================
// EJECUTA CANCELACIÓN
// ==========================================
function ejecutarCancelacion(numeroCliente) {
  const memoria = PropertiesService.getScriptProperties();
  let strikes = parseInt(memoria.getProperty("strikes_" + numeroCliente) || "0");
  strikes++;
  
  if (strikes >= 3) {
    memoria.setProperty("bloqueo_spam_" + numeroCliente, "SI");
    enviarMensaje(numeroCliente, "⛔ Has cancelado demasiados turnos consecutivos. Por seguridad, tu número ha sido bloqueado en nuestro sistema automático.\nPara volver a agendar, llamá al local.");
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
    enviarMensaje(numeroCliente, "✅ Tu turno ha sido cancelado correctamente y el horario ya está disponible.");
  } else {
    enviarMensaje(numeroCliente, "✅ No encontré un turno activo para hoy en el calendario para cancelar.");
  }
}

// ==========================================
// FUNCIONES DE MENÚS Y BOTONES (UI/UX)
// ==========================================

function enviarMenu(numero) {
  const payload = {
    "messaging_product": "whatsapp",
    "to": numero,
    "type": "interactive",
    "interactive": {
      "type": "button",
      "body": { "text": "👋 ¡Hola! Bienvenido a *Sanfrez Studio*.\n📍 Crisólogo Larralde 6560 (entre Salcedo y V. Hugo).\n\n*Nuestros Precios*\n💇‍♂️ Corte: $13.500\n🧔 Barba: $3.000\n🔥 Corte y Barba: $15.000\n✂️ Corte, Barba y Cejas: $15.000\n\n¿En qué podemos ayudarte hoy?" },
      "action": {
        "buttons": [ { "type": "reply", "reply": { "id": "btn_turno", "title": "Sacar Turno 📅" } } ]
      }
    }
  };
  enviarAWhatsApp(payload);
}

// 🔴 NUEVA FUNCIÓN PARA EL BOTÓN DE CANCELAR RÁPIDO
function enviarMensajeConBotonCancelar(numero, texto) {
  const payload = {
    "messaging_product": "whatsapp",
    "to": numero,
    "type": "interactive",
    "interactive": {
      "type": "button",
      "body": { "text": texto },
      "action": {
        "buttons": [ { "type": "reply", "reply": { "id": "btn_cancelar", "title": "❌ Cancelar Turno" } } ]
      }
    }
  };
  enviarAWhatsApp(payload);
}

function enviarBotonesServicios(numero) {
  const payload = {
    "messaging_product": "whatsapp",
    "to": numero,
    "type": "interactive",
    "interactive": {
      "type": "list",
      "header": { "type": "text", "text": "✂️ Servicios" },
      "body": { "text": "Por favor, elegí el servicio que buscás:" },
      "action": {
        "button": "Ver Opciones",
        "sections": [
          {
            "title": "Disponibles",
            "rows": [
              { "id": "serv_corte", "title": "Corte", "description": "$13.500" },
              { "id": "serv_barba", "title": "Barba", "description": "$3.000" },
              { "id": "serv_corteybarba", "title": "Corte y Barba", "description": "$15.000" },
              { "id": "serv_completo", "title": "Corte, Barba y Cejas", "description": "$15.000" },
              { "id": "btn_volver", "title": "🔙 Volver al Inicio" } // <-- BOTÓN AGREGADO
            ]
          }
        ]
      }
    }
  };
  enviarAWhatsApp(payload);
}

function peluqueros(numero, servicio) {
  let servCode = "corte";
  if (servicio === "Barba") servCode = "barba";
  else if (servicio === "Corte y Barba") servCode = "cortebarba";
  else if (servicio === "Corte, Barba y Cejas") servCode = "completo";

  const payload = {
    "messaging_product": "whatsapp",
    "to": numero,
    "type": "interactive",
    "interactive": {
      "type": "button",
      "body": { "text": `¡Perfecto para ${servicio}! Ahora elegí tu peluquero:` },
      "action": {
        "buttons": [
          { "type": "reply", "reply": { "id": `peluquero_santi_${servCode}`, "title": "Santi 💇‍♂️" } },
          { "type": "reply", "reply": { "id": `peluquero_franco_${servCode}`, "title": "Franco 💇‍♂️" } },
          { "type": "reply", "reply": { "id": `peluquero_nico_${servCode}`, "title": "Nico 💇‍♂️" } }
        ]
      }
    }
  };
  enviarAWhatsApp(payload);
}

// ==========================================
// NUEVO: CALENDARIO Y DISPONIBILIDAD REAL
// ==========================================

function enviarListaDias(numero) {
  const filasDias = obtenerProximosDiasContextuales();
  
  // <-- BOTÓN AGREGADO A LA LISTA DE DÍAS
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
  let horaAperturaDelDia = 10; 
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

// ==========================================
// Registro de turnos
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

// ==========================================
// MOTOR DE FECHAS INTELIGENTES
// ==========================================

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

// ==========================================
// FUNCIONES AUXILIARES DE ENVÍO
// ==========================================

function enviarMensaje(numero, texto) {
  const payload = {
    "messaging_product": "whatsapp",
    "to": numero,
    "type": "text",
    "text": { "body": texto }
  };
  enviarAWhatsApp(payload);
}

function enviarAWhatsApp(payload) {
  const url = `https://graph.facebook.com/v19.0/${ID_NUMERO}/messages`;
  const options = {
    "method": "post",
    "headers": {
      "Authorization": `Bearer ${TOKEN_META}`,
      "Content-Type": "application/json"
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  const respuesta = UrlFetchApp.fetch(url, options);
  console.log("Respuesta de Meta: " + respuesta.getContentText());
}

function DAR_PERMISOS() {
  CalendarApp.getDefaultCalendar();
  SpreadsheetApp.openById(ID_PLANILLA);
  console.log("¡Permisos de Calendario y Excel otorgados correctamente!");
}

function TEST_WHATSAPP() {
  const payload = {
    "messaging_product": "whatsapp",
    "to": "541123901838", 
    "type": "text",
    "text": { "body": "✅ ¡El token de WhatsApp funciona perfecto!" }
  };
  
  const url = `https://graph.facebook.com/v19.0/${ID_NUMERO}/messages`;
  const options = {
    "method": "post",
    "headers": { "Authorization": `Bearer ${TOKEN_META}`, "Content-Type": "application/json" },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  const respuesta = UrlFetchApp.fetch(url, options);
  console.log("Respuesta de Meta: " + respuesta.getContentText());
}

function TEST_CALENDARIO() {
  try {
    const calendario = CalendarApp.getDefaultCalendar(); 
    const ahora = new Date();
    const despues = new Date(ahora.getTime() + 30 * 60000);
    calendario.createEvent("Prueba de Bot", ahora, despues);
    console.log("✅ ¡El calendario funciona! Revisá tu Google Calendar, debería haber un evento ahora mismo.");
  } catch (e) {
    console.log("❌ ERROR DEL CALENDARIO: " + e.message);
  }
}