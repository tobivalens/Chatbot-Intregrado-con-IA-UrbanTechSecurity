// bot/evidence.js
// Manejo simple de evidencias: guardamos file_id y tipo en tabla evidences
const db = require('./db');

function saveEvidences(ticketId, evidences = []) {
  if (!evidences || !evidences.length) return;
  const values = evidences.map(e => [ticketId, e.file_id, e.file_type, new Date()]);
  const sql = 'INSERT INTO evidences (ticket_id, file_id, file_type, created_at) VALUES ?';
  db.query(sql, [values], (err) => {
    if (err) console.error('Error guardando evidencias:', err);
  });
}

module.exports = { saveEvidences };
