// bot/commands.js
const pool = require('./db');

function registerMetricsCommands(bot) {
  bot.onText(/\/metricas/, (msg) => {
    const chatId = msg.chat.id;

    const sqlTotal = "SELECT COUNT(*) AS total FROM tickets";
    const sqlOpen = "SELECT COUNT(*) AS abiertos FROM tickets WHERE status='open'";
    const sqlMostCommon = `
      SELECT incident_type, COUNT(*) AS count
      FROM tickets
      GROUP BY incident_type
      ORDER BY count DESC
      LIMIT 1
    `;

    pool.query(sqlTotal, (err, totalResults) => {
      if (err) {
        console.error(err);
        return bot.sendMessage(chatId, "Error obteniendo métricas.");
      }

      pool.query(sqlOpen, (err2, openResults) => {
        if (err2) {
          console.error(err2);
          return bot.sendMessage(chatId, "Error obteniendo métricas.");
        }

        pool.query(sqlMostCommon, (err3, commonResults) => {
          if (err3) {
            console.error(err3);
            return bot.sendMessage(chatId, "Error obteniendo métricas.");
          }

          const total = totalResults[0].total;
          const abiertos = openResults[0].abiertos;

          let incidenteComun = "N/A";
          let cantidad = 0;

          if (commonResults.length > 0) {
            incidenteComun = commonResults[0].incident_type;
            cantidad = commonResults[0].count;
          }

          const nameMap = {
            svc_outage: "Caída del servicio (NOC)",
            camera_down: "Cámara caída",
            unauthorized_access: "Acceso no autorizado",
            evidence_request: "Solicitud de evidencia",
            storage_issue: "Problema de almacenamiento",
            analytics_issue: "Falla en analítica de video",
            maintenance: "Mantenimiento",
            vandalism: "Vandalismo",
            other_issue: "Otra incidencia"
          };

          const incidenteLegible = nameMap[incidenteComun] || incidenteComun;

          const text = `
📊 *Métricas:*
Tickets totales: *${total}*
Abiertos: *${abiertos}*
Incidente más común: *${incidenteLegible}* (${cantidad} veces)
          `;

          bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
        });
      });
    });
  });
}

module.exports = { registerMetricsCommands };
