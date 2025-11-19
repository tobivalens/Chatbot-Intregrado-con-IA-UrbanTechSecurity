// bot/itopClient.js
require('dotenv').config();
const axios = require('axios');

const {
  ITOP_URL,
  ITOP_USER,
  ITOP_PWD,
  ITOP_CLASS,
  ITOP_ORG_NAME
} = process.env;

/**
 * Crea un incidente en iTOP usando la API REST.
 * Recibe un objeto ticket con los mismos campos que guardas en MySQL.
 */
async function createItopIncident(ticket) {
  if (!ITOP_URL || !ITOP_USER || !ITOP_PWD) {
    console.warn('iTOP no está configurado (.env sin ITOP_URL/USER/PWD)');
    return null;
  }

  // ---------------------------
  // Mapear categoría / prioridad (adaptado a iTOP: impact 1..3)
  // ---------------------------
  const impactMap = {
    'Crítica': '3', // máximo permitido (toda la organización)
    'Alta': '3',
    'Media': '2',
    'Baja': '1'
  };

  const urgencyMap = {
    'Crítica': '3',
    'Alta': '2',
    'Media': '2',
    'Baja': '1'
  };

  const priorityMap = {
    1: '1',
    2: '2',
    3: '3'
  };

  const category = ticket.category || 'Media';
  const impact = impactMap[category] || '2';
  const urgency = urgencyMap[category] || '2';
  const priority = priorityMap[ticket.priority] || '2';

  // ---------------------------
  // Calcular "reportado por"
  // ---------------------------
  const fullName = (ticket.full_name && ticket.full_name.trim()) || 'Usuario Telegram';
  const parts = fullName.split(' ');
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ') || parts[0];

  const orgName = ITOP_ORG_NAME || 'Urban Tech Security';

  // ---------------------------
  // Construir payload de iTOP
  // ---------------------------
  const payload = {
    // versión requerida por iTOP
    version: '1.0',
    operation: 'core/create',
    class: ITOP_CLASS || 'Incident',
    comment: 'Incidente creado automáticamente desde el chatbot Claudia',
    output_fields: 'ref, title, status',
    fields: {
      // Asunto
      title: `[Claudia] ${ticket.incident_type} - ${ticket.sub_type}`,
      // Descripción
      description: ticket.description || 'Sin descripción',
      // Organización (por nombre, usando OQL)
      org_id: `SELECT Organization WHERE name = "${orgName}"`,
      // Reportado por (caller)
      caller_id: {
        name: lastName,
        first_name: firstName
      },
      // Origen: usar código interno típico "portal" en minúscula
      origin: 'portal',
      // Clasificación (usar valores válidos 1..3)
      impact,
      urgency,
      priority
    }
  };

  // iTOP espera: auth_user, auth_pwd, version y json_data como parámetros
  const body = new URLSearchParams({
    auth_user: ITOP_USER,
    auth_pwd: ITOP_PWD,
    version: '1.0',
    json_data: JSON.stringify(payload)
  });

  const res = await axios.post(
    ITOP_URL,
    body.toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }
  );

  return res.data;
}

module.exports = { createItopIncident };