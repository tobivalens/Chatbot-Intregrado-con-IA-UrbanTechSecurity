
// bot/handlers.js
const { mainMenu, submenus } = require('./menu');
const { getImpact } = require('./slas');
const db = require('./db');
const { notifyNOC } = require('./notifications');
const { saveEvidences } = require('./evidence');
const { serviceLabel, subtypeLabel } = require('./labels');
const { createItopIncident } = require('./itopClient');
let BasicLM, AdvancedLM;
try {
  BasicLM = require('./ai/BasicLM');         
  AdvancedLM = require('./ai/AdvancedLM');   
} catch (e) {
  console.warn('IA modules not found (./bot/ai/*). IA features will be disabled.');
  BasicLM = null;
  AdvancedLM = null;
}


const userStates = {};

function attachHandlers(bot) {
  attachHandlers.userStates = userStates;

  // ======================================================
  // 📨 MESSAGE HANDLER
  // ======================================================
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text || '';

    // If no state yet
    if (!userStates[userId]) {
      if (msg.text && msg.text.startsWith('/')) {
        userStates[userId] = { pendingEvidences: [] };
        return;
      }
      userStates[userId] = { step: 'start', pendingEvidences: [] };
      bot.sendMessage(chatId, '¡Hola! Soy Claudia. Selecciona el tipo de incidente:', mainMenu);
      return;
    }

    const state = userStates[userId];

    //
    // -----------------------
    //  IA FLOWS (separados)
    // -----------------------
    //

    if (state.step === 'ia_processing') {
      if (!BasicLM) {
        bot.sendMessage(chatId, 'La funcionalidad de IA básica no está disponible en este despliegue.');
        state.step = 'start';
        return;
      }

      const analysis = BasicLM.classify(text);
      const userInfo = BasicLM.parseUser(text);

      
      state.service = analysis.service;
      state.subType = analysis.subType;
      state.description = text;
      state.name = userInfo.name || state.name || `Usuario_${userId}`;
      state.idNumber = userInfo.id || state.idNumber || 'Por confirmar';
      state.phone = userInfo.phone || state.phone || 'Por confirmar';
      state.ia_mode = 1; 
      state.ia_confidence = analysis.confidence || 0.0;
      state.ia_decisions = null;

      const summary = `
🤖 <b>Análisis IA - Resumen Detectado</b>

<b>Confianza:</b> ${(state.ia_confidence * 100).toFixed(1)}%
<b>Servicio sugerido:</b> ${serviceLabel(state.service)}
<b>Subtipo sugerido:</b> ${subtypeLabel(state.subType)}
<b>Nombre detectado:</b> ${state.name}
<b>Cédula detectada:</b> ${state.idNumber}
<b>Teléfono detectado:</b> ${state.phone}

¿Confirmas la creación del ticket con esta información?
      `;

      state.step = 'ia_confirmation';
      return bot.sendMessage(chatId, summary, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Sí, crear ticket', callback_data: 'ia_confirm' }],
            [{ text: '✏️ Editar información', callback_data: 'ia_edit' }],
            [{ text: '⬅️ Volver al menú principal', callback_data: 'back_main' }]
          ]
        }
      });
    }

    if (state.step === 'ia_advanced_processing') {
      if (!AdvancedLM) {
        bot.sendMessage(chatId, 'La funcionalidad de IA avanzada no está disponible en este despliegue.');
        state.step = 'start';
        return;
      }

      try {
        bot.sendMessage(chatId, '🧠 Analizando con IA avanzada...');
        const analysis = await AdvancedLM.analyze(text);

        state.service = analysis.service;
        state.subType = analysis.subType;
        state.description = text;
        state.name = analysis.userDetected?.name || state.name || `Usuario_${userId}`;
        state.idNumber = analysis.userDetected?.id || state.idNumber || '';
        state.phone = analysis.userDetected?.phone || state.phone || '';
        state.ia_mode = 2; 
        state.ia_confidence = analysis.confidence || 0.0;
        state.ia_decisions = analysis.decisions ? JSON.stringify(analysis.decisions) : null;
        state.ia_analysis = analysis; 

        state.step = 'ia_advanced_ask_name';
        return bot.sendMessage(
          chatId,
          'Antes de crear el ticket, por favor ingresa tu nombre completo:'
        );
      } catch (err) {
        console.error('Error IA avanzada:', err);
        bot.sendMessage(chatId, '❌ Error durante el análisis con IA avanzada. Por favor intenta de nuevo o usa el menú.');
        state.step = 'start';
      }
      return;
    }

    //
    // -----------------------
    //  MEDIA/EVIDENCE HANDLING (existing)
    // -----------------------
    //
    if (
      state.step === 'awaiting_description' &&
      (msg.photo || msg.video || msg.document || msg.audio)
    ) {
      const media = msg.photo
        ? msg.photo[msg.photo.length - 1]
        : msg.video || msg.document || msg.audio;

      state.pendingEvidences.push({
        file_id: media.file_id,
        file_type: msg.photo ? 'photo' : msg.video ? 'video' : msg.document ? 'document' : 'audio'
      });

      if (msg.caption)
        state.description = (state.description ? state.description + '\n' : '') + msg.caption;

      return saveTicketFromState(bot, chatId, userId);
    }

    //
    // -----------------------
    //  FORM STEPS (existing)
    // -----------------------
    //
    if (state.step === 'awaiting_name') {
      state.name = msg.text;
      state.step = 'awaiting_id';
      return bot.sendMessage(chatId, 'Por favor ingresa tu número de cédula:');
    }

    if (state.step === 'awaiting_id') {
      state.idNumber = msg.text;
      state.step = 'awaiting_phone';
      return bot.sendMessage(chatId, 'Por favor ingresa tu número de teléfono:');
    }

    if (state.step === 'awaiting_phone') {
      state.phone = msg.text;
      state.step = 'awaiting_description';
      return bot.sendMessage(chatId, 'Describe el incidente con detalle (puedes enviar fotos/videos):');
    }

    if (state.step === 'awaiting_description') {
      state.description = msg.text;
      return saveTicketFromState(bot, chatId, userId);
    }

    // ===============================
    // IA AVANZADA: pedir nombre / cédula / teléfono
    // ===============================
    if (state.step === 'ia_advanced_ask_name') {
      state.name = text;
      state.step = 'ia_advanced_ask_id';
      return bot.sendMessage(chatId, 'Por favor ingresa tu número de cédula:');
    }

    if (state.step === 'ia_advanced_ask_id') {
      state.idNumber = text;
      state.step = 'ia_advanced_ask_phone';
      return bot.sendMessage(chatId, 'Por favor ingresa tu número de teléfono:');
    }

    if (state.step === 'ia_advanced_ask_phone') {
      state.phone = text;

      const a = state.ia_analysis || {};
      const sintomas = a.symptoms && a.symptoms.length
        ? a.symptoms.join(', ')
        : 'Ninguno';
      const decisionesTxt = a.decisions && a.decisions.length
        ? a.decisions.map(d => `• ${d}`).join('\n')
        : 'Ninguna';

      const summary = `
🧠 <b>ANÁLISIS IA AVANZADA</b>

<b>Confianza:</b> ${(state.ia_confidence * 100).toFixed(1)}%
<b>Servicio sugerido:</b> ${serviceLabel(state.service)}
<b>Subtipo sugerido:</b> ${subtypeLabel(state.subType)}
<b>Síntomas detectados:</b> ${sintomas}

<b>Acciones sugeridas:</b>
${decisionesTxt}

<b>Nombre:</b> ${state.name}
<b>Cédula:</b> ${state.idNumber}
<b>Teléfono:</b> ${state.phone}

¿Confirmas la creación del ticket con esta información?
      `;

      state.step = 'ia_advanced_confirmation';
      return bot.sendMessage(chatId, summary, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Confirmar y crear ticket', callback_data: 'ia_advanced_confirm' }],
            [{ text: '⬅️ Volver al menú principal', callback_data: 'back_main' }]
          ]
        }
      });
    }

    //
    // ============================================
    // 📌 LECTURA DE TICKET ID DESDE "MIS CONSULTAS"
    // ============================================
    //
    if (state.step === 'awaiting_ticket_id') {
      const id = msg.text.replace(/[^0-9]/g, '');
      state.step = null;

      if (!id) return bot.sendMessage(chatId, '❌ ID inválido. Intenta de nuevo.');

      db.query('SELECT * FROM tickets WHERE id = ?', [id], (err, results) => {
        if (err) return bot.sendMessage(chatId, "Error consultando ticket.");
        if (!results.length) return bot.sendMessage(chatId, `No existe ticket con ID ${id}.`);

        const t = results[0];

        let resp =
          `📄 <b>Ticket ${t.id}</b>\n` +
          `Estado: ${t.status}\n` +
          `Servicio: ${serviceLabel(t.incident_type)}\n` +
          `Subtipo: ${subtypeLabel(t.sub_type)}\n` +
          `Prioridad: ${t.priority}\n` +
          `Descripción: ${t.description}\n` +
          `Creado: ${t.created_at}`;

        bot.sendMessage(chatId, resp, { parse_mode: "HTML" });

        db.query('SELECT * FROM evidences WHERE ticket_id = ?', [id], (e2, evids) => {
          if (!e2 && evids.length) {
            evids.forEach(ev => {
              if (ev.file_type === "photo")
                bot.sendPhoto(chatId, ev.file_id, { caption: "Evidencia (foto)" });
              else if (ev.file_type === "video")
                bot.sendVideo(chatId, ev.file_id, { caption: "Evidencia (video)" });
              else
                bot.sendDocument(chatId, ev.file_id, { caption: `Evidencia (${ev.file_type})` });
            });
          }
        });
      });
      return;
    }

    // Show menu when explicitly requested
    if (msg.text && (msg.text.toLowerCase() === '/menu' || msg.text.toLowerCase() === 'menu')) {
      bot.sendMessage(chatId, 'Selecciona el tipo de incidente:', mainMenu);
    }
  });

  // ======================================================
  // 🔵 CALLBACK QUERY HANDLER
  // ======================================================
  bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (!userStates[userId]) userStates[userId] = { pendingEvidences: [] };
    const state = userStates[userId];

    const mainOptions = Object.keys(submenus);

    // ============================================
    // 📁 MIS CONSULTAS
    // ============================================
    if (data === 'my_queries') {
      bot.sendMessage(chatId, "📁 *Mis consultas:*", {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔍 Consultar ticket por ID", callback_data: "query_ticket" }],
            [{ text: "📜 Ver historial", callback_data: "menu_history" }],
            [{ text: "⬅️ Volver", callback_data: "back_main" }]
          ]
        }
      });
      bot.answerCallbackQuery(query.id);
      return;
    }

    // 🔍 pedir ID
    if (data === 'query_ticket') {
      state.step = 'awaiting_ticket_id';
      bot.sendMessage(chatId, "Ingresa el ID del ticket:");
      bot.answerCallbackQuery(query.id);
      return;
    }

    // 📜 historial
    if (data === 'menu_history') {
      const tgId = userId;
      db.query(
        "SELECT id, incident_type, sub_type, status, created_at FROM tickets WHERE reporter_telegram_id = ? ORDER BY created_at DESC LIMIT 20",
        [tgId],
        (err, results) => {
          if (err) {
            bot.sendMessage(chatId, "Error consultando historial.");
            bot.answerCallbackQuery(query.id);
            return;
          }
          if (!results.length) {
            bot.sendMessage(chatId, "No tienes tickets registrados.");
            bot.answerCallbackQuery(query.id);
            return;
          }

          let text = "📚 <b>Tus últimos tickets</b>:\n\n";
          results.forEach(r => {
            text += `<b>#${r.id}</b> — ${serviceLabel(r.incident_type)}\n`;
            text += `   ${subtypeLabel(r.sub_type)}\n`;
            text += `   Estado: ${r.status} — Creado: ${r.created_at}\n\n`;
          });

          bot.sendMessage(chatId, text, { parse_mode: "HTML" });
          bot.answerCallbackQuery(query.id);
        }
      );
      return;
    }

    // regresar al main menu
    if (data === 'back_main') {
      bot.sendMessage(chatId, 'Selecciona el tipo de incidente:', mainMenu);
      bot.answerCallbackQuery(query.id);
      return;
    }

    // MAIN MENU OPTIONS
    if (mainOptions.includes(data)) {
      state.service = data;
      bot.sendMessage(chatId, "Selecciona un subtipo:", submenus[data]);
      bot.answerCallbackQuery(query.id);
      return;
    }

    // Subtypes
    const prefixes = ['cam_', 'acc_', 'evid_', 'stor_', 'anal_', 'mant_', 'vand_', 'other_', 'svc_', 'evid_'];
    if (prefixes.some(p => data.startsWith(p))) {
      state.subType = data;
      state.step = 'awaiting_name';
      bot.sendMessage(chatId, "Perfecto. Para crear el ticket, por favor ingresa tu nombre completo:");
      bot.answerCallbackQuery(query.id);
      return;
    }

    //
    // -----------------------
    //  IA callbacks (no tocan otros flujos)
    // -----------------------
    //

   
    if (data === 'ia_assistant') {
      state.step = 'ia_processing';
      state.mode = 'ia_basic';
      bot.sendMessage(chatId, '🚀 <b>Modo IA Básica Activado</b>\n\nPor favor describe tu problema en un solo mensaje (ej: "Mi cámara 123 está sin imagen, soy Juan, cédula 12345678").', { parse_mode: 'HTML' });
      bot.answerCallbackQuery(query.id);
      return;
    }


    if (data === 'ia_advanced') {
      state.step = 'ia_advanced_processing';
      state.mode = 'ia_advanced';
      bot.sendMessage(chatId,
        `🚀 <b>MODO IA AVANZADA ACTIVADO</b>

Describe tu problema en detalle y la IA analizará y tomará decisiones técnicas.`, { parse_mode: 'HTML' });
      bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'ia_confirm') {
  
      saveTicketFromState(bot, chatId, userId);
      bot.answerCallbackQuery(query.id);
      return;
    }

  
    if (data === 'ia_edit') {
      state.step = 'ia_edit_name';
      bot.sendMessage(chatId, 'Ingresa tu nombre completo:');
      bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'ia_advanced_confirm') {
      saveTicketFromState(bot, chatId, userId);
      bot.answerCallbackQuery(query.id);
      return;
    }

   
    if (data === 'ia_advanced_edit') {
      state.step = 'ia_advanced_edit_name';
      bot.sendMessage(chatId, 'Ingresa tu nombre completo:');
      bot.answerCallbackQuery(query.id);
      return;
    }

    if (data === 'ia_edit_confirm_save') {
      saveTicketFromState(bot, chatId, userId);
      bot.answerCallbackQuery(query.id);
      return;
    }

    bot.answerCallbackQuery(query.id);
  });

  // ======================================================
  // /estado COMMAND
  // ======================================================
  bot.onText(/\/estado\s+(\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const id = match[1];

    db.query("SELECT * FROM tickets WHERE id = ?", [id], (err, res) => {
      if (err) return bot.sendMessage(chatId, "Error consultando ticket.");
      if (!res.length) return bot.sendMessage(chatId, `No existe ticket con ID ${id}.`);

      const t = res[0];

      const resp =
        `📄 <b>Ticket ${t.id}</b>\n` +
        `Estado: ${t.status}\n` +
        `Servicio: ${serviceLabel(t.incident_type)}\n` +
        `Subtipo: ${subtypeLabel(t.sub_type)}\n` +
        `Prioridad: ${t.priority}\n` +
        `Descripción: ${t.description}\n` +
        `Creado: ${t.created_at}\n` +
        `SLA: ${t.sla_target || "—"}`;

      bot.sendMessage(chatId, resp, { parse_mode: "HTML" });

      db.query("SELECT * FROM evidences WHERE ticket_id = ?", [id], (err2, evids) => {
        if (!err2 && evids.length) {
          evids.forEach(ev => {
            if (ev.file_type === "photo") bot.sendPhoto(chatId, ev.file_id, { caption: "Evidencia (foto)" });
            else if (ev.file_type === "video") bot.sendVideo(chatId, ev.file_id, { caption: "Evidencia (video)" });
            else bot.sendDocument(chatId, ev.file_id, { caption: `Evidencia (${ev.file_type})` });
          });
        }
      });
    });
  });

  // ======================================================
  // /historial COMMAND
  // ======================================================
  bot.onText(/\/historial/, (msg) => {
    const chatId = msg.chat.id;
    const tgId = msg.from.id;

    db.query(
      "SELECT id, incident_type, sub_type, status, created_at FROM tickets WHERE reporter_telegram_id = ? ORDER BY created_at DESC LIMIT 20",
      [tgId],
      (err, results) => {
        if (err) return bot.sendMessage(chatId, "Error consultando historial.");
        if (!results.length) return bot.sendMessage(chatId, "No tienes tickets registrados.");

        let text = "📚 <b>Tus últimos tickets</b>:\n\n";
        results.forEach(r => {
          text += `<b>#${r.id}</b> — ${serviceLabel(r.incident_type)}\n`;
          text += `   ${subtypeLabel(r.sub_type)}\n`;
          text += `   Estado: ${r.status} — Creado: ${r.created_at}\n\n`;
        });

        bot.sendMessage(chatId, text, { parse_mode: "HTML" });
      }
    );
  });

  // ======================================================
  // /cerrar <id>
  // ======================================================
  bot.onText(/\/cerrar\s+(\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const ticketId = match[1];

    db.query(
      "UPDATE tickets SET status = 'closed', closed_at = ? WHERE id = ?",
      [new Date(), ticketId],
      (err, res) => {
        if (err) return bot.sendMessage(chatId, "Error cerrando ticket.");
        if (res.affectedRows === 0) return bot.sendMessage(chatId, "No existe ese ticket.");
        bot.sendMessage(chatId, `✔ Ticket ${ticketId} cerrado correctamente.`);
      }
    );
  });

  // /getchatid
  bot.onText(/\/getchatid/, (msg) => {
    bot.sendMessage(msg.chat.id, `chat_id: ${msg.chat.id}`);
  });

  attachHandlers.saveTicketFromState = saveTicketFromState;
}

