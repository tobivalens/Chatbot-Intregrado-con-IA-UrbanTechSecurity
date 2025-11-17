// bot/labels.js
const serviceLabels = {
  svc_outage: 'Caída del servicio (NOC)',
  camera_down: 'Cámara caída / imagen perdida',
  unauthorized_access: 'Acceso no autorizado / bloqueo',
  evidence_request: 'Solicitud de evidencia / cadena de custodia',
  storage_issue: 'Problema de almacenamiento / retención',
  analytics_issue: 'Fallo o sesgo en analítica de video',
  maintenance: 'Mantenimiento preventivo / correctivo',
  vandalism: 'Vandalismo / daño físico',
  other_issue: 'Otra incidencia'
};

const subtypeLabels = {
  svc_outage_site: 'Afecta sitio completo',
  svc_outage_partial: 'Afecta cámaras puntuales',
  svc_outage_intermittent: 'Interrupción intermitente',
  cam_noresp: 'Cámara no responde',
  cam_frozen: 'Imagen congelada',
  cam_ptz: 'PTZ no responde',
  cam_dark: 'Imagen oscura / sobreexpuesta',
  acc_login_attempt: 'Intento de login sospechoso',
  acc_bad_priv: 'Usuario con permisos indebidos',
  acc_locked: 'Cuenta bloqueada',
  evid_urgent: 'Entrega urgente (autoridades)',
  evid_check: 'Verificar disponibilidad',
  evid_chain: 'Cadena de custodia',
  stor_no_record: 'No hay grabaciones',
  stor_retention: 'Retención incorrecta',
  stor_corrupt: 'Degradación / datos corruptos',
  anal_fp: 'Falsos positivos altos',
  anal_miss: 'No detecta eventos',
  anal_perf: 'Problema de rendimiento',
  mant_preventive: 'Visita preventiva',
  mant_replace: 'Reemplazo de equipo',
  mant_power: 'Revisión energía / cableado',
  vand_report: 'Daño físico - denuncia',
  vand_theft: 'Robo de equipo',
  other_describe: 'Otro (describir)'
};

function serviceLabel(key) {
  return serviceLabels[key] || key || 'No definido';
}

function subtypeLabel(key) {
  return subtypeLabels[key] || key || 'No definido';
}

module.exports = { serviceLabel, subtypeLabel };
