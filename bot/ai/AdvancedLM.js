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
      // =========================
      // svc_outage
      // =========================
      // =========================
// svc_outage
// =========================
      svc_outage_site: [
        'caída del servicio', 'caida del servicio', 'sitio caído', 'sitio caido',
        'apagon', 'apagón', 'apagado total', 'todo caído', 'todo caido',
        'servicio caído', 'servicio caido', 'no funciona todo', 'sin servicio',
        'planta cae', 'planta caída', 'caida total', 'down total',
        'nada funciona', 'todo dejó de funcionar', 'todo se cayó',
        'toda la sede sin servicio', 'toda la planta sin servicio',
        'sede sin cámaras', 'sede sin camaras',
        'todas las cámaras caídas', 'todas las camaras caidas',
        'sin acceso al sistema', 'sistema de videovigilancia caído',
        'sistema de videovigilancia caido', 'plataforma caída', 'plataforma caida',
        'vms caído', 'vms caido',
        'ninguna cámara funciona', 'ninguna camara funciona',
        'no veo ninguna cámara', 'no veo ninguna camara',
        'no hay cámaras en la sede', 'no hay camaras en la sede',
        'perdimos todas las cámaras', 'perdimos todas las camaras',
        'no tenemos monitoreo', 'sin monitoreo',
        'no hay video en ningún monitor', 'no hay video en ningun monitor',
        'ninguna cámara aparece en el monitor', 'ninguna camara aparece en el monitor',
        'toda la red de cámaras está caída', 'toda la red de camaras esta caida',
        'toda la red de camaras cayó', 'red de cámaras caída',
        'red de camaras caida', 'caída general del sistema',
        'caida general del sistema', 'caída general de cámaras',
        'caida general de camaras',
        'todas las sedes sin servicio', 'se cayeron todas las sedes',
        'toda la ciudad sin cámaras', 'toda la ciudad sin camaras',

        'servidor principal caído', 'servidor principal caido',
        'servidor vms caído', 'servidor vms caido',
        'no responde el servidor vms', 'no responde el vms',
        'no abre el vms', 'no carga el vms', 'no carga el sistema',
        'no puedo entrar al vms', 'no puedo entrar al sistema',

        'caída general de red', 'caida general de red',
        'sin red en el centro de monitoreo', 'sin internet en el centro de monitoreo',
        'sin conexión con el sitio', 'sin conexion con el sitio',
        'no hay enlace con el sitio', 'perdimos enlace con el sitio'
      ],

      svc_outage_partial: [
        'afecta cámaras puntuales', 'afecta camaras puntuales',
        'algunas cámaras', 'algunas camaras',
        'varias cámaras caídas', 'varias camaras caidas',
        'sitio parcial', 'pérdida parcial', 'perdida parcial',
        'funciona parcialmente',
        'no funciona una zona', 'zona sin servicio', 'bloque sin servicio',
        'sector sin servicio', 'en una parte no funciona',
        'solo en cierto sector', 'solo algunas sedes',
        'solo algunas cámaras se caen', 'solo algunas camaras se caen',
        'fallas en un área', 'fallas en un area',
        'no se ven varias cámaras', 'no se ven varias camaras',
        'no veo algunas cámaras', 'no veo algunas camaras',
        'un grupo de cámaras cayó', 'un grupo de camaras cayo',
        'las cámaras de un sector no funcionan',
        'las camaras de un sector no funcionan',
        'cámaras de un sector sin señal', 'camaras de un sector sin señal',
        'no hay video en el piso 3', 'no hay video en el piso tres',
        'no hay cámaras en el bloque b', 'no hay camaras en el bloque b',
        'cámaras exteriores caídas', 'camaras exteriores caidas',
        'solo las cámaras exteriores están caídas',
        'solo las camaras exteriores estan caidas',
        'solo las cámaras internas fallan', 'solo las camaras internas fallan',
        'fallas en algunas sedes', 'problema en solo una sede',
        'un piso sin cámaras', 'un piso sin camaras',
        'dos cámaras caídas en la entrada', 'dos camaras caidas en la entrada'
      ],

      svc_outage_intermittent: [
        'intermitente', 'va y viene', 'se desconecta', 'se desconecta a ratos',
        'conexión intermitente', 'conexion intermitente', 'intermitencias',
        'ping con perdida', 'ping con pérdida', 'lag intermitente',
        'a ratos funciona', 'se cae y vuelve', 'se reconecta sola',
        'conexión inestable', 'conexion inestable', 'red inestable',
        'a veces responde a veces no', 'sube y baja', 'latencia intermitente',
        'a ratos se pierden las cámaras', 'a ratos se pierden las camaras',
        'las cámaras se caen por momentos', 'las camaras se caen por momentos',
        'a veces se ven y a veces no', 'a veces se ven a veces no',
        'a veces tenemos servicio y a veces no',
        'la señal se va y vuelve', 'la señal se cae y regresa',
        'se corta la señal', 'se corta el servicio',
        'micro cortes en el servicio', 'microcortes en el servicio',
        'cortes esporádicos', 'cortes esporadicos',
        'se congelan y luego vuelven', 'se cae el sitio y vuelve solo',
        'se desconecta cada rato', 'se desconecta muy seguido',
        'pierde el enlace de vez en cuando', 'pierde la conexión de vez en cuando',
        'el enlace está inestable', 'la conexión sube y baja'
      ],


      // =========================
      // camera_down
      // =========================
      cam_noresp: [
        'no responde', 'sin imagen', 'sin video', 'sin vídeo', 'sin señal',
        'sin senal', 'offline', 'fuera de linea', 'fuera de línea',
        'se cayó la cámara', 'se cayo la camara', 'se me cayó la cámara',
        'camara caida', 'cámara caída', 'cámara caida', 'camara no responde',
        'camara muerta', 'camara apagada', 'no da imagen', 'no toma imagen',
        'no se ve la camara', 'no se ve la cámara', 'pantalla negra',
        'imagen negra', 'video en negro', 'camara desconectada',
        'no aparece la cámara', 'camara perdida', 'camara fuera de servicio',
        'no detecta la cámara', 'no encuentra la cámara', 'cámara sin enlace',
        'cam sin señal', 'cam sin imagen'
      ],
      cam_frozen: [
        'congelada', 'imagen congelada', 'freeze', 'imagen fija', 'se queda pegada',
        'se queda pegado', 'frame asi', 'frame así', 'pixelada', 'imagen pixelada',
        'se queda en la misma imagen', 'sin movimiento', 'imagen trabada',
        'imagen detenida', 'se congela el video', 'video congelado',
        'video se queda quieto', 'se cuelga la imagen'
      ],
      cam_ptz: [
        'ptz', 'no gira', 'no mueve', 'no rota', 'ptz muerto', 'no responde ptz',
        'no apunta', 'no hace zoom', 'zoom no funciona', 'pan tilt no funciona',
        'pan no funciona', 'tilt no funciona', 'no mueve la camara',
        'no gira la camara', 'ptz trabado', 'ptz atascado', 'no recorre'
      ],
      cam_dark: [
        'oscura', 'muy oscura', 'se ve negro', 'sin luz', 'imagen muy oscura',
        'infra rojo no funciona', 'infra rojo dañado', 'ir falla', 'ir no sirve',
        'noche sin imagen', 'imagen tenue', 'se ve muy oscuro',
        'no se ve nada en la noche', 'modo noche no sirve', 'no activa el ir',
        'visión nocturna dañada', 'vision nocturna danada'
      ],

      // =========================
      // unauthorized_access
      // =========================
      acc_login_attempt: [
        'login sospechoso', 'intento login', 'intentos de login',
        'acceso no autorizado', 'intento intrusión', 'intento intrusion',
        'intruso', 'hack', 'hackeo', 'hackearon', 'se intentó entrar',
        'se intento entrar', 'credenciales robadas', 'credenciales comprometidas',
        'login fallido muchas veces', 'muchos intentos fallidos',
        'brute force', 'fuerza bruta', 'ataque de fuerza bruta',
        'inicio de sesión extraño', 'inicio sesion extraño',
        'actividad sospechosa en login', 'intentos raros de acceso'
      ],
      acc_bad_priv: [
        'permisos', 'privilegios', 'permiso indebido', 'acceso indebido', 'rol mal asignado',
        'permiso erroneo', 'permiso erróneo', 'privilegios excesivos',
        'tiene permisos que no debería', 'acceso mas alto del permitido',
        'rol incorrecto', 'nivel de acceso incorrecto', 'permisos mal configurados'
      ],
      acc_locked: [
        'cuenta bloqueada', 'usuario bloqueado', 'bloqueado', 'me bloquearon',
        'no puedo entrar', 'no puedo acceder', 'locked account',
        'usuario inhabilitado', 'mi usuario ya no entra', 'cuenta inactiva por bloqueo'
      ],

      // =========================
      // evidence_request
      // =========================
      evid_urgent: [
        'evidencia urgente', 'entrega urgente', 'urgente evidencia', 'cadena de custodia urgente',
        'necesito evidencia ya', 'urgente video', 'evidencia inmediata',
        'urgente la grabación', 'urgente la grabacion', 'video urgente',
        'requerimiento urgente de video', 'me urge la evidencia'
      ],
      evid_check: [
        'verificar disponibilidad', 'verificar evidencia', 'hay evidencia',
        'dónde está la grabación', 'donde esta la grabacion',
        'chequear grabación', 'chequear grabacion', 'buscar video',
        'buscar grabación', 'consultar si hay video', 'ver si hay grabación',
        'comprobar si existe evidencia', 'revisar si quedó grabado'
      ],
      evid_chain: [
        'cadena de custodia', 'cadena custodia', 'cadena de evidencia',
        'custodia', 'cadena legal', 'mantener custodia', 'custodia del video',
        'custodia de la grabación', 'custodia de la grabacion'
      ],

      // =========================
      // storage_issue
      // =========================
      stor_no_record: [
        'no graba', 'no hay grabaciones', 'sin grabaciones', 'nvr no graba',
        'no guarda video', 'no guarda vídeo', 'no hay footage',
        'falta grabación', 'falta grabacion', 'no aparecen grabaciones',
        'no quedó grabado', 'no registra video', 'no registra nada',
        'no se está guardando', 'no se esta guardando', 'se deja de grabar',
        'grabación interrumpida', 'grabacion interrumpida', 'grabacion no se guarda'
      ],
      stor_retention: [
        'retención', 'retencion', 'tiempo de retención', 'tiempo de retencion',
        'borró grabaciones', 'borro grabaciones', 'se borró', 'se borro',
        'se eliminaron grabaciones', 'política retención', 'politica retencion',
        'retención incorrecta', 'retencion incorrecta', 'retencion muy corta',
        'borra muy rápido', 'borra muy rapido', 'poca retención'
      ],
      stor_corrupt: [
        'corrupto', 'datos corruptos', 'archivo corrupto', 'archivo dañado',
        'grabación dañada', 'grabacion dañada', 'video corrupto', 'video dañado',
        'archivos dañados', 'integridad fallida', 'no se puede reproducir',
        'error al reproducir', 'archivo invalido', 'archivo inválido'
      ],

      // =========================
      // analytics_issue
      // =========================
      anal_fp: [
        'falso positivo', 'falsos positivos', 'detecta cosas donde no hay',
        'alarma falsa', 'alerta falsa', 'demasiados falsos', 'ruido en analitica',
        'ruido en analítica', 'salta alertas sin motivo', 'detecta de más',
        'detecta movimiento donde no hay', 'demasiadas alarmas falsas'
      ],
      anal_miss: [
        'no detecta', 'no detecta personas', 'no detecta vehículos',
        'no detecta vehiculos', 'miss', 'missed detections', 'no reconoce eventos',
        'se salta eventos', 'se saltó el evento', 'no activó la alarma',
        'no disparó la alerta', 'no marca el evento'
      ],
      anal_perf: [
        'lento analitica', 'lento analítica', 'rendimiento analitica',
        'rendimiento analítica', 'cpu alta en analitica', 'cpu alta en analítica',
        'lag analitica', 'lag analítica', 'modelo lento', 'timeout analitica',
        'timeout analítica', 'tarda mucho en detectar', 'demora la detección',
        'procesamiento muy lento', 'analisis muy lento', 'análisis muy lento'
      ],

      // =========================
      // maintenance
      // =========================
      mant_preventive: [
        'preventivo', 'mantenimiento preventivo', 'visita preventiva', 'programado',
        'inspección', 'revisión programada', 'mantenimiento programado',
        'agenda de mantenimiento', 'revisión preventiva', 'chequeo general'
      ],
      mant_replace: [
        'reemplazo equipo', 'reemplazar cámara', 'reemplazar camara',
        'sustitución', 'cambio de equipo', 'swap cámara', 'swap camara',
        'equipo dañado', 'cámara dañada', 'camara dañada', 'equipo averiado',
        'hay que cambiar la cámara', 'hay que cambiar la camara'
      ],
      mant_power: [
        'energia', 'energía', 'energia fallo', 'corte energia', 'corte de energía',
        'corte de energia', 'problema eléctrico', 'problema electrico',
        'cableado', 'cable cortado', 'sin corriente', 'poe no da energía',
        'poe no da energia', 'sin alimentación', 'sin alimentacion',
        'se fue la luz', 'fallo de luz', 'no llega voltaje'
      ],

      // =========================
      // vandalism
      // =========================
      vand_report: [
        'daño físico', 'daño fisico', 'golpearon la cámara', 'golpearon la camara',
        'carcasa dañada', 'carcasa danada', 'rotura', 'vandalismo',
        'rotura cámara', 'rotura camara', 'impacto cámara', 'impacto camara',
        'cámara rayada', 'camara rayada', 'la golpearon', 'la tumbaron',
        'la forzaron', 'le pegaron a la camara', 'le pegaron a la cámara'
      ],
      vand_theft: [
        'robo de equipo', 'robaron la cámara', 'robaron la camara',
        'robaron una cámara', 'robaron una camara',
        'robaron camara', 'robaron cámara',
        'hurto cámara', 'hurto camara',
        'robo', 'robó la camara', 'robó la cámara',
        'equipo robado', 'camara robada', 'cámara robada',
        'se llevaron la camara', 'se llevaron la cámara',
        'se robaron la cámara', 'se robaron la camara',
        'se la robaron', 'se la llevaron',
        'stolen camera', 'robaron equipo', 'hurtaron la camara',
        'hurtaron la cámara'
      ],


      // =========================
      // other_issue
      // =========================
      other_describe: [
        'otro', 'otra incidencia', 'otro problema', 'describir problema',
        'help', 'soporte general', 'necesito ayuda', 'tengo un inconveniente',
        'no sé qué pasa', 'no se que pasa', 'algo está fallando',
        'algo esta fallando', 'algo raro', 'comportamiento extraño'
      ]
    };

    this.actionMap = {
      cam_noresp: [
        'Verificar alimentación PoE / energía',
        'Comprobar enlace de red (ping/SNMP)',
        'Reiniciar cámara remotamente',
        'Verificar estado del puerto en el switch',
        'Confirmar que la cámara responde a ping desde el NVR o VMS'
      ],
      cam_frozen: [
        'Reiniciar proceso de captura',
        'Revisar CPU del NVR',
        'Comprobar versiones de firmware',
        'Revisar saturación de ancho de banda en el segmento de red',
        'Revisar logs del VMS para errores de streaming'
      ],
      cam_ptz: [
        'Realizar test PTZ (pan/tilt/zoom)',
        'Verificar cableado de control',
        'Comprobar límites de recorrido',
        'Verificar configuración de presets y tours de la PTZ'
      ],
      cam_dark: [
        'Revisar IR / iluminación',
        'Ajustar exposición/ganancia',
        'Verificar lente y obstrucciones',
        'Revisar si el modo día/noche está configurado correctamente'
      ],
      svc_outage_site: [
        'Escalar a infraestructura / verificar core router',
        'Comprobar enlaces ISP y energía del sitio',
        'Revisar estado de switches principales y nodos críticos'
      ],
      svc_outage_partial: [
        'Inspeccionar switches PoE del sector',
        'Revisar backlog de tráfico y latencia',
        'Verificar VLAN de cámaras afectadas y rutas asociadas'
      ],
      svc_outage_intermittent: [
        'Monitoreo de paquetes (ping/traceroute)',
        'Revisar logs de estabilidad del NMS',
        'Revisar errores de interfaz en los switches (CRC, drops)'
      ],
      acc_login_attempt: [
        'Bloquear IP sospechosa',
        'Rotar credenciales',
        'Revisar logs y origen de sesión',
        'Verificar intentos fallidos y aplicar MFA si está disponible'
      ],
      acc_bad_priv: [
        'Revisar roles y permisos',
        'Aplicar principio de menor privilegio',
        'Auditar cambios recientes',
        'Actualizar matriz de permisos según política de seguridad'
      ],
      acc_locked: [
        'Desbloquear cuenta tras verificación',
        'Revisar política de bloqueo',
        'Validar identidad del usuario antes de habilitar acceso'
      ],
      evid_urgent: [
        'Priorizar recuperación y exportación de grabaciones',
        'Asignar evidencia al caso legal',
        'Asegurar la cadena de custodia y registrar quién accede al material'
      ],
      evid_check: [
        'Buscar en índices de VMS por timestamp y cámara',
        'Verificar replicación en nube',
        'Confirmar que la cámara seleccionada graba en el horario solicitado'
      ],
      stor_no_record: [
        'Revisar servicios VMS/NVR',
        'Verificar rotación de disco y espacio disponible',
        'Comprobar si hay fallos en los discos o en la matriz de almacenamiento'
      ],
      stor_retention: [
        'Revisar políticas de retención y backups',
        'Comprobar jobs de replicación',
        'Validar configuración de días de retención por normativa'
      ],
      stor_corrupt: [
        'Ejecutar verificación de integridad',
        'Restaurar desde backup si procede',
        'Registrar el incidente por posible pérdida de evidencia'
      ],
      anal_fp: [
        'Ajustar umbrales del detector',
        'Reentrenar o recalibrar modelo',
        'Filtrar zonas de interés',
        'Revisar configuración de máscaras de movimiento'
      ],
      anal_miss: [
        'Verificar calidad de imagen',
        'Aumentar sensibilidad del detector',
        'Reentrenar datasets',
        'Reubicar la cámara si el ángulo no es adecuado'
      ],
      anal_perf: [
        'Optimizar recursos (GPU/CPU)',
        'Revisar batch size y latencias de inferencia',
        'Verificar que el servidor de analítica no esté sobrecargado'
      ],
      mant_preventive: [
        'Programar visita técnica',
        'Ejecutar checklist preventivo',
        'Actualizar bitácora de mantenimiento'
      ],
      mant_replace: [
        'Agendar reemplazo y logística',
        'Validar garantía del equipo',
        'Asegurar disponibilidad del repuesto antes de la intervención'
      ],
      mant_power: [
        'Verificar UPS y tableros',
        'Revisar PoE injector/switch',
        'Comprobar estado de breakers y protecciones eléctricas'
      ],
      vand_report: [
        'Generar orden de reparación física',
        'Solicitar evidencia a campo',
        'Registrar incidente de vandalismo para seguimiento con seguridad física'
      ],
      vand_theft: [
        'Notificar a seguridad y policía',
        'Iniciar cadena de custodia y recuperación',
        'Registrar el equipo robado en inventario y bloquear su uso'
      ]
    };
  }

  normalize(text) {
    if (!text) return '';
    const withLower = text.toLowerCase();
    const normalized = withLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalized
      .replace(/[\.,;:!¿\?()\[\]\"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  containsAny(normalizedText, keywords) {
    for (const kw of keywords) {
      const k = kw.toLowerCase();
      const kn = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalizedText.includes(kn)) return true;
      const re = new RegExp('\\b' + kn.replace(/\s+/g, '\\s+') + '\\b', 'i');
      if (re.test(normalizedText)) return true;
    }
    return false;
  }

  computeConfidence(matchesCount, textLength, base = 0.6) {
    const boost = Math.min(0.25, matchesCount * 0.08);
    const lengthBoost = Math.min(0.1, Math.log10(Math.max(10, textLength)) * 0.02);
    return Math.min(0.98, base + boost + lengthBoost);
  }

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

    const matches = [];

    for (const [subtype, keywords] of Object.entries(this.keywordMap)) {
      if (this.containsAny(normalized, keywords)) {
        matches.push(subtype);
      }
    }

    if (matches.length > 0) {
      detected.detectedSubtypes = [...new Set(matches)];

      const first = detected.detectedSubtypes[0];
      const serviceKey = first.split('_')[0]; 

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

      const priorityOrder = [
        'svc_outage_site', 'svc_outage_intermittent', 'svc_outage_partial',
        'cam_noresp', 'cam_frozen', 'cam_ptz', 'cam_dark',
        'stor_no_record', 'stor_corrupt', 'stor_retention',
        'acc_login_attempt', 'acc_bad_priv', 'acc_locked',
        'evid_urgent', 'evid_chain', 'evid_check',
        'anal_fp', 'anal_miss', 'anal_perf',
        'vand_theft', 'vand_report',
        'mant_replace', 'mant_power', 'mant_preventive',
        'other_describe'
      ];

      let chosenSub = detected.detectedSubtypes.find(s => priorityOrder.includes(s));
      if (!chosenSub) chosenSub = detected.detectedSubtypes[0];

      detected.subType = chosenSub;
      detected.service = serviceMapping[chosenSub] || 'other_issue';
      detected.symptoms = detected.detectedSubtypes.slice(0, 6); // top symptoms
    }

    if (detected.detectedSubtypes.length === 0) {
      if (this.containsAny(normalized, ['camara', 'cámara', 'cam', 'camaras', 'cámaras', 'camera'])) {
        detected.service = 'camera_down';
        detected.subType = 'cam_noresp';
        detected.symptoms.push('cam_general');
      } else if (this.containsAny(normalized, ['nvr', 'vms', 'grabacion', 'grabación', 'graba', 'grabar', 'grabaciones'])) {
        detected.service = 'storage_issue';
        detected.subType = 'stor_no_record';
        detected.symptoms.push('storage_general');
      } else if (this.containsAny(normalized, ['analitica', 'analítica', 'detectar', 'modelo', 'falso positivo', 'falsos positivos'])) {
        detected.service = 'analytics_issue';
        detected.subType = 'anal_fp';
        detected.symptoms.push('analytics_general');
      } else if (this.containsAny(normalized, ['login', 'acceso', 'intruso', 'hack', 'credencial'])) {
        detected.service = 'unauthorized_access';
        detected.subType = 'acc_login_attempt';
        detected.symptoms.push('security_general');
      } else {
        detected.service = 'other_issue';
        detected.subType = 'other_describe';
        detected.symptoms.push('none_detected');
      }
    }

    const matchesCount = detected.detectedSubtypes.length || detected.symptoms.length || 0;
    detected.confidence = this.computeConfidence(matchesCount, raw.length, 0.62);

    detected.decisions = this.makeDecisions(
      detected.detectedSubtypes.length ? detected.detectedSubtypes : [detected.subType]
    );

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
