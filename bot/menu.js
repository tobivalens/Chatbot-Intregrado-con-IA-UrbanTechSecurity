// bot/menu.js
const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '📡 1. Caída del servicio (NOC)', callback_data: 'svc_outage' }],
      [{ text: '🎥 2. Cámara caída / imagen perdida', callback_data: 'camera_down' }],
      [{ text: '🔒 3. Acceso no autorizado / bloqueo', callback_data: 'unauthorized_access' }],
      [{ text: '🧾 4. Solicitud de evidencia / cadena de custodia', callback_data: 'evidence_request' }],
      [{ text: '💾 5. Problema de almacenamiento / retención', callback_data: 'storage_issue' }],
      [{ text: '🤖 6. Fallo o sesgo en analítica de video', callback_data: 'analytics_issue' }],
      [{ text: '🛠️ 7. Mantenimiento preventivo / correctivo', callback_data: 'maintenance' }],
      [{ text: '🚨 8. Vandalismo / daño físico a equipos', callback_data: 'vandalism' }],
      [{ text: '❓ 9. Otra incidencia', callback_data: 'other_issue' }],

      // 🔵 OPCIÓN NUEVA (DEBE ESTAR EN SU PROPIO ARRAY)
      [{ text: '📁 Mis consultas', callback_data: 'my_queries' }],

      // 🔵 ESTE ERA EL QUE ROMPÍA TODO → YA ESTÁ CORREGIDO
      [{ text: "🚀 IA Avanzada", callback_data: "ia_advanced" }]
    ]
  }
};


const submenus = {
  svc_outage: {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Afecta sitio completo', callback_data: 'svc_outage_site' }],
        [{ text: 'Afecta cámaras puntuales', callback_data: 'svc_outage_partial' }],
        [{ text: 'Intermitente', callback_data: 'svc_outage_intermittent' }]
      ]
    }
  },
  camera_down: {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Cámara no responde', callback_data: 'cam_noresp' }],
        [{ text: 'Imagen congelada', callback_data: 'cam_frozen' }],
        [{ text: 'PTZ no responde', callback_data: 'cam_ptz' }],
        [{ text: 'Imagen oscura', callback_data: 'cam_dark' }]
      ]
    }
  },
  unauthorized_access: {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Intento login sospechoso', callback_data: 'acc_login_attempt' }],
        [{ text: 'Permisos indebidos', callback_data: 'acc_bad_priv' }],
        [{ text: 'Cuenta bloqueada', callback_data: 'acc_locked' }]
      ]
    }
  },
  evidence_request: {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Entrega urgente', callback_data: 'evid_urgent' }],
        [{ text: 'Verificar disponibilidad', callback_data: 'evid_check' }],
        [{ text: 'Cadena de custodia', callback_data: 'evid_chain' }]
      ]
    }
  },
  storage_issue: {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'No hay grabaciones', callback_data: 'stor_no_record' }],
        [{ text: 'Retención incorrecta', callback_data: 'stor_retention' }],
        [{ text: 'Datos corruptos', callback_data: 'stor_corrupt' }]
      ]
    }
  },
  analytics_issue: {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Falsos positivos', callback_data: 'anal_fp' }],
        [{ text: 'No detecta eventos', callback_data: 'anal_miss' }],
        [{ text: 'Problema rendimiento', callback_data: 'anal_perf' }]
      ]
    }
  },
  maintenance: {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Visita preventiva', callback_data: 'mant_preventive' }],
        [{ text: 'Reemplazo equipo', callback_data: 'mant_replace' }],
        [{ text: 'Revisión energía/cableado', callback_data: 'mant_power' }]
      ]
    }
  },
  vandalism: {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Daño físico', callback_data: 'vand_report' }],
        [{ text: 'Robo de equipo', callback_data: 'vand_theft' }]
      ]
    }
  },
  other_issue: {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Describir problema', callback_data: 'other_describe' }]
      ]
    }
  }
};

module.exports = { mainMenu, submenus };
