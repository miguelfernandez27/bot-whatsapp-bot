function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (!esMensajeValido(body)) {
      return ok();
    }

    const msg = body.entry[0].changes[0].value.messages[0];

    procesarMensaje(msg);

    return ok();

  } catch (error) {
    console.error(error);

    return ContentService
      .createTextOutput("ERROR");
  }
}