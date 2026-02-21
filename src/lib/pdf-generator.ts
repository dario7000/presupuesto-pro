import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatMoney } from './currencies'
import { getTranslations, type Lang } from './i18n'

interface PDFQuoteData {
  quoteNumber: number
  title: string
  vehicleInfo?: string
  clientName: string
  clientPhone?: string
  items: Array<{
    name: string
    category: string
    quantity: number
    unit: string
    unit_price: number
  }>
  subtotal: number
  discountPercent: number
  discountAmount: number
  ivaPercent: number
  ivaAmount: number
  total: number
  notes: string
  createdAt: string
  validUntil?: string
}

interface PDFBusinessInfo {
  businessName: string
  ownerName: string
  phone: string
  address: string
  city: string
  trade: string
  logoUrl?: string | null
}

export function generateInitialsLogo(name: string, size = 200): string {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, '#f59e0b')
  gradient.addColorStop(1, '#d97706')

  const radius = size * 0.18
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(size - radius, 0)
  ctx.quadraticCurveTo(size, 0, size, radius)
  ctx.lineTo(size, size - radius)
  ctx.quadraticCurveTo(size, size, size - radius, size)
  ctx.lineTo(radius, size)
  ctx.quadraticCurveTo(0, size, 0, size - radius)
  ctx.lineTo(0, radius)
  ctx.quadraticCurveTo(0, 0, radius, 0)
  ctx.closePath()
  ctx.fillStyle = gradient
  ctx.fill()

  ctx.fillStyle = 'rgba(0,0,0,0.1)'
  ctx.beginPath()
  ctx.moveTo(radius, size * 0.5)
  ctx.lineTo(size - radius, size * 0.5)
  ctx.quadraticCurveTo(size, size * 0.5, size, size * 0.5 + radius)
  ctx.lineTo(size, size - radius)
  ctx.quadraticCurveTo(size, size, size - radius, size)
  ctx.lineTo(radius, size)
  ctx.quadraticCurveTo(0, size, 0, size - radius)
  ctx.lineTo(0, size * 0.5 + radius)
  ctx.quadraticCurveTo(0, size * 0.5, radius, size * 0.5)
  ctx.closePath()
  ctx.fill()

  const words = name.trim().split(/\s+/)
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase()

  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${size * 0.4}px "Plus Jakarta Sans", system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initials, size / 2, size / 2)

  return canvas.toDataURL('image/png')
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

