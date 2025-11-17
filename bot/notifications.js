// bot/notifications.js
require('dotenv').config();
const NOC_CHAT_ID = process.env.NOC_CHAT_ID;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

let botInstance = null;
function init(bot) { botInstance = bot; }

function notifyNOC(ticket) {
  if (!botInstance) return;
  const text = `🚨 <b>Nuevo ticket</b>\nID: ${ticket.id}\nServicio: ${ticket.incident_type}\nSubtipo: ${ticket.sub_type}\nPrioridad: ${ticket.priority}\nUsuario: ${ticket.full_name} (Cédula: ${ticket.user_id})\nDescripción: ${ticket.description}\nSLA: ${ticket.sla_target}`;
  botInstance.sendMessage(NOC_CHAT_ID, text, { parse_mode: 'HTML' }).catch(console.error);
}

function sendAdminReport(text) {
  if (!botInstance || !ADMIN_CHAT_ID) return;
  botInstance.sendMessage(ADMIN_CHAT_ID, text, { parse_mode: 'HTML' }).catch(console.error);
}

module.exports = { init, notifyNOC, sendAdminReport };
