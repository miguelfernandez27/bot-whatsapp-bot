# 💈 WhatsApp Bot Barbería

Sistema automatizado de gestión de turnos para barbería integrado con WhatsApp Cloud API, Google Calendar y Google Sheets utilizando Google Apps Script.

## El Problema y la Solución
Este proyecto fue desarrollado con el objetivo de eliminar la gestión manual de los turnos, la cual consumía mucho tiempo y era propensa a errores. 
**La solución:** Automatizar la reserva y administración mediante un bot de WhatsApp, centralizando la disponibilidad en tiempo real a través de Google Calendar y manteniendo un registro de auditoría (logs) en Google Sheets.

## Arquitectura y Flujo
* **Webhook / Endpoint:** Google Apps Script.
* **Integraciones:** WhatsApp Cloud API (Meta), Google Calendar API, Google Sheets.
* **Gestión de Estado y Caché:** PropertiesService de Google.

### Características Principales del Sistema:
- **Self-Service:** Los clientes pueden reservar turnos, consultar disponibilidad y cancelar reservas de forma autónoma.
- **Interfaz Dinámica:** Interacción fluida mediante botones y listas interactivas nativas de WhatsApp.
- **Control de Concurrencia:** Implementación de bloqueos lógicos (`LockService`) para evitar colisiones si dos usuarios eligen el mismo turno al mismo tiempo.
- **Seguridad y Prevención de Spam:** Sistema de *strikes* y bloqueo automático para usuarios que cancelan turnos de manera abusiva.
- **Limpieza Automática:** Tareas programadas (*Cron jobs/Activadores*) para limpiar estados obsoletos y liberar memoria diariamente.

## Demo Visual

### 1. Flujo de Pedidos y Navegación
![Demo Flujo Pedidos](https://i.imgur.com/ic9WAMP.gif)

### 2. Flujo de Agendamiento y Cancelación
![Demo Agenda y Cancelación](https://i.imgur.com/2hf5CbM.gif)

## Deploy
Para levantar este proyecto en tu propio entorno de Google Apps Script:

1. **Clonar el repositorio** localmente.
2. **Autenticarse y configurar el entorno** utilizando Clasp (`clasp login` y luego iniciar el proyecto).
3. **Subir el código** a la nube ejecutando:
```bash
   clasp push