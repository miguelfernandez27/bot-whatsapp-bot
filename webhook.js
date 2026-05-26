// ==========================================
// WEBHOOKS Y ENRUTADOR PRINCIPAL
// ==========================================

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
    let numeroCliente = formatearNumero(msg.from); // Modularizado en utils.js

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
    if (limpiarTurnoVencido(estadoUsuario, infoTurno, numeroCliente, memoria)) {
      estadoUsuario = null; 
      infoTurno = { paso: "NINGUNO" };
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

          enviarMensajeConBotonCancelar(
            numeroCliente,
            `✅ *¡TURNO CONFIRMADO!*\n\n💈 Servicio: ${infoTurno.servicio}\n💇‍♂️ Peluquero: ${infoTurno.peluquero}\n📅 Fecha: ${infoTurno.dia}\n⏰ Hora: ${horaElegida}\n\n📍 Te esperamos en *Peluqueria Prueba *\n Calle Siempre Viva 123.`
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
      
      if (NUMEROS_ADMIN.includes(numeroCliente) && textoRecibido.startsWith("desbloquear")) {
        let partesComando = textoRecibido.split(" ");
        
        if (partesComando.length > 1) {
          let numeroADesbloquear = partesComando[1].trim();
          memoria.deleteProperty("bloqueo_spam_" + numeroADesbloquear);
          memoria.deleteProperty("strikes_" + numeroADesbloquear);
          enviarMensaje(numeroCliente, `✅ Listo El número ${numeroADesbloquear} fue desbloqueado, ya cuenta con acceso al bot.`);
        } else {
          enviarMensaje(numeroCliente, "⚠️ Te faltó poner el número del cliente. Escribí así: *desbloquear 5411...* SIN GUIONES NI EL 9 ");
        }
        return ContentService.createTextOutput("OK"); 
      }

      // ---- CANCELAR VÍA TEXTO ----
      if (textoRecibido.includes("cancelar")) {
        ejecutarCancelacion(numeroCliente);
      } 

      // ---- CUALQUIER OTRO TEXTO ----
      else {
        if (estadoUsuario === "CON_TURNO") {
          let detalle = "";
          if (infoTurno && infoTurno.dia && infoTurno.hora) {
            detalle = ` para *${infoTurno.servicio}* con *${infoTurno.peluquero}* el día *${infoTurno.dia}* a las *${infoTurno.hora}*`;
          }
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