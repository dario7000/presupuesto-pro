export interface Profile {
  id: string
  business_name: string
  owner_name: string
  phone: string
  email: string
  address: string
  city: string
  trade: string
  logo_url: string
  plan: 'free' | 'pro'
  quotes_this_month: number
  next_quote_number: number
  quote_number_offset: number
  created_at: string
}

export interface Client {
  id: string
  user_id: string
  name: string
  phone: string
  email: string
  address: string
  notes: string
  created_at: string
}

export interface ClientWithStats extends Client {
  quote_count: number
  total_amount: number
}

export interface SavedItem {
  id: string
  user_id: string
  name: string
  category: 'material' | 'mano_de_obra' | 'otro'
  default_price: number
  unit: string
  created_at: string
}

export interface QuoteItem {
  id: string
  quote_id: string
  name: string
  category: 'material' | 'mano_de_obra' | 'otro'
  quantity: number
  unit: string
  unit_price: number
  total: number
  sort_order: number
}

export interface Quote {
  id: string
  user_id: string
  client_id: string | null
  quote_number: number
  title: string
  status: QuoteStatus
  subtotal: number
  discount_percent: number
  discount_amount: number
  iva_percent: number
  iva_amount: number
  total: number
  notes: string
  valid_until: string | null
  vehicle_info: string
  sent_at: string | null
  accepted_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  client?: Pick<Client, 'name' | 'phone'> | null
  items?: QuoteItem[]
}

export interface Payment {
  id: string
  quote_id: string
  user_id: string
  amount: number
  method: string
  notes: string
  paid_at: string
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'paid'

export const TRADES = [
  'Mecánico',
  'Plomero',
  'Electricista',
  'Albañil',
  'Herrero',
  'Carpintero',
  'Pintor',
  'Refrigeración',
  'Service',
  'Gasista',
  'Cerrajero',
  'Otro',
] as const

export const STATUS_MAP: Record<QuoteStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Borrador', color: 'text-gray-600', bg: 'bg-gray-100' },
  sent: { label: 'Enviado', color: 'text-blue-700', bg: 'bg-blue-100' },
  accepted: { label: 'Aceptado', color: 'text-green-700', bg: 'bg-green-100' },
  rejected: { label: 'Rechazado', color: 'text-red-700', bg: 'bg-red-100' },
  in_progress: { label: 'En trabajo', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  completed: { label: 'Completado', color: 'text-purple-700', bg: 'bg-purple-100' },
  paid: { label: 'Cobrado ✓', color: 'text-emerald-800', bg: 'bg-emerald-100' },
}

export const FREE_PLAN_LIMITS = {
  quotes_per_month: 5,
  max_clients: 10,
  max_saved_items: 10,
  watermark: true,
}

export const IVA_OPTIONS = [
  { value: 0, label: 'Sin IVA' },
  { value: 10.5, label: 'IVA 10.5%' },
  { value: 21, label: 'IVA 21%' },
] as const

export const formatARS = (n: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n)
