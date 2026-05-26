function enviarMensaje(numero, texto) {
  const payload = {
    messaging_product: "whatsapp",
    to: numero,
    type: "text",
    text: {
      body: texto
    }
  };

  enviarAWhatsApp(payload);
}

function enviarAWhatsApp(payload) {
  const url =
    `https://graph.facebook.com/v19.0/${CONFIG.PHONE_NUMBER_ID}/messages`;

  const options = {
    method: "post",
    headers: {
      Authorization: `Bearer ${CONFIG.TOKEN_META}`,
      "Content-Type": "application/json"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);

  console.log(response.getContentText());
}