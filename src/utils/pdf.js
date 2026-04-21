import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Formateur nombres sans espaces insécables ─────────────────────────────
const fmt = (n) =>
  Number(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

export function generateReceipt(sale, items, discountAmount = 0, shopName = 'Gérer mon stock') {
  const doc  = new jsPDF({ unit: 'mm', format: 'a5' })
  const W    = doc.internal.pageSize.getWidth()
  const date = new Date(sale.created_at || Date.now())
    .toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

  // ── En-tête ───────────────────────────────────────────────────────────────
  doc.setFillColor(30, 58, 138)
  doc.rect(0, 0, W, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(shopName, W / 2, 12, { align: 'center' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('RECU DE VENTE', W / 2, 20, { align: 'center' })

  // ── Infos vente ───────────────────────────────────────────────────────────
  doc.setTextColor(50, 50, 50)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`Ref : ${sale.ref || sale.id?.slice(0, 8).toUpperCase() || 'N/A'}`, 14, 36)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date : ${date}`, 14, 42)

  let startY = 48
  if (sale.client_name) {
    doc.text(`Client : ${sale.client_name}`, 14, startY)
    startY += 6
  }
  if (sale.client_phone) {
    doc.text(`Tel : ${sale.client_phone}`, 14, startY)
    startY += 6
  }

  // ── Tableau produits ──────────────────────────────────────────────────────
  autoTable(doc, {
    startY: startY + 2,
    head: [['Produit', 'Qte', 'Prix unit.', 'Total']],
    body: items.map(i => [
      String(i.product_name),
      String(i.quantity),
      `${fmt(i.unit_price)} FCFA`,
      `${fmt(i.unit_price * i.quantity)} FCFA`,
    ]),
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: 'bold',
      fontSize:  9,
    },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 32, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    margin: { left: 14, right: 14 },
  })

  const finalY = doc.lastAutoTable.finalY + 6

  doc.setDrawColor(200, 200, 200)
  doc.line(14, finalY, W - 14, finalY)

  let yPos = finalY + 7

  // ── Sous-total ────────────────────────────────────────────────────────────
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('Sous-total', 14, yPos)
  doc.text(`${fmt(subtotal)} FCFA`, W - 14, yPos, { align: 'right' })
  yPos += 6

  // ── Reduction ─────────────────────────────────────────────────────────────
  if (Number(discountAmount) > 0) {
    doc.setTextColor(22, 163, 74)
    doc.text('Reduction', 14, yPos)
    doc.text(`- ${fmt(discountAmount)} FCFA`, W - 14, yPos, { align: 'right' })
    yPos += 6
    doc.setDrawColor(220, 220, 220)
    doc.line(14, yPos, W - 14, yPos)
    yPos += 4
  }

  // ── Total ─────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(30, 58, 138)
  doc.text('TOTAL', 14, yPos)
  doc.text(`${fmt(sale.total)} FCFA`, W - 14, yPos, { align: 'right' })
  yPos += 8

  // ── Statut ────────────────────────────────────────────────────────────────
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(
    sale.status === 'paye' ? 22  : 180,
    sale.status === 'paye' ? 163 : 100,
    sale.status === 'paye' ? 74  : 0
  )
  doc.text(
    `Paiement : ${String(sale.status || 'paye').toUpperCase()}`,
    W / 2, yPos, { align: 'center' }
  )
  yPos += 10

  // ── Pied de page ──────────────────────────────────────────────────────────
  doc.setTextColor(150, 150, 150)
  doc.setFontSize(8)
  doc.text('Merci pour votre achat !', W / 2, yPos, { align: 'center' })
  doc.text(
    `Document genere le ${new Date().toLocaleDateString('fr-FR')}`,
    W / 2, yPos + 5, { align: 'center' }
  )

  doc.save(`recu-${String(sale.id?.slice(0, 8) || 'vente').toLowerCase()}.pdf`)
}