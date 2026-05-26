const token = PropertiesService.getScriptProperties().getProperty('VERIFY_TOKEN');
const TOKEN_META = PropertiesService.getScriptProperties().getProperty('TOKEN_META');
const ID_CALENDARIO = PropertiesService.getScriptProperties().getProperty('ID_CALENDARIO');
const ID_PLANILLA = PropertiesService.getScriptProperties().getProperty('ID_PLANILLA');
const NUMEROS_ADMIN = PropertiesService.getScriptProperties().getProperty('NUMEROS_ADMIN');
const ID_NUMERO = PropertiesService.getScriptProperties().getProperty('ID_NUMERO');

const HORA_APERTURA = 10; 
const HORA_CIERRE = 21;   
const INTERVALO_MINUTOS = 45; 
const ESTADOS = {
  NINGUNO: "NINGUNO",
  ESPERANDO_DIA: "ESPERANDO_DIA",
  ESPERANDO_HORA: "ESPERANDO_HORA",
  CON_TURNO: "CON_TURNO"
};