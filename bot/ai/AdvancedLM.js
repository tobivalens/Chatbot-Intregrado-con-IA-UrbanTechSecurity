// bot/ai/AdvancedLM.js
// AdvancedLM optimizado para SmartCity / CCTV
// - Detecta variantes coloquiales, sinónimos, errores ortográficos y conjugaciones
// - Clasifica a nivel de servicio y subtipo (coincide con tu menu/submenus)
// - Devuelve: { service, subType, confidence, symptoms, userDetected, decisions, analysisMeta }
// - Compatible con handlers.js (await AdvancedLM.analyze(text))

const { extractUserInfo } = require('./extract');

class AdvancedLM {
  constructor() {
    // Map de subtipos a palabras clave (lista extensa y realista)
    this.keywordMap = {
      // svc_outage
      svc_outage_site: [
        'caída del servicio', 'caida del servicio', 'sitio caído', 'sitio caido',
        'apagon', 'apagón', 'apagado total', 'todo caído', 'servicio caído',
        'no funciona todo', 'sin servicio', 'planta cae', 'caida total', 'down total'
      ],
      svc_outage_partial: [
        'afecta cámaras puntuales', 'algunas cámaras', 'varias cámaras caídas', 'sitio parcial',
        'pérdida parcial', 'funciona parcialmente', 'no funciona una zona', 'zona sin servicio'
      ],
      svc_outage_intermittent: [
        'intermitente', 'va y viene', 'se desconecta', 'conexión intermitente', 'intermitencias',
        'ping con perdida', 'lag intermitente'
      ],

      // camera_down
      cam_noresp: [
        'no responde', 'sin imagen', 'sin video', 'sin señal', 'offline',
        'fuera de linea', 'fuera de línea', 'se cayó la cámara', 'se me cayó la cámara',
        'camara caida', 'cámara caída', 'cámara caida', 'camara no responde',
        'camara muerta', 'camara apagada', 'no da imagen', 'no toma imagen'
      ],
      cam_frozen: [
        'congelada', 'imagen congelada', 'freeze', 'imagen fija', 'se queda pegada',
        'frame así', 'pixel', 'se queda en la misma imagen', 'sin movimiento'
      ],
      cam_ptz: [
        'ptz', 'no gira', 'no mueve', 'no rota', 'ptz muerto', 'no responde ptz',
        'no apunta', 'no hace zoom', 'zoom no funciona', 'pan tilt no funciona'
      ],
      cam_dark: [
        'oscura', 'muy oscura', 'se ve negro', 'sin luz', 'imagen muy oscura',
        'infra rojo no funciona', 'ir falla', 'noche sin imagen', 'imagen tenue'
      ],

      // unauthorized_access
      acc_login_attempt: [
        'login sospechoso', 'intento login', 'acceso no autorizado', 'intento intrusión',
        'intruso', 'hack', 'hackeo', 'se intentó entrar', 'credenciales robadas',
        'login fallido muchas veces', 'brute force', 'fuerza bruta'
      ],
      acc_bad_priv: [
        'permisos', 'privilegios', 'permiso indebido', 'acceso indebido', 'rol mal asignado',
        'permiso erroneo', 'privilegios excesivos'
      ],
      acc_locked: [
        'cuenta bloqueada', 'usuario bloqueado', 'bloqueado', 'no puedo entrar', 'locked account'
      ],

      // evidence_request
      evid_urgent: [
        'evidencia urgente', 'entrega urgente', 'urgente evidencia', 'cadena de custodia urgente',
        'necesito evidencia ya', 'urgente video', 'evidencia inmediata'
      ],
      evid_check: [
        'verificar disponibilidad', 'verificar evidencia', 'hay evidencia', 'dónde está la grabación',
        'chequear grabación', 'buscar video'
      ],
      evid_chain: [
        'cadena de custodia', 'cadena custodia', 'cadena de evidencia', 'custodia', 'cadena legal'
      ],

      // storage_issue
      stor_no_record: [
        'no graba', 'no hay grabaciones', 'sin grabaciones', 'nvr no graba',
        'no guarda video', 'no hay footage', 'falta grabación', 'no aparecen grabaciones'
      ],
      stor_retention: [
        'retención', 'retencion', 'tiempo de retención', 'borró grabaciones', 'se borró',
        'se eliminaron grabaciones', 'política retención', 'retención incorrecta'
      ],
      stor_corrupt: [
        'corrupto', 'corrupto', 'datos corruptos', 'archivo corrupto', 'grabación dañada',
        'video corrupto', 'archivos dañados', 'integridad fallida'
      ],

      // analytics_issue
      anal_fp: [
        'falso positivo', 'falsos positivos', 'detecta cosas donde no hay',
        'alarma falsa', 'alerta falsa', 'demasiados falsos', 'ruido en analitica'
      ],
      anal_miss: [
        'no detecta', 'no detecta personas', 'no detecta vehículos', 'miss', 'missed detections',
        'no reconoce eventos', 'se salta eventos'
      ],
      anal_perf: [
        'lento analitica', 'rendimiento analitica', 'cpu alta en analitica', 'lag analitica',
        'modelo lento', 'timeout analitica'
      ],

      // maintenance
      mant_preventive: [
        'preventivo', 'mantenimiento preventivo', 'visita preventiva', 'programado',
        'inspección', 'revisión programada'
      ],
      mant_replace: [
        'reemplazo equipo', 'reemplazar cámara', 'sustitución', 'cambio de equipo', 'swap cámara'
      ],
      mant_power: [
        'energia', 'energia fallo', 'corte energia', 'corte de energía', 'problema eléctrico',
        'cableado', 'cable cortado', 'sin corriente', 'poe no da energía'
      ],

      // vandalism
      vand_report: [
        'daño físico', 'golpearon la cámara', 'carcasa dañada', 'rotura', 'vandalismo',
        'rotura cámara', 'impacto cámara'
      ],
      vand_theft: [
        'robo de equipo', 'robaron la cámara', 'hurto cámara', 'robo', 'se llevaron la camara',
        'stolen camera', 'robaron equipo'
      ],

      // other_issue
      other_describe: [
        'otro', 'otra incidencia', 'otro problema', 'describir problema', 'help', 'soporte general'
      ]
    };

    // Mapa de acciones sugeridas por sintoma/subtipo (texto humano legible)
    this.actionMap = {
      cam_noresp: ['Verificar alimentación PoE / energía', 'Comprobar enlace de red (ping/SNMP)', 'Reiniciar cámara remotamente'],
      cam_frozen: ['Reiniciar proceso de captura', 'Revisar CPU del NVR', 'Comprobar versiones de firmware'],
      cam_ptz: ['Realizar test PTZ (pan/tilt/zoom)', 'Verificar cableado de control', 'Comprobar límites de recorrido'],
      cam_dark: ['Revisar IR / iluminación', 'Ajustar exposición/ganancia', 'Verificar lente y obstrucciones'],
      svc_outage_site: ['Escalar a infraestructura / verificar core router', 'Comprobar enlaces ISP y energía del sitio'],
      svc_outage_partial: ['Inspeccionar switches PoE del sector', 'Revisar backlog de tráfico y latencia'],
      svc_outage_intermittent: ['Monitoreo de paquetes (ping/traceroute)', 'Revisar logs de estabilidad del NMS'],
      acc_login_attempt: ['Bloquear IP sospechosa', 'Rotar credenciales', 'Revisar logs y origen de sesión'],
      acc_bad_priv: ['Revisar roles y permisos', 'Aplicar principio de menor privilegio', 'Auditar cambios recientes'],
      acc_locked: ['Desbloquear cuenta tras verificación', 'Revisar política de bloqueo'],
      evid_urgent: ['Priorizar recuperación y exportación de grabaciones', 'Asignar evidencia al caso legal'],
      evid_check: ['Buscar en índices de VMS por timestamp y cámara', 'Verificar replicación en nube'],
      stor_no_record: ['Revisar servicios VMS/NVR', 'Verificar rotación de disco y espacio disponible'],
      stor_retention: ['Revisar políticas de retención y backups', 'Comprobar jobs de replicación'],
      stor_corrupt: ['Ejecutar verificación de integridad', 'Restaurar desde backup si procede'],
      anal_fp: ['Ajustar umbrales del detector', 'Reentrenar o recalibrar modelo', 'Filtrar zonas de interés'],
      anal_miss: ['Verificar calidad de imagen', 'Aumentar sensibilidad del detector', 'Reentrenar datasets'],
      anal_perf: ['Optimizar recursos (GPU/CPU)', 'Revisar batch size y latencias de inferencia'],
      mant_preventive: ['Programar visita técnica', 'Ejecutar checklist preventivo'],
      mant_replace: ['Agendar reemplazo y logística', 'Validar garantía del equipo'],
      mant_power: ['Verificar UPS y tableros', 'Revisar PoE injector/switch'],
      vand_report: ['Generar orden de reparación física', 'Solicitar evidencia a campo'],
      vand_theft: ['Notificar a seguridad y policía', 'Iniciar cadena de custodia y recuperación']
    };
  }

