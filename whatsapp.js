// ==========================================
// INTERFACES UI Y COMUNICACIÓN CON META
// ==========================================

function enviarMenu(numero) {
  const payload = {
    "messaging_product": "whatsapp",
    "to": numero,
    "type": "interactive",
    "interactive": {
      "type": "button",
      "body": { "text": "👋 ¡Hola! Bienvenido a *Peluqueria Prueba*.\n📍 Direccion calle siempre viva 123.\n\n*Nuestros Precios*\n💇‍♂️ Corte: $13.500\n🧔 Barba: $3.000\n🔥 Corte y Barba: $15.000\n✂️ Corte, Barba y Cejas: $15.000\n\n¿En qué podemos ayudarte hoy?" },
      "action": {
        "buttons": [ { "type": "reply", "reply": { "id": "btn_turno", "title": "Sacar Turno 📅" } } ]
      }
    }
  };
  enviarAWhatsApp(payload);
}

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
              { "id": "btn_volver", "title": "🔙 Volver al Inicio" } 
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
          { "type": "reply", "reply": { "id": `peluquero_peluquero1_${servCode}`, "title": "Peluquero1 💇‍♂️" } },
          { "type": "reply", "reply": { "id": `peluquero_peluquero2_${servCode}`, "title": "Peluquero2 💇‍♂️" } },
          { "type": "reply", "reply": { "id": `peluquero_peluquero3_${servCode}`, "title": "Peluquero3 💇‍♂️" } }
        ]
      }
    }
  };
  enviarAWhatsApp(payload);
}

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