function obtenerCalendario() {
  return CalendarApp.getCalendarById(
    CONFIG.CALENDAR_ID
  );
}

function obtenerEventosDelDia(fecha) {
  const calendario = obtenerCalendario();

  return calendario.getEventsForDay(fecha);
}

function crearEventoTurno(
  peluquero,
  servicio,
  numero,
  inicio,
  fin
) {
  const calendario = obtenerCalendario();

  return calendario.createEvent(
    `${peluquero} - ${servicio} (${numero})`,
    inicio,
    fin
  );
}