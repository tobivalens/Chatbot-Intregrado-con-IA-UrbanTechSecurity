// bot/handlers.js (REEMPLAZAR)
const { mainMenu, submenus } = require('./menu');
const { getImpact } = require('./slas');
const db = require('./db');
const { notifyNOC } = require('./notifications');
const { saveEvidences } = require('./evidence');
const { serviceLabel, subtypeLabel } = require('./labels');

// in-memory user states
const userStates = {}; // { [userId]: { step, service, subType, name, idNumber, phone, description, pendingEvidences: [] } }

function attachHandlers(bot) {
  attachHandlers.userStates = userStates;

  // Message handler
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // If no state yet
    if (!userStates[userId]) {
      // If user sent a command (starts with /) we DON'T auto-open menu
      if (msg.text && msg.text.startsWith('/')) {
        userStates[userId] = { pendingEvidences: [] };
        return; // allow onText handlers to run
      }
      // otherwise start flow
      userStates[userId] = { step: 'start', pendingEvidences: [] };
      bot.sendMessage(chatId, '¡Hola! Soy Atlas. Selecciona el tipo de incidente:', mainMenu);
      return;
    }

    const state = userStates[userId];

    // If receiving media while awaiting description, capture as evidence
    if (state.step === 'awaiting_description' && (msg.photo || msg.video || msg.document || msg.audio)) {
      const media = msg.photo ? msg.photo[msg.photo.length - 1] : (msg.video || msg.document || msg.audio);
      const fileId = media.file_id;
      const fileType = msg.photo ? 'photo' : (msg.video ? 'video' : (msg.document ? 'document' : 'audio'));
      state.pendingEvidences = state.pendingEvidences || [];
      state.pendingEvidences.push({ file_id: fileId, file_type: fileType });
      // optional caption
      if (msg.caption) state.description = (state.description ? state.description + '\n' : '') + msg.caption;
      // proceed to save right away
      return saveTicketFromState(bot, chatId, userId);
    }

    // normal text flow
    if (state.step === 'awaiting_name') {
      state.name = msg.text;
      state.step = 'awaiting_id';
      bot.sendMessage(chatId, 'Por favor ingresa tu número de cédula:');
      return;
    }
    if (state.step === 'awaiting_id') {
      state.idNumber = msg.text;
      state.step = 'awaiting_phone';
      bot.sendMessage(chatId, 'Por favor ingresa tu número de teléfono:');
      return;
    }
    if (state.step === 'awaiting_phone') {
      state.phone = msg.text;
      state.step = 'awaiting_description';
      bot.sendMessage(chatId, 'Describe el incidente con detalle (puedes enviar fotos/videos):');
      return;
    }
    if (state.step === 'awaiting_description') {
      state.description = msg.text;
      return saveTicketFromState(bot, chatId, userId);
    }

    // default: show menu only when user explicitly asks
    if (msg.text && (msg.text.toLowerCase() === '/menu' || msg.text.toLowerCase() === 'menu')) {
      bot.sendMessage(chatId, 'Selecciona el tipo de incidente:', mainMenu);
    }
  });

  // Callback handler
  bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (!userStates[userId]) userStates[userId] = { pendingEvidences: [] };
    const state = userStates[userId];

    const mainOptions = Object.keys(submenus);
    if (mainOptions.includes(data)) {
      state.service = data;
      bot.sendMessage(chatId, 'Selecciona un subtipo:', submenus[data]);
      bot.answerCallbackQuery(query.id);
      return;
    }

    // subtypes prefixes
    const prefixes = ['cam_','acc_','evid_','stor_','anal_','mant_','vand_','other_','svc_'];
    if (prefixes.some(p => data.startsWith(p))) {
      state.subType = data;
      state.step = 'awaiting_name';
      bot.sendMessage(chatId, 'Perfecto. Para crear el ticket, por favor ingresa tu nombre completo:');
      bot.answerCallbackQuery(query.id);
      return;
    }

    bot.answerCallbackQuery(query.id);
  });

  // Command: /estado <id>
  bot.onText(/\/estado\s+(\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const id = parseInt(match[1], 10);
    db.query('SELECT * FROM tickets WHERE id = ?', [id], (err, results) => {
      if (err) return bot.sendMessage(chatId, 'Error consultando ticket.');
      if (!results.length) return bot.sendMessage(chatId, `No existe ticket con ID ${id}.`);
      const t = results[0];

      // map labels
      const svc = serviceLabel(t.incident_type);
      const sub = subtypeLabel(t.sub_type);

      // main text
      let resp = `📄 <b>Ticket ${t.id}</b>\nEstado: ${t.status}\nServicio: ${svc}\nSubtipo: ${sub}\nPrioridad: ${t.priority}\nDescripción: ${t.description || '—'}\nCreado: ${t.created_at}\nSLA: ${t.sla_target || '—'}`;
      bot.sendMessage(chatId, resp, { parse_mode: 'HTML' });

      // send evidences if any
      db.query('SELECT * FROM evidences WHERE ticket_id = ?', [id], (eerr, evids) => {
        if (eerr) return;
        if (!evids || evids.length === 0) return;
        // send each evidence according to type
        evids.forEach(ev => {
          if (ev.file_type === 'photo') {
            bot.sendPhoto(chatId, ev.file_id, { caption: 'Evidencia (foto)' }).catch(console.error);
          } else if (ev.file_type === 'video') {
            bot.sendVideo(chatId, ev.file_id, { caption: 'Evidencia (video)' }).catch(console.error);
          } else {
            // document or audio
            bot.sendDocument(chatId, ev.file_id, { caption: `Evidencia (${ev.file_type})` }).catch(console.error);
          }
        });
      });
    });
  });

  // Command: /historial
  bot.onText(/\/historial/, (msg) => {
    const chatId = msg.chat.id;
    const tgId = msg.from.id;
    db.query('SELECT id, incident_type, sub_type, status, created_at FROM tickets WHERE reporter_telegram_id = ? ORDER BY created_at DESC LIMIT 20', [tgId], (err, results) => {
      if (err) return bot.sendMessage(chatId, 'Error consultando historial.');
      if (!results.length) return bot.sendMessage(chatId, 'No tienes tickets registrados.');
      // format nicely
      let text = '📚 <b>Tus últimos tickets</b>:\n\n';
      results.forEach(r => {
        const svc = serviceLabel(r.incident_type);
        const sub = subtypeLabel(r.sub_type);
        text += `<b>#${r.id}</b> — ${svc}\n   ${sub}\n   Estado: ${r.status} — Creado: ${r.created_at}\n\n`;
      });
      bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
    });
  });

  // Command: /cerrar <id>
  bot.onText(/\/cerrar\s+(\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const ticketId = parseInt(match[1], 10);
    db.query('UPDATE tickets SET status = ?, closed_at = ? WHERE id = ?', ['closed', new Date(), ticketId], (err, res) => {
      if (err) return bot.sendMessage(chatId, 'Error cerrando ticket.');
      if (res.affectedRows === 0) return bot.sendMessage(chatId, 'No se encontró el ticket.');
      bot.sendMessage(chatId, `✔ Ticket ${ticketId} cerrado correctamente.`);
    });
  });

  // Command to get chat id (useful to capture group ID)
  bot.onText(/\/getchatid/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `chat_id: ${chatId}`);
  });

  // expose helper to create tickets programmatically
  attachHandlers.saveTicketFromState = saveTicketFromState;
}