export async function generateQuotePDF(
  quote: PDFQuoteData,
  business: PDFBusinessInfo,
  options: { watermark?: boolean; currency?: string; lang?: Lang } = {}
): Promise<jsPDF> {
  const fmt = (n: number) => formatMoney(n, options.currency || 'ARS')
  const t = getTranslations(options.lang || 'es')
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const amber = [245, 158, 11] as [number, number, number]
  const dark = [15, 23, 42] as [number, number, number]
  const gray = [100, 116, 139] as [number, number, number]
  const lightGray = [241, 245, 249] as [number, number, number]

  // === HEADER BAR ===
  doc.setFillColor(...dark)
  doc.rect(0, 0, pageWidth, 38, 'F')

  let logoImg: string | null = null
  if (business.logoUrl) logoImg = await loadImageAsBase64(business.logoUrl)
  if (!logoImg) logoImg = generateInitialsLogo(business.businessName || business.ownerName)
  if (logoImg) { try { doc.addImage(logoImg, 'PNG', margin, 6, 26, 26) } catch {} }

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(business.businessName || 'Mi Negocio', margin + 32, 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text([business.trade, business.phone, business.city].filter(Boolean).join('  •  '), margin + 32, 23)
  if (business.address) doc.text(business.address, margin + 32, 29)

  y = 48

  // === QUOTE INFO BAR ===
  doc.setFillColor(...lightGray)
  doc.roundedRect(margin, y, contentWidth, 22, 3, 3, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...dark)
  doc.text(`PRESUPUESTO #${quote.quoteNumber}`, margin + 6, y + 9)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...gray)
  const dateStr = new Date(quote.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.text(`${t.pdf_date}: ${dateStr}`, margin + 6, y + 16)

  if (quote.validUntil) {
    doc.text(`Válido hasta: ${new Date(quote.validUntil).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - margin - 6, y + 16, { align: 'right' })
  }

  y += 30

  // === CLIENT INFO ===
  const clientBoxH = quote.vehicleInfo ? 28 : 20
  doc.setFillColor(255, 251, 235)
  doc.roundedRect(margin, y, contentWidth, clientBoxH, 3, 3, 'F')
  doc.setFillColor(...amber)
  doc.rect(margin, y, 3, clientBoxH, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...amber)
  doc.text('CLIENTE', margin + 8, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...dark)
  doc.text(quote.clientName, margin + 8, y + 13)

  if (quote.clientPhone) {
    doc.setFontSize(8); doc.setTextColor(...gray)
    doc.text(quote.clientPhone, margin + 8, y + 19)
  }
  if (quote.title) {
    doc.setFontSize(9); doc.setTextColor(...dark)
    doc.text(`Trabajo: ${quote.title}`, pageWidth - margin - 6, y + 13, { align: 'right' })
  }
  if (quote.vehicleInfo) {
    doc.setFontSize(8); doc.setTextColor(...gray)
    doc.text(`${t.pdf_vehicle}: ${quote.vehicleInfo}`, pageWidth - margin - 6, y + 20, { align: 'right' })
  }

  y += clientBoxH + 7

  // === ITEMS TABLE ===
  const materials = quote.items.filter(i => i.category === 'material')
  const labor = quote.items.filter(i => i.category === 'mano_de_obra')

  const buildTableRows = (items: typeof quote.items) =>
    items.map(it => [it.name, `${it.quantity} ${it.unit}`, fmt(it.unit_price), fmt(it.quantity * it.unit_price)])

  const tableStyles = {
    headStyles: { fillColor: dark as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontSize: 8, fontStyle: 'bold' as const, cellPadding: 4 },
    bodyStyles: { fontSize: 9, cellPadding: 3.5, textColor: dark as [number, number, number] },
    alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
    columnStyles: { 0: { cellWidth: 'auto' as const }, 1: { cellWidth: 28, halign: 'center' as const }, 2: { cellWidth: 30, halign: 'right' as const }, 3: { cellWidth: 32, halign: 'right' as const, fontStyle: 'bold' as const } },
    margin: { left: margin, right: margin },
  }

  if (materials.length > 0) {
    doc.setFillColor(220, 252, 231)
    doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(22, 101, 52)
    doc.text('MATERIALES', margin + 4, y + 5)
    y += 9
    autoTable(doc, { startY: y, head: [[t.pdf_item, t.pdf_qty, t.pdf_unit_price, t.pdf_subtotal]], body: buildTableRows(materials), ...tableStyles })
    y = (doc as any).lastAutoTable.finalY + 4
  }

  if (labor.length > 0) {
    doc.setFillColor(219, 234, 254)
    doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(29, 78, 216)
    doc.text('MANO DE OBRA', margin + 4, y + 5)
    y += 9
    autoTable(doc, { startY: y, head: [[t.pdf_item, t.pdf_qty, t.pdf_unit_price, t.pdf_subtotal]], body: buildTableRows(labor), ...tableStyles })
    y = (doc as any).lastAutoTable.finalY + 4
  }

  const others = quote.items.filter(i => i.category !== 'material' && i.category !== 'mano_de_obra')
  if (others.length > 0) {
    autoTable(doc, { startY: y, head: [[t.pdf_item, t.pdf_qty, t.pdf_unit_price, t.pdf_subtotal]], body: buildTableRows(others), ...tableStyles })
    y = (doc as any).lastAutoTable.finalY + 4
  }

  y += 4

  // === TOTALS BOX (with IVA support) ===
  const hasDiscount = quote.discountPercent > 0
  const hasIva = quote.ivaPercent > 0
  const totalsHeight = 12 + (hasDiscount ? 10 : 0) + (hasIva ? 10 : 0)
  doc.setFillColor(...dark)
  doc.roundedRect(pageWidth - margin - 85, y, 85, totalsHeight + 10, 3, 3, 'F')

  let ty = y + 8
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8)

  if (hasDiscount || hasIva) {
    doc.setTextColor(148, 163, 184)
    doc.text(t.pdf_subtotal + ':', pageWidth - margin - 79, ty)
    doc.text(fmt(quote.subtotal), pageWidth - margin - 6, ty, { align: 'right' })
    ty += 6
  }

  if (hasDiscount) {
    doc.setTextColor(239, 68, 68)
    doc.text(`${t.pdf_discount} (${quote.discountPercent}%):`, pageWidth - margin - 79, ty)
    doc.text(`-${fmt(quote.discountAmount)}`, pageWidth - margin - 6, ty, { align: 'right' })
    ty += 6
  }

  if (hasIva) {
    doc.setTextColor(34, 197, 94)
    doc.text(`IVA (${quote.ivaPercent}%):`, pageWidth - margin - 79, ty)
    doc.text(`+${fmt(quote.ivaAmount)}`, pageWidth - margin - 6, ty, { align: 'right' })
    ty += 6
  }

  ty += 2
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...amber)
  doc.text(t.pdf_grand_total + ':', pageWidth - margin - 79, ty)
  doc.text(fmt(quote.total), pageWidth - margin - 6, ty, { align: 'right' })

  y += totalsHeight + 20

  // === NOTES ===
  if (quote.notes) {
    doc.setFillColor(248, 250, 252)
    const notesLines = doc.splitTextToSize(quote.notes, contentWidth - 12)
    const notesH = Math.max(notesLines.length * 4.5 + 12, 18)
    doc.roundedRect(margin, y, contentWidth, notesH, 2, 2, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...gray)
    doc.text('NOTAS Y CONDICIONES', margin + 6, y + 6)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...dark)
    doc.text(notesLines, margin + 6, y + 12)
    y += notesH + 6
  }

  // === WATERMARK (free plan) ===
  if (options.watermark) {
    doc.setTextColor(200, 200, 200)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(40)
    doc.saveGraphicsState()
    doc.text('MUESTRA', pageWidth / 2, 150, { align: 'center', angle: 45 })
    doc.restoreGraphicsState()
  }

  // === FOOTER (✨ FIXED: dynamic page count) ===
  const totalPages = (doc.internal as any).getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.setDrawColor(226, 232, 240)
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(148, 163, 184)
    doc.text(t.pdf_watermark + ' — presupuestopro.vercel.app', margin, pageHeight - 10)
    doc.text(`${t.pdf_page} ${i} ${t.pdf_of} ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' })
  }

  return doc
}
