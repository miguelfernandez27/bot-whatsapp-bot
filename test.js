// ==========================================
// FUNCIONES DE TESTING Y PERMISOS
// ==========================================

function DAR_PERMISOS() {
  CalendarApp.getDefaultCalendar();
  SpreadsheetApp.openById(ID_PLANILLA);
  console.log("¡Permisos de Calendario y Excel otorgados correctamente!");
}

function TEST_WHATSAPP() {
  const payload = {
    "messaging_product": "whatsapp",
    "to": "", 
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