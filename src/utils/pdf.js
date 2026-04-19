import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'  // ← import nommé, pas side-effect

export function generateReceipt(sale, items, shopName = 'Gérer mon stock') {
  const doc  = new jsPDF({ unit: 'mm', format: 'a5' })
  const W    = doc.internal.pageSize.getWidth()
  const date = new Date(sale.created_at || Date.now())
    .toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

  // ── En-tête ──────────────────────────────────────────────────────────────
  doc.setFillColor(30, 58, 138)
  doc.rect(0, 0, W, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(shopName, W / 2, 12, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('REÇU DE VENTE', W / 2, 20, { align: 'center' })

  // ── Infos vente ───────────────────────────────────────────────────────────
  doc.setTextColor(50, 50, 50)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`Réf : ${sale.ref || sale.id?.slice(0, 8).toUpperCase() || 'N/A'}`, 14, 36)

  doc.setFont('helvetica', 'normal')
  doc.text(`Date : ${date}`, 14, 42)

  if (sale.client_name) {
    doc.text(`Client : ${sale.client_name}`, 14, 48)
  }

  // ── Tableau produits — appel direct sur autoTable ─────────────────────────
  autoTable(doc, {                        // ← clé du fix : autoTable(doc, options)
    startY: sale.client_name ? 54 : 50,
    head: [['Produit', 'Qté', 'Prix unit.', 'Total']],
    body: items.map(i => [
      i.product_name,
      i.quantity,
      `${(i.unit_price || 0).toLocaleString('fr-FR')} FCFA`,
      `${(i.total || i.unit_price * i.quantity || 0).toLocaleString('fr-FR')} FCFA`,
    ]),
    headStyles: {
      fillColor:  [30, 58, 138],
      textColor:  255,
      fontStyle:  'bold',
      fontSize:   9,
    },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    margin: { left: 14, right: 14 },
  })

  // ── Total ─────────────────────────────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY + 6

  doc.setDrawColor(200, 200, 200)
  doc.line(14, finalY, W - 14, finalY)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(30, 58, 138)
  doc.text('TOTAL', 14, finalY + 8)
  doc.text(
    `${(sale.total || 0).toLocaleString('fr-FR')} FCFA`,
    W - 14, finalY + 8,
    { align: 'right' }
  )

  // ── Statut ────────────────────────────────────────────────────────────────
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(
    sale.status === 'payé' ? 22  : 180,
    sale.status === 'payé' ? 163 : 100,
    sale.status === 'payé' ? 74  : 0
  )
  doc.text(
    `Paiement : ${(sale.status || 'payé').toUpperCase()}`,
    W / 2, finalY + 16,
    { align: 'center' }
  )

  // ── Pied de page ──────────────────────────────────────────────────────────
  doc.setTextColor(150, 150, 150)
  doc.setFontSize(8)
  doc.text('Merci pour votre achat !', W / 2, finalY + 26, { align: 'center' })
  doc.text(
    `Document généré le ${new Date().toLocaleDateString('fr-FR')}`,
    W / 2, finalY + 31,
    { align: 'center' }
  )

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  const filename = `recu-${(sale.id?.slice(0, 8) || 'vente').toLowerCase()}.pdf`
  doc.save(filename)
}