// ======================================================
// SAVE TICKET
// ======================================================
// This function is intentionally kept compatible with your previous DB schema.
// It now also saves IA metadata if present on state (ia_mode, ia_confidence, ia_decisions)
// y además crea el incidente en iTOP en segundo plano.
function saveTicketFromState(bot, chatId, userId) {
  const state = userStates[userId];
  if (!state) return bot.sendMessage(chatId, 'Estado del usuario no encontrado. Por favor inicia nuevamente.');

  const impact = getImpact(state.service, state.subType);

  const ticket = {
    full_name: state.name,
    user_id: state.idNumber,
    phone: state.phone,
    incident_type: state.service,
    sub_type: state.subType,
    description: state.description,
    category: impact.category,
    priority: impact.priority,
    resolution_hours: impact.resolution_hours,
    resolution_time: impact.resolution_time,
    sla_target: impact.sla_target,
    status: "open",
    reporter_telegram_id: userId,
    created_at: new Date(),
    // IA metadata (nullable)
    ia_mode: state.ia_mode || 0,
    ia_confidence: state.ia_confidence || null,
    ia_decisions: state.ia_decisions || null
  };

  db.query("INSERT INTO tickets SET ?", ticket, (err, result) => {
    if (err) {
      console.error('Error inserting ticket:', err);
      return bot.sendMessage(chatId, "❌ Error al guardar el ticket.");
    }

    const id = result.insertId;

    if (state.pendingEvidences && state.pendingEvidences.length > 0) {
      const values = state.pendingEvidences.map(ev => [
        id,
        ev.file_id,
        ev.file_type,
        new Date()
      ]);
      db.query(
        "INSERT INTO evidences (ticket_id, file_id, file_type, created_at) VALUES ?",
        [values],
        (eErr) => {
          if (eErr) console.error('Error saving evidences:', eErr);
        }
      );
    }

    let modeIcon, modeText;
    if (ticket.ia_mode === 2) {
      modeIcon = '🧠 ';
      modeText = 'IA Avanzada';
    } else if (ticket.ia_mode === 1) {
      modeIcon = '🤖 ';
      modeText = 'IA Básica';
    } else {
      modeIcon = '✅ ';
      modeText = 'Manual';
    }

    let response = `${modeIcon}<b>Ticket creado exitosamente</b>${modeIcon}\n\n`;
    response += `<b>ID del Ticket:</b> ${id}\n`;
    response += `<b>Nombre:</b> ${ticket.full_name}\n`;
    response += `<b>Cédula:</b> ${ticket.user_id}\n`;
    response += `<b>Teléfono:</b> ${ticket.phone}\n`;
    response += `<b>Tipo de incidente:</b> ${serviceLabel(ticket.incident_type)}\n`;
    response += `<b>Subtipo:</b> ${subtypeLabel(ticket.sub_type)}\n`;
    response += `<b>Modo:</b> ${modeText}\n\n`;

    response += `<b>Impacto:</b>\n`;
    response += `- <b>Categoría:</b> ${ticket.category}\n`;
    response += `- <b>Prioridad:</b> ${ticket.priority}\n`;
    response += `- <b>Tiempo de resolución:</b> ${ticket.resolution_time}\n\n`;

    if (state.ia_analysis) {
      const decCount = (state.ia_analysis.decisions && state.ia_analysis.decisions.length) || 0;
      response += `<b>Decisiones automáticas:</b> ${decCount}\n\n`;
    }

    response += `Nuestro equipo está trabajando en tu solicitud. Gracias por reportarlo.`;

    bot.sendMessage(chatId, response, { parse_mode: "HTML" });

    // ======== Notificar NOC (igual que antes) ========
    notifyNOC({
      id,
      incident_type: ticket.incident_type,
      sub_type: ticket.sub_type,
      priority: ticket.priority,
      full_name: ticket.full_name,
      user_id: ticket.user_id,
      description: ticket.description,
      sla_target: ticket.sla_target,
      ia_mode: ticket.ia_mode,
      ia_confidence: ticket.ia_confidence,
      ia_decisions: ticket.ia_decisions
    });

    createItopIncident({ ...ticket, id })
      .then((itopResp) => {
        if (!itopResp) return;

        let itopId = null;

        if (itopResp.objects) {
          const firstKey = Object.keys(itopResp.objects)[0];
          const obj = itopResp.objects[firstKey];
          if (obj && obj.fields && obj.fields.ref) {
            itopId = obj.fields.ref;     
          } else {
            itopId = firstKey;         
          }
        } else if (itopResp.id) {
          itopId = itopResp.id;
        }

        if (itopId) {
          db.query(
            "UPDATE tickets SET itop_id = ? WHERE id = ?",
            [itopId, id],
            (uErr) => {
              if (uErr) console.error('Error guardando itop_id:', uErr);
            }
          );

          bot.sendMessage(
            chatId,
            `🔗 El incidente también fue registrado en iTOP con ID: <b>${itopId}</b>`,
            { parse_mode: 'HTML' }
          );
        } else {
          console.warn('Respuesta de iTOP sin objetos/ID claro:', itopResp);
        }
      })
      .catch((e) => {
        console.error('Error creando incidente en iTOP:', e.message || e);
        bot.sendMessage(
          chatId,
          '⚠ El ticket fue creado en Claudia, pero no se pudo registrar automáticamente en iTOP.',
        );
      });

    delete userStates[userId];
  });
}

module.exports = { attachHandlers };
