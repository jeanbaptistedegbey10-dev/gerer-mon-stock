export function exportCSV(data, filename, headers) {
  if (!data || data.length === 0) return

  const csvHeaders = headers.map(h => h.label).join(',')
  const csvRows    = data.map(row =>
    headers.map(h => {
      const val = h.key.split('.').reduce((o, k) => o?.[k], row) ?? ''
      // Échapper les virgules et guillemets
      const str = String(val).replace(/"/g, '""')
      return str.includes(',') || str.includes('\n') ? `"${str}"` : str
    }).join(',')
  )

  const csvContent = [csvHeaders, ...csvRows].join('\n')
  const blob       = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;'
  })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}