// helper: save ticket from state (unchanged but uses labels)
function saveTicketFromState(bot, chatId, userId) {
  const state = userStates[userId];
  if (!state) return bot.sendMessage(chatId, 'Estado inválido.');

  const impact = getImpact(state.service, state.subType);
  const ticket = {
    full_name: state.name || 'Sin nombre',
    user_id: state.idNumber || 'Sin cédula',
    phone: state.phone || 'Sin teléfono',
    incident_type: state.service || 'no definido',
    sub_type: state.subType || 'no definido',
    description: state.description || '',
    category: impact.category,
    priority: impact.priority,
    resolution_hours: impact.resolution_hours || 120,
    resolution_time: impact.resolution_time || '',
    sla_target: impact.sla_target || '',
    status: 'open',
    created_at: new Date(),
    reporter_telegram_id: userId
  };

  db.query('INSERT INTO tickets SET ?', ticket, (err, result) => {
    if (err) {
      console.error('Error insert ticket', err);
      return bot.sendMessage(chatId, '❌ Error al guardar el ticket. Intenta de nuevo.');
    }
    const ticketId = result.insertId;

    // save evidences if any
    const evids = state.pendingEvidences || [];
    if (evids.length) {
      const values = evids.map(e => [ticketId, e.file_id, e.file_type, new Date()]);
      db.query('INSERT INTO evidences (ticket_id, file_id, file_type, created_at) VALUES ?', [values], (eerr) => {
        if (eerr) console.error('Error guardando evidencias', eerr);
      });
    }

    // notify user (formatted simple)
    const userMsg = `ID del Ticket: ${ticketId}\nNombre: ${ticket.full_name}\nCédula: ${ticket.user_id}\nTeléfono: ${ticket.phone}\nTipo de incidente: ${serviceLabel(ticket.incident_type)}\nSubtipo: ${subtypeLabel(ticket.sub_type)}\nDescripción: ${ticket.description}`;
    bot.sendMessage(chatId, userMsg);

    // notify NOC (using notifications module)
    notifyNOC({
      id: ticketId,
      incident_type: ticket.incident_type,
      sub_type: ticket.sub_type,
      priority: ticket.priority,
      full_name: ticket.full_name,
      user_id: ticket.user_id,
      description: ticket.description,
      sla_target: ticket.sla_target
    });

    // clear state
    delete userStates[userId];
  });
}

module.exports = { attachHandlers };
