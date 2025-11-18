// bot/ai/BasicLM.js
const { extractUserInfo } = require('./extract');

class BasicLM {
  classify(text) {
    const t = text.toLowerCase();

    // Palabras clave → servicio + subtipo
    const map = [
      { k: ['cámara', 'no responde', 'sin imagen'], svc: 'camera_down', sub: 'cam_noresp' },
      { k: ['congelada', 'freeze'], svc: 'camera_down', sub: 'cam_frozen' },
      { k: ['ptz'], svc: 'camera_down', sub: 'cam_ptz' },
      { k: ['oscura'], svc: 'camera_down', sub: 'cam_dark' },

      { k: ['almacenamiento', 'nvr', 'no grab'], svc: 'storage_issue', sub: 'stor_no_record' },
      { k: ['retención'], svc: 'storage_issue', sub: 'stor_retention' },
      { k: ['corrupt'], svc: 'storage_issue', sub: 'stor_corrupt' },

      { k: ['evidencia', 'cadena'], svc: 'evidence_request', sub: 'evid_chain' },

      { k: ['login', 'hack', 'acceso', 'bloqueo'], svc: 'unauthorized_access', sub: 'acc_login_attempt' },

      { k: ['analítica', 'falso positivo'], svc: 'analytics_issue', sub: 'anal_fp' },
      { k: ['no detecta'], svc: 'analytics_issue', sub: 'anal_miss' },

      { k: ['caído', 'no funciona', 'sitio'], svc: 'svc_outage', sub: 'svc_outage_site' }
    ];

    for (const rule of map) {
      if (rule.k.some(word => t.includes(word))) {
        return {
          service: rule.svc,
          subType: rule.sub,
          confidence: 0.85
        };
      }
    }

    return {
      service: 'other_issue',
      subType: 'other_describe',
      confidence: 0.60
    };
  }

  parseUser(text) {
    return extractUserInfo(text);
  }
}

module.exports = new BasicLM();
