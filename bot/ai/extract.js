// bot/ai/extract.js
module.exports = {
  extractUserInfo(text) {
    const info = { name: '', id: '', phone: '' };

    // Teléfono
    const phoneRegex = /3\d{9}|\+57\s?3\d{9}/;
    const phone = text.match(phoneRegex);
    if (phone) info.phone = phone[0];

    // Cédula
    const idRegex = /\b\d{6,10}\b/;
    const idMatch = text.match(idRegex);
    if (idMatch) info.id = idMatch[0];

    // Nombre 
    const nameRegex = /(me llamo|soy|mi nombre es)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ ]+)/i;
    const nameMatch = text.match(nameRegex);
    if (nameMatch) info.name = nameMatch[2].trim();

    return info;
  }
};
