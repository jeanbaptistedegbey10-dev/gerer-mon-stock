/**
 * Envoie un message WhatsApp via CallMeBot
 * Le livreur doit avoir activé CallMeBot au préalable
 */
export async function sendWhatsApp({ phone, apiKey, message }) {
  if (!phone || !apiKey) {
    console.warn('WhatsApp: phone ou apiKey manquant')
    return false
  }

  // Nettoyer le numéro — enlever espaces, tirets, garder le +
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')

  // Encoder le message
  const encodedMsg = encodeURIComponent(message)

  const url = `https://api.callmebot.com/whatsapp.php` +
    `?phone=${cleanPhone}&text=${encodedMsg}&apikey=${apiKey}`

  try {
    const response = await fetch(url)
    const text     = await response.text()
    console.log('WhatsApp response:', text)
    return response.ok
  } catch (err) {
    console.error('WhatsApp error:', err)
    return false
  }
}

/**
 * Compose le message de notification de livraison
 */
export function composeDeliveryMessage({
  driverName,
  clientName,
  clientPhone,
  clientAddress,
  deliveryFee,
  notes,
  appUrl,
  deliveryId,
}) {
  const lines = [
    `🚚 *Nouvelle livraison assignée !*`,
    ``,
    `Bonjour ${driverName} !`,
    `Une livraison vous a été assignée.`,
    ``,
    `📦 *Détails :*`,
    `👤 Client : ${clientName || 'Non renseigné'}`,
    `📞 Téléphone : ${clientPhone}`,
    `📍 Adresse : ${clientAddress}`,
    deliveryFee > 0
      ? `💰 Frais de livraison : ${Number(deliveryFee).toLocaleString('fr-FR')} FCFA`
      : null,
    notes ? `📝 Notes : ${notes}` : null,
    ``,
    `🔗 Accéder à votre tableau de bord :`,
    `${appUrl}/deliveries`,
    ``,
    `✅ Confirmez la livraison depuis votre espace livreur.`,
    ``,
    `— Gérer mon stock`,
  ]

  return lines.filter(l => l !== null).join('\n')
}