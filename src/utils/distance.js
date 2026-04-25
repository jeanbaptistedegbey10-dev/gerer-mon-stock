// ── Geocode une adresse → { lat, lon } via Nominatim (OpenStreetMap) ─────────
export async function geocodeAddress(address) {
  const query    = encodeURIComponent(address)
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
    { headers: { 'Accept-Language': 'fr' } }
  )
  const data = await response.json()
  if (!data || data.length === 0) throw new Error(`Adresse introuvable : "${address}"`)
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
}

// ── Calcule la distance en km via OSRM (routing réel, pas vol d'oiseau) ──────
export async function getDistanceKm(originAddress, destAddress) {
  const [origin, dest] = await Promise.all([
    geocodeAddress(originAddress),
    geocodeAddress(destAddress),
  ])

  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/` +
    `${origin.lon},${origin.lat};${dest.lon},${dest.lat}` +
    `?overview=false`
  )
  const data = await response.json()

  if (data.code !== 'Ok' || !data.routes?.[0]) {
    throw new Error('Impossible de calculer la distance.')
  }

  // OSRM retourne la distance en mètres → convertir en km
  const meters = data.routes[0].distance
  return Math.round((meters / 1000) * 10) / 10   // arrondi à 0.1 km
}