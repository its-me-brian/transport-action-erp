// ============================================================================
// SECRETS.GS — Gestión segura de secretos en Google Apps Script
// ============================================================================
//
// Resolución de brecha: Secretos hardcodeados en el código fuente
// GAS no tiene .env ni vaults. PropertiesService.getScriptProperties()
// es el almacenamiento seguro equivalente: encriptado en reposo,
// accesible solo desde el script vinculado, no expuesto en el código.
//
// REGLAS:
// 1. NUNCA hardcodear API keys, tokens, o passwords en .gs
// 2. SIEMPRE usar getProperty() con fallback que lance error
// 3. Los valores se configuran UNA vez via setProperty() o la UI de GAS
// ============================================================================

/**
 * Lee un secreto de ScriptProperties. Lanza error si no está configurado.
 *
 * @param {string} key          - Nombre de la propiedad (ej. 'WHATSAPP_API_KEY')
 * @param {string} [fallback]   - Valor por defecto SOLO para desarrollo (opcional)
 * @returns {string}            - El valor del secreto
 * @throws {Error}              - Si el secreto no está configurado
 *
 * @example
 *   const apiKey = getSecret('WHATSAPP_API_KEY');
 *   const apiSecret = getSecret('WHATSAPP_API_SECRET', 'dev-only-value');
 */
function getSecret(key, fallback) {
  const value = PropertiesService.getScriptProperties().getProperty(key);

  if (value !== null && value !== undefined && value !== '') {
    return value;
  }

  if (fallback !== undefined) {
    Logger.log('[SECRETS] WARNING: "' + key + '" no está configurado. Usando fallback.');
    return fallback;
  }

  throw new Error(
    'SECRETS_ERROR: La propiedad "' + key + '" no está configurada. ' +
    'Andá a https://script.google.com → tu script → Configuración del proyecto → Propiedades ' +
    'y agregala. Nunca hardcodees secretos en el código.'
  );
}

/**
 * Lee un secreto opcional (no lanza error si no existe).
 *
 * @param {string} key          - Nombre de la propiedad
 * @returns {string|null}       - El valor o null si no existe
 *
 * @example
 *   const optionalKey = getSecretOptional('SENDGRID_API_KEY');
 *   if (optionalKey) {
 *     // usar SendGrid
 *   }
 */
function getSecretOptional(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

/**
 * Lista todas las keys configuradas (sin valores) — para debugging.
 * SOLO llamar desde consola de GAS, nunca exponer en endpoints web.
 *
 * @returns {string[]} - Array de nombres de propiedades configuradas
 */
function listSecretKeys() {
  const props = PropertiesService.getScriptProperties().getKeys();
  return props;
}


// ============================================================================
// INICIALIZACIÓN — Script de setup (correr UNA vez)
// ============================================================================
//
// Para configurar los secretos, crear un script temporal o usar la UI:
//
// OPCIÓN A: Script de inicialización (correr una vez desde el editor)
//
//   function setupSecrets() {
//     const secrets = {
//       'WHATSAPP_API_KEY': 'tu-api-key-aqui',
//       'WHATSAPP_API_SECRET': 'tu-api-secret-aqui',
//       'SENDGRID_API_KEY': 'tu-sendgrid-key-aqui',
//       // agregar más secretos aquí
//     };
//
//     const props = PropertiesService.getScriptProperties();
//     props.setProperties(secrets);
//     Logger.log('Secretos configurados: ' + Object.keys(secrets).join(', '));
//   }
//
// OPCIÓN B: UI de GAS (sin código)
//   1. Ir a https://script.google.com
//   2. Abrir tu proyecto
//   3. Click en ⚙ Configuración del proyecto (gear icon)
//   4. Scroll a "Propiedades del script"
//   5. Agregar cada secreto como key-value pair
//
//
// EJEMPLO DE USO EN DOMINIO:
//
//   function sendWhatsAppMessage(phone, message) {
//     const apiKey = getSecret('WHATSAPP_API_KEY');
//     const apiSecret = getSecret('WHATSAPP_API_SECRET');
//
//     const response = UrlFetchApp.fetch('https://api.whatsapp.com/v1/messages', {
//       method: 'post',
//       headers: {
//         'Authorization': 'Bearer ' + apiKey,
//         'X-API-Secret': apiSecret
//       },
//       contentType: 'application/json',
//       payload: JSON.stringify({ to: phone, message })
//     });
//
//     return JSON.parse(response.getContentText());
//   }
