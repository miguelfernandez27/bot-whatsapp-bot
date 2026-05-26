function registrarTurno(
  numero,
  servicio,
  peluquero,
  dia,
  hora
) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(5000);

    // lógica

    return true;

  } catch (error) {

    console.error(error);

    return false;

  } finally {
    lock.releaseLock();
  }
}