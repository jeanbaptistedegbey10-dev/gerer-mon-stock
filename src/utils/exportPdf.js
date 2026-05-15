import jsPDF     from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmt = (n) =>
  Number(n || 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

export function exportReportPDF({
  title, subtitle, tenantName,
  kpis = [], sections = []
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W   = doc.internal.pageSize.getWidth()

  // ── En-tête ───────────────────────────────────────────────────────────────
  doc.setFillColor(30, 58, 138)
  doc.rect(0, 0, W, 36, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(tenantName || 'Gérer mon stock', W / 2, 14, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(title, W / 2, 22, { align: 'center' })

  doc.setFontSize(8)
  doc.setTextColor(200, 210, 255)
  doc.text(
    `Généré le ${new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })}${subtitle ? ' · ' + subtitle : ''}`,
    W / 2, 30, { align: 'center' }
  )

  let yPos = 46

  // ── KPIs ──────────────────────────────────────────────────────────────────
  if (kpis.length > 0) {
    doc.setTextColor(50, 50, 50)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Résumé', 14, yPos)
    yPos += 6

    autoTable(doc, {
      startY:  yPos,
      head:    [['Indicateur', 'Valeur']],
      body:    kpis.map(k => [k.label, k.value]),
      headStyles: {
        fillColor: [30, 58, 138], textColor: 255,
        fontStyle: 'bold', fontSize: 9,
      },
      bodyStyles:   { fontSize: 9 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      margin: { left: 14, right: 14 },
    })
    yPos = doc.lastAutoTable.finalY + 10
  }

  // ── Sections ──────────────────────────────────────────────────────────────
  for (const section of sections) {
    if (yPos > 240) { doc.addPage(); yPos = 20 }

    doc.setTextColor(50, 50, 50)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(section.title, 14, yPos)
    yPos += 5

    autoTable(doc, {
      startY: yPos,
      head:   [section.headers],
      body:   section.rows,
      headStyles: {
        fillColor: [30, 58, 138], textColor: 255,
        fontStyle: 'bold', fontSize: 8,
      },
      bodyStyles:         { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      margin:             { left: 14, right: 14 },
    })
    yPos = doc.lastAutoTable.finalY + 10
  }

  // ── Pied de page ──────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Page ${i} / ${pageCount} · Gérer mon stock`,
      W / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    )
  }

  doc.save(`rapport-${new Date().toISOString().slice(0, 10)}.pdf`)
}