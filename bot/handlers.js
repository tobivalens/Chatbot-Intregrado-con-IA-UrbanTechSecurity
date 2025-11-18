// bot/handlers.js
const { mainMenu, submenus } = require('./menu');
const { getImpact } = require('./slas');
const db = require('./db');
const { notifyNOC } = require('./notifications');
const { saveEvidences } = require('./evidence');
const { serviceLabel, subtypeLabel } = require('./labels');

// in-memory user states
const userStates = {};

function attachHandlers(bot) {
  attachHandlers.userStates = userStates;

  // ======================================================
  // 📨 MESSAGE HANDLER
  // ======================================================
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // If no state yet
    if (!userStates[userId]) {
      if (msg.text && msg.text.startsWith('/')) {
        userStates[userId] = { pendingEvidences: [] };
        return;
      }
      userStates[userId] = { step: 'start', pendingEvidences: [] };
      bot.sendMessage(chatId, '¡Hola! Soy Atlas. Selecciona el tipo de incidente:', mainMenu);
      return;
    }

    const state = userStates[userId];

    // Capture media as evidence
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

    // FORM STEPS
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

    // ============================================
    // 📌 LECTURA DE TICKET ID DESDE "MIS CONSULTAS"
    // ============================================
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
      return bot.answerCallbackQuery(query.id);
    }

    // 🔍 pedir ID
    if (data === 'query_ticket') {
      state.step = 'awaiting_ticket_id';
      bot.sendMessage(chatId, "Ingresa el ID del ticket:");
      return bot.answerCallbackQuery(query.id);
    }

    // 📜 historial
    if (data === 'menu_history') {
      const tgId = userId;
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
      return bot.answerCallbackQuery(query.id);
    }

    // regresar al main menu
    if (data === 'back_main') {
      bot.sendMessage(chatId, 'Selecciona el tipo de incidente:', mainMenu);
      return bot.answerCallbackQuery(query.id);
    }

    // MAIN MENU OPTIONS
    if (mainOptions.includes(data)) {
      state.service = data;
      bot.sendMessage(chatId, "Selecciona un subtipo:", submenus[data]);
      return bot.answerCallbackQuery(query.id);
    }

    // Subtypes
    const prefixes = ['cam_', 'acc_', 'evid_', 'stor_', 'anal_', 'mant_', 'vand_', 'other_', 'svc_'];
    if (prefixes.some(p => data.startsWith(p))) {
      state.subType = data;
      state.step = 'awaiting_name';
      bot.sendMessage(chatId, "Perfecto. Para crear el ticket, por favor ingresa tu nombre completo:");
      return bot.answerCallbackQuery(query.id);
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
function saveTicketFromState(bot, chatId, userId) {
  const state = userStates[userId];

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
    created_at: new Date()
  };

  db.query("INSERT INTO tickets SET ?", ticket, (err, result) => {
    if (err) return bot.sendMessage(chatId, "❌ Error al guardar el ticket.");

    const id = result.insertId;

    // Save evidences
    if (state.pendingEvidences.length > 0) {
      const values = state.pendingEvidences.map(ev => [
        id,
        ev.file_id,
        ev.file_type,
        new Date()
      ]);
      db.query(
        "INSERT INTO evidences (ticket_id, file_id, file_type, created_at) VALUES ?",
        [values]
      );
    }

    bot.sendMessage(
      chatId,
      `ID del Ticket: ${id}\nNombre: ${ticket.full_name}\nCédula: ${ticket.user_id}\nTeléfono: ${ticket.phone}\nTipo de incidente: ${serviceLabel(ticket.incident_type)}\nSubtipo: ${subtypeLabel(ticket.sub_type)}\nDescripción: ${ticket.description}`
    );

    notifyNOC({
      id,
      incident_type: ticket.incident_type,
      sub_type: ticket.sub_type,
      priority: ticket.priority,
      full_name: ticket.full_name,
      user_id: ticket.user_id,
      description: ticket.description,
      sla_target: ticket.sla_target
    });

    delete userStates[userId];
  });
}

module.exports = { attachHandlers };