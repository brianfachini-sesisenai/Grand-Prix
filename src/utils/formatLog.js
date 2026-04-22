/**
 * Formata a data atual no padrão brasileiro para logs de auditoria.
 * @returns {string} Ex: "[20/04/2026 23:26:28]"
 */
export const formatLogTime = () => {
   const now = new Date();
   const dd = String(now.getDate()).padStart(2, '0');
   const mm = String(now.getMonth() + 1).padStart(2, '0');
   const yyyy = now.getFullYear();
   const hh = String(now.getHours()).padStart(2, '0');
   const min = String(now.getMinutes()).padStart(2, '0');
   const ss = String(now.getSeconds()).padStart(2, '0');
   return `[${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}]`;
};