  // Normaliza texto: minúsculas, sin acentos, sin puntuación redundante
  normalize(text) {
    if (!text) return '';
    const withLower = text.toLowerCase();
    // remove accents
    const normalized = withLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // replace punctuation with spaces
    return normalized.replace(/[\.,;:!¿\?()\[\]\"']/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Comprueba si algún keyword aparece en el texto normalizado
  containsAny(normalizedText, keywords) {
    for (const kw of keywords) {
      const k = kw.toLowerCase();
      // Normalizar la keyword igual que el texto (no siempre necesario, pero seguro)
      const kn = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      // Búsqueda simple de substring (rápida y robusta)
      if (normalizedText.includes(kn)) return true;
      // Comprobar palabras separadas (word boundary)
      const re = new RegExp('\\b' + kn.replace(/\s+/g, '\\s+') + '\\b', 'i');
      if (re.test(normalizedText)) return true;
    }
    return false;
  }

  // Calculo simple de confianza
  computeConfidence(matchesCount, textLength, base = 0.6) {
    const boost = Math.min(0.25, matchesCount * 0.08);
    const lengthBoost = Math.min(0.1, Math.log10(Math.max(10, textLength)) * 0.02);
    return Math.min(0.98, base + boost + lengthBoost);
  }

  // Genera la lista de decisiones (acciones) a partir de subtipos detectados
  makeDecisions(detectedSubtypes) {
    const actions = [];
    for (const s of detectedSubtypes) {
      const act = this.actionMap[s];
      if (act && act.length) {
        act.forEach(a => {
          if (!actions.includes(a)) actions.push(a);
        });
      }
    }
    return actions;
  }

  // Método principal: analiza texto y devuelve objeto rico en información
  async analyze(text) {
    const raw = String(text || '');
    const normalized = this.normalize(raw);
    const userDetected = extractUserInfo ? extractUserInfo(raw) : { name: '', id: '', phone: '' };

    const detected = {
      service: 'other_issue',
      subType: 'other_describe',
      confidence: 0.7,
      symptoms: [],
      detectedSubtypes: []
    };

    // buscar coincidencias en keywordMap — priorizamos coincidencias más específicas
    const matches = [];

    for (const [subtype, keywords] of Object.entries(this.keywordMap)) {
      if (this.containsAny(normalized, keywords)) {
        matches.push(subtype);
      }
    }

    // Si hay matches, determinar service (prefix before underscore if exists)
    if (matches.length > 0) {
      // preservar orden y priorizar subtipos más específicos (ya están separados)
      detected.detectedSubtypes = [...new Set(matches)];

      // inferir service a partir del primer match válido
      const first = detected.detectedSubtypes[0];
      const serviceKey = first.split('_')[0]; // e.g., "camera" from "cam_noresp" -> careful mapping below

      // Normalizar mapping: nuestros keys no siempre siguen prefix directos, map manual
      // Mapeo explícito (subtype -> service)
      const serviceMapping = {
        // svc_outage
        svc_outage_site: 'svc_outage',
        svc_outage_partial: 'svc_outage',
        svc_outage_intermittent: 'svc_outage',
        // camera_down
        cam_noresp: 'camera_down',
        cam_frozen: 'camera_down',
        cam_ptz: 'camera_down',
        cam_dark: 'camera_down',
        // unauthorized_access
        acc_login_attempt: 'unauthorized_access',
        acc_bad_priv: 'unauthorized_access',
        acc_locked: 'unauthorized_access',
        // evidence_request
        evid_urgent: 'evidence_request',
        evid_check: 'evidence_request',
        evid_chain: 'evidence_request',
        // storage_issue
        stor_no_record: 'storage_issue',
        stor_retention: 'storage_issue',
        stor_corrupt: 'storage_issue',
        // analytics
        anal_fp: 'analytics_issue',
        anal_miss: 'analytics_issue',
        anal_perf: 'analytics_issue',
        // maintenance
        mant_preventive: 'maintenance',
        mant_replace: 'maintenance',
        mant_power: 'maintenance',
        // vandalism
        vand_report: 'vandalism',
        vand_theft: 'vandalism',
        // other
        other_describe: 'other_issue'
      };

      // Choose primary subtype (si hay varios, elegir el más crítico segun priority heuristica)
      // Heurística: preferir subtipos con palabras "criticas" en texto
      const priorityOrder = [
        'svc_outage_site','svc_outage_intermittent','svc_outage_partial',
        'cam_noresp','cam_frozen','cam_ptz','cam_dark',
        'stor_no_record','stor_corrupt','stor_retention',
        'acc_login_attempt','acc_bad_priv','acc_locked',
        'evid_urgent','evid_chain','evid_check',
        'anal_fp','anal_miss','anal_perf',
        'vand_theft','vand_report',
        'mant_replace','mant_power','mant_preventive',
        'other_describe'
      ];

      // find first match in priorityOrder
      let chosenSub = detected.detectedSubtypes.find(s => priorityOrder.includes(s));
      if (!chosenSub) chosenSub = detected.detectedSubtypes[0];

      detected.subType = chosenSub;
      detected.service = serviceMapping[chosenSub] || 'other_issue';
      detected.symptoms = detected.detectedSubtypes.slice(0, 6); // top symptoms
    }

    // If no matches, intentar heurística por palabras genéricas
    if (detected.detectedSubtypes.length === 0) {
      // algunas heurísticas simples
      if (this.containsAny(normalized, ['camara','cam','camaras','camera','camera'])) {
        detected.service = 'camera_down';
        detected.subType = 'cam_noresp';
        detected.symptoms.push('cam_general');
      } else if (this.containsAny(normalized, ['nvr','vms','grabacion','graba','grabar','grabaciones'])) {
        detected.service = 'storage_issue';
        detected.subType = 'stor_no_record';
        detected.symptoms.push('storage_general');
      } else if (this.containsAny(normalized, ['analitica','detectar','modelo','falso positivo','falso'])) {
        detected.service = 'analytics_issue';
        detected.subType = 'anal_fp';
        detected.symptoms.push('analytics_general');
      } else if (this.containsAny(normalized, ['login','acceso','intruso','hack','credencial'])) {
        detected.service = 'unauthorized_access';
        detected.subType = 'acc_login_attempt';
        detected.symptoms.push('security_general');
      } else {
        detected.service = 'other_issue';
        detected.subType = 'other_describe';
        detected.symptoms.push('none_detected');
      }
    }

    // calcular confidence basado en cantidad de matches y longitud del texto
    const matchesCount = detected.detectedSubtypes.length || detected.symptoms.length || 0;
    detected.confidence = this.computeConfidence(matchesCount, raw.length, 0.62);

    // decisiones / acciones sugeridas
    detected.decisions = this.makeDecisions(detected.detectedSubtypes.length ? detected.detectedSubtypes : [detected.subType]);

    // metadata
    detected.analysisMeta = {
      rawText: raw,
      normalizedText: normalized,
      matchedSubtypes: detected.detectedSubtypes
    };

    // attach detected user info
    detected.userDetected = userDetected;

    return detected;
  }
}

module.exports = new AdvancedLM();
