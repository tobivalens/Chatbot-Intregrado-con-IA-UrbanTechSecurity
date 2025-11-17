// bot/slas.js
// Devuelve objeto de SLA con campos: category, priority, resolution_hours (número), resolution_time (texto), sla_target
const slas = {
  svc_outage: {
    default: { category: 'Crítica', priority: 1, resolution_hours: 8, resolution_time: '8 horas', sla_target: 'Restablecimiento servicio crítico ≤8h' }
  },
  camera_down: {
    cam_noresp: { category: 'Alta', priority: 1, resolution_hours: 4, resolution_time: '4h (urbano) / 24h (rural)', sla_target: 'MTTR cámara ≤4h urbano' },
    cam_frozen: { category: 'Alta', priority: 1, resolution_hours: 6, resolution_time: '6 horas', sla_target: 'Restauración de imagen ≤6h' },
    cam_ptz: { category: 'Media', priority: 2, resolution_hours: 24, resolution_time: '24 horas', sla_target: 'PTZ reparación ≤24h' },
    cam_dark: { category: 'Media', priority: 2, resolution_hours: 24, resolution_time: '24 horas', sla_target: 'Corrección exposición ≤24h' },
    default: { category: 'Alta', priority: 1, resolution_hours: 24, resolution_time: '24 horas', sla_target: 'Soporte cámaras' }
  },
  unauthorized_access: {
    acc_login_attempt: { category: 'Crítica', priority: 1, resolution_hours: 2, resolution_time: '2 horas', sla_target: 'Acceso no autorizado ≤2h' },
    acc_bad_priv: { category: 'Alta', priority: 1, resolution_hours: 4, resolution_time: '4 horas', sla_target: 'Corrección permisos ≤4h' },
    acc_locked: { category: 'Alta', priority: 1, resolution_hours: 4, resolution_time: '4 horas', sla_target: 'Cuenta desbloqueada ≤4h' },
    default: { category: 'Alta', priority: 1, resolution_hours: 4, resolution_time: '4 horas', sla_target: 'Incidente de seguridad' }
  },
  evidence_request: {
    evid_urgent: { category: 'Crítica', priority: 1, resolution_hours: 72, resolution_time: '72 horas', sla_target: 'Evidencias ≤72h' },
    evid_chain: { category: 'Crítica', priority: 1, resolution_hours: 72, resolution_time: '72 horas', sla_target: 'Cadena custodia ≤72h' },
    evid_check: { category: 'Media', priority: 2, resolution_hours: 120, resolution_time: '5 días', sla_target: 'Verificación ≤5 días' }
  },
  storage_issue: {
    stor_no_record: { category: 'Crítica', priority: 1, resolution_hours: 48, resolution_time: '48 horas', sla_target: 'Investigación grabaciones ≤48h' },
    stor_retention: { category: 'Alta', priority: 2, resolution_hours: 120, resolution_time: '5 días', sla_target: 'Retención 30/90/365 días' },
    stor_corrupt: { category: 'Alta', priority: 2, resolution_hours: 72, resolution_time: '72 horas', sla_target: 'Corrección repositorio ≤72h' }
  },
  analytics_issue: {
    anal_fp: { category: 'Alta', priority: 1, resolution_hours: 72, resolution_time: '72 horas', sla_target: 'Ajuste algoritmo ≤72h' },
    anal_miss: { category: 'Alta', priority: 1, resolution_hours: 120, resolution_time: '5 días', sla_target: 'Corrección misses ≤5 días' },
    anal_perf: { category: 'Media', priority: 2, resolution_hours: 168, resolution_time: '7 días', sla_target: 'Optimización modelo ≤7 días' }
  },
  maintenance: {
    mant_preventive: { category: 'Baja', priority: 3, resolution_hours: 0, resolution_time: 'Programado', sla_target: 'Mantenimiento trimestral' },
    mant_replace: { category: 'Alta', priority: 1, resolution_hours: 48, resolution_time: '48 horas', sla_target: 'Reemplazo crítico ≤48h' },
    mant_power: { category: 'Media', priority: 2, resolution_hours: 48, resolution_time: '48 horas', sla_target: 'Revisión energética ≤48h' }
  },
  vandalism: {
    vand_report: { category: 'Crítica', priority: 1, resolution_hours: 72, resolution_time: '72 horas', sla_target: 'Atención vandalismo ≤72h' },
    vand_theft: { category: 'Crítica', priority: 1, resolution_hours: 72, resolution_time: '72 horas', sla_target: 'Atención robo ≤72h' }
  },
  other_issue: {
    default: { category: 'Media', priority: 2, resolution_hours: 120, resolution_time: '5 días', sla_target: 'Incidente general' }
  }
};

function getImpact(serviceKey, subKey) {
  const svc = slas[serviceKey];
  if (!svc) return slas.other_issue.default;
  return svc[subKey] || svc.default || slas.other_issue.default;
}

module.exports = { getImpact };
