import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { assetUrl } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import MpesaSection from '../components/MpesaSection'
import { Button } from '../components/ui/Button'
import { Input, Textarea, Select, Label } from '../components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { PageSpinner } from '../components/ui/Spinner'
import {
  LayoutDashboard, Building2, ClipboardList, Banknote,
  Plus, X, Check, Trash2, ChevronDown, ChevronUp,
  TrendingUp, Home, Users, MessageSquare, CalendarDays,
  ImageIcon, ArrowRight, Clock, CheckCircle2, XCircle, KeyRound,
  UploadCloud, Link as LinkIcon, Smartphone, Pencil,
  Wrench, AlertCircle, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

//  Shared helpers 

function StatusBadge({ status }) {
  const map = { pending: 'warning', approved: 'success', rejected: 'danger' }
  return <Badge variant={map[status] || 'secondary'} className="capitalize">{status}</Badge>
}

function EmptyState({ icon, message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed rounded-lg">
      <div className="mb-3 opacity-25">{icon}</div>
      <p className="font-medium">{message}</p>
      {sub && <p className="text-sm mt-1 text-center max-w-xs">{sub}</p>}
    </div>
  )
}

// Amount actually paid on a rent record. Records marked paid by hand count in full.
const paidOf = (p) => (p.status === 'paid' ? p.amount : (p.amountPaid || 0))
const paymentLabel = (p) => (p.status === 'paid' ? 'paid' : (p.amountPaid > 0 ? 'part paid' : 'pending'))
const amountText = (p) => (p.status !== 'paid' && p.amountPaid > 0
  ? `KES ${p.amountPaid.toLocaleString()} of ${p.amount.toLocaleString()}`
  : `KES ${p.amount.toLocaleString()}`)

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

//  Main Dashboard Page 

function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Logged in as <span className="font-medium text-foreground">{user?.name}</span>
          <Badge className="ml-2 capitalize" variant="secondary">{user?.role}</Badge>
        </p>
      </motion.div>
      {user?.role === 'landlord' ? <LandlordDashboard /> : <TenantDashboard />}
    </div>
  )
}

//  Landlord Dashboard (sidebar layout) 

const NAV_ITEMS = [
  { key: 'overview',      label: 'Overview',      Icon: LayoutDashboard },
  { key: 'properties',    label: 'Properties',    Icon: Building2 },
  { key: 'applications',  label: 'Applications',  Icon: ClipboardList },
  { key: 'revenue',       label: 'Revenue',       Icon: Banknote },
  { key: 'mpesa',         label: 'M-Pesa',        Icon: Smartphone },
  { key: 'maintenance',   label: 'Repairs',       Icon: Wrench },
]

function LandlordDashboard() {
  const [activeSection, setActiveSection] = useState('overview')
  const [listings, setListings]                   = useState([])
  const [applications, setApplications]           = useState([])
  const [payments, setPayments]                   = useState([])
  const [maintenanceRequests, setMaintenanceRequests] = useState([])
  const [loading, setLoading]                     = useState(true)

  const loadAll = () => {
    setLoading(true)
    Promise.all([
      axios.get('/api/properties/my-listings'),
      axios.get('/api/applications/received'),
      axios.get('/api/payments'),
      axios.get('/api/maintenance'),
    ]).then(([lRes, aRes, pRes, mRes]) => {
      setListings(lRes.data)
      setApplications(aRes.data)
      setPayments(pRes.data)
      setMaintenanceRequests(mRes.data)
    }).catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadAll() }, [])

  if (loading) return <PageSpinner />

  const pendingCount      = applications.filter(a => a.status === 'pending').length
  const openRepairsCount  = maintenanceRequests.filter(m => m.status !== 'resolved').length

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 min-h-[70vh]">

      {/* ── Mobile tab bar (xs/sm) ── */}
      <div className="md:hidden bg-card border rounded-xl p-1.5 grid grid-cols-6 gap-1">
        {NAV_ITEMS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`relative flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg text-xs font-medium transition-colors
              ${activeSection === key ? 'bg-[#7c4a1e] text-white shadow' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="leading-none">{label}</span>
            {key === 'applications' && pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 text-[10px] font-bold rounded-full bg-red-500 text-white flex items-center justify-center px-1">
                {pendingCount}
              </span>
            )}
            {key === 'maintenance' && openRepairsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 text-[10px] font-bold rounded-full bg-amber-500 text-white flex items-center justify-center px-1">
                {openRepairsCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Desktop sidebar (md+) ── */}
      <aside className="hidden md:block md:w-52 shrink-0">
        <nav className="flex flex-col gap-1 bg-card border rounded-xl p-2">
          {NAV_ITEMS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-left transition-colors relative
                ${activeSection === key
                  ? 'bg-[#7c4a1e] text-white shadow'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {key === 'applications' && pendingCount > 0 && (
                <span className={`ml-auto text-xs font-bold rounded-full px-1.5 py-0.5 ${activeSection === key ? 'bg-white/30 text-white' : 'bg-[#7c4a1e] text-white'}`}>
                  {pendingCount}
                </span>
              )}
              {key === 'maintenance' && openRepairsCount > 0 && (
                <span className={`ml-auto text-xs font-bold rounded-full px-1.5 py-0.5 ${activeSection === key ? 'bg-white/30 text-white' : 'bg-amber-500 text-white'}`}>
                  {openRepairsCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div key={activeSection} variants={fadeIn} initial="hidden" animate="show">
            {activeSection === 'overview'     && <OverviewSection    listings={listings} applications={applications} payments={payments} setActiveSection={setActiveSection} />}
            {activeSection === 'properties'   && <PropertiesSection  listings={listings} setListings={setListings} applications={applications} payments={payments} setPayments={setPayments} />}
            {activeSection === 'applications' && <ApplicationsSection applications={applications} setApplications={setApplications} />}
            {activeSection === 'revenue'      && <RevenueSection     listings={listings} payments={payments} setPayments={setPayments} />}
            {activeSection === 'mpesa'        && <MpesaSection       applications={applications} onPaymentsChanged={() => axios.get('/api/payments').then(r => setPayments(r.data)).catch(() => {})} />}
            {activeSection === 'maintenance'  && <MaintenanceSection maintenanceRequests={maintenanceRequests} setMaintenanceRequests={setMaintenanceRequests} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

//  Overview Section 

function OverviewSection({ listings, applications, payments, setActiveSection }) {
  const occupied        = listings.filter(l => !l.isAvailable).length
  const vacant          = listings.filter(l => l.isAvailable).length
  const monthlyExpected = listings.filter(l => !l.isAvailable).reduce((s, l) => s + l.rentPerMonth, 0)
  const pending         = applications.filter(a => a.status === 'pending').length

  const now       = new Date()
  const thisMonth = payments.filter(p => new Date(p.month).getMonth() === now.getMonth() && new Date(p.month).getFullYear() === now.getFullYear())
  const collected = thisMonth.reduce((s, p) => s + paidOf(p), 0)

  const stats = [
    { label: 'Total Properties',     value: listings.length, icon: Home,          color: 'text-[#7c4a1e]',  bg: 'bg-[#7c4a1e]/10' },
    { label: 'Occupied',             value: occupied,        icon: Users,         color: 'text-green-600',   bg: 'bg-green-50' },
    { label: 'Vacant',               value: vacant,          icon: Building2,     color: 'text-amber-600',   bg: 'bg-amber-50' },
    { label: 'Pending Applications', value: pending,         icon: ClipboardList, color: 'text-blue-600',    bg: 'bg-blue-50' },
  ]

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Overview</h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4">
              <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-[#7c4a1e]" />
              <p className="text-sm font-medium text-muted-foreground">Monthly Expected Income</p>
            </div>
            <p className="text-2xl font-bold text-[#7c4a1e]">KES {monthlyExpected.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">From {occupied} occupied {occupied === 1 ? 'property' : 'properties'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium text-muted-foreground">Collected This Month</p>
            </div>
            <p className="text-2xl font-bold text-green-600">KES {collected.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{thisMonth.filter(p => p.status === 'paid').length} of {thisMonth.length} payments received</p>
          </CardContent>
        </Card>
      </div>

      {pending > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-amber-600" />
              <p className="text-sm font-medium">You have <span className="text-amber-700 font-bold">{pending}</span> pending application{pending > 1 ? 's' : ''} to review</p>
            </div>
            <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-100" onClick={() => setActiveSection('applications')}>
              Review
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

//  Properties Section 

function PropertiesSection({ listings, setListings, applications, payments, setPayments }) {
  const [showForm, setShowForm]           = useState(false)
  const [submitting, setSubmitting]       = useState(false)
  const [selectedId, setSelectedId]       = useState(null)
  const [formImageFile, setFormImageFile] = useState(null)
  const [formImagePreview, setFormImagePreview] = useState('')
  const [formImgUploading, setFormImgUploading] = useState(false)
  const [newProperty, setNewProperty]     = useState({
    title: '', description: '', rentPerMonth: '', bedrooms: '',
    bathrooms: '', propertyType: 'apartment', features: [],
    address: { street: '', city: '', state: '', country: 'Kenya' },
  })

  const FEATURES_LIST = [
    'WiFi', 'Air Conditioning', 'Parking', 'Security Guard',
    'Generator / Backup Power', 'Water Storage / Borehole', 'Swimming Pool',
    'Gym', 'Elevator', 'CCTV', 'Furnished', 'Balcony', 'Garden / Compound',
    'Pet Friendly', 'Tiled Floors', 'Ensuite Bathroom',
  ]

  const toggleFeature = (f) => {
    setNewProperty(p => ({
      ...p,
      features: p.features.includes(f) ? p.features.filter(x => x !== f) : [...p.features, f],
    }))
  }

  const tenantMap = {}
  applications.filter(a => a.status === 'approved').forEach(a => {
    tenantMap[a.property?._id] = a.tenant
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    if (['street', 'city', 'state', 'country'].includes(name)) {
      setNewProperty(p => ({ ...p, address: { ...p.address, [name]: value } }))
    } else {
      setNewProperty(p => ({ ...p, [name]: value }))
    }
  }

  const handleFormImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFormImageFile(file)
    setFormImagePreview(URL.createObjectURL(file))
  }

  const submitProperty = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      let images = []
      // If a photo was chosen, upload it first
      if (formImageFile) {
        setFormImgUploading(true)
        const fd = new FormData()
        fd.append('image', formImageFile)
        const { data: up } = await axios.post('/api/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        images = [assetUrl(up.url)]
        setFormImgUploading(false)
      }
      const { data } = await axios.post('/api/properties', { ...newProperty, images })
      setListings(prev => [data, ...prev])
      setShowForm(false)
      setFormImageFile(null)
      setFormImagePreview('')
      setNewProperty({ title: '', description: '', rentPerMonth: '', bedrooms: '', bathrooms: '', propertyType: 'apartment', features: [], address: { street: '', city: '', state: '', country: 'Kenya' } })
      toast.success('Property listed!')
    } catch (err) {
      setFormImgUploading(false)
      toast.error(err.response?.data?.message || 'Failed to create listing')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">My Properties <span className="text-muted-foreground text-base font-normal">({listings.length})</span></h3>
        <Button size="sm" className="bg-[#7c4a1e] hover:bg-[#7c4a1e]/90" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {showForm ? 'Cancel' : 'Add Property'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-5">
            <form onSubmit={submitProperty} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Title</Label>
                  <Input name="title" placeholder="e.g. Modern 2BR in Kilimani" onChange={handleChange} required />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Description</Label>
                  <Textarea name="description" placeholder="Describe the property..." onChange={handleChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Rent / month (KES)</Label>
                  <Input name="rentPerMonth" type="number" placeholder="25000" onChange={handleChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Property Type</Label>
                  <Select name="propertyType" onChange={handleChange}>
                    {['apartment', 'house', 'studio', 'bedsitter', 'commercial'].map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Bedrooms</Label>
                  <Input name="bedrooms" type="number" placeholder="2" onChange={handleChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Bathrooms</Label>
                  <Input name="bathrooms" type="number" placeholder="1" onChange={handleChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Street</Label>
                  <Input name="street" placeholder="Ngong Road" onChange={handleChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input name="city" placeholder="Nairobi" onChange={handleChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label>State / County</Label>
                  <Input name="state" placeholder="Nairobi County" onChange={handleChange} required />
                </div>

                {/* Image upload */}
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Property Photo <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <label className="flex items-center gap-3 w-full h-11 px-3 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-[#7c4a1e]/60 text-sm text-muted-foreground hover:text-[#7c4a1e] cursor-pointer transition-colors bg-muted/20">
                    <UploadCloud className="h-4 w-4 shrink-0" />
                    <span className="truncate">{formImageFile ? formImageFile.name : 'Choose photo (JPG, PNG, WEBP · max 5 MB)'}</span>
                    <input type="file" accept="image/*" className="sr-only" onChange={handleFormImage} />
                  </label>
                  {formImagePreview && (
                    <div className="relative mt-1 w-full h-40 rounded-lg overflow-hidden border">
                      <img src={formImagePreview} alt="preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setFormImageFile(null); setFormImagePreview('') }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Features / amenities */}
                <div className="sm:col-span-2 space-y-2">
                  <Label>Features &amp; Amenities <span className="text-muted-foreground font-normal">(select all that apply)</span></Label>
                  <div className="flex flex-wrap gap-2">
                    {FEATURES_LIST.map(f => {
                      const on = newProperty.features.includes(f)
                      return (
                        <button
                          key={f} type="button"
                          onClick={() => toggleFeature(f)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            on
                              ? 'bg-[#7c4a1e] text-white border-[#7c4a1e]'
                              : 'text-muted-foreground border-border hover:border-[#7c4a1e]/60 hover:text-[#7c4a1e]'
                          }`}
                        >
                          {on ? '✓ ' : ''}{f}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <Button type="submit" className="bg-[#7c4a1e] hover:bg-[#7c4a1e]/90" disabled={submitting || formImgUploading}>
                {formImgUploading ? 'Uploading photo…' : submitting ? 'Submitting…' : 'Submit Listing'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {listings.length === 0 ? (
        <EmptyState icon={<Building2 className="h-10 w-10" />} message="No properties yet" sub="Add your first property to get started" />
      ) : (
        <div className="space-y-3">
          {listings.map(l => {
            const tenant = tenantMap[l._id]
            const img = l.images?.[0]
            return (
              <Card key={l._id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setSelectedId(l._id)}>
                <CardContent className="pt-0 pb-0 overflow-hidden rounded-lg">
                  <div className="flex gap-0">
                    {/* Thumbnail */}
                    <div className="shrink-0 w-24 sm:w-32 h-24 sm:h-28 relative overflow-hidden rounded-l-lg">
                      {img
                        ? <img src={img} alt={l.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gradient-to-br from-[#2c1a0e] to-[#7c4a1e]/60 flex items-center justify-center"><Building2 className="h-6 w-6 text-white/30" /></div>
                      }
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm leading-tight">{l.title}</p>
                          <Badge variant={l.isAvailable ? 'success' : 'secondary'} className="text-[10px]">
                            {l.isAvailable ? 'Available' : 'Occupied'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{l.address.city} · {l.bedrooms}bd · {l.bathrooms}ba · <span className="capitalize">{l.propertyType}</span></p>
                        <p className="text-[#7c4a1e] font-bold text-sm">KES {l.rentPerMonth.toLocaleString()}/mo</p>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        {tenant
                          ? <p className="text-xs text-green-700 font-medium truncate">👤 {tenant.name}</p>
                          : <p className="text-xs text-muted-foreground">No current tenant</p>
                        }
                        <span className="flex items-center gap-0.5 text-xs text-[#7c4a1e] font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          Manage <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Property detail drawer */}
      <AnimatePresence>
        {selectedId && (() => {
          const prop = listings.find(l => l._id === selectedId)
          if (!prop) return null
          return (
            <PropertyDrawer
              property={prop}
              applications={applications}
              payments={payments}
              setPayments={setPayments}
              setListings={setListings}
              onClose={() => setSelectedId(null)}
            />
          )
        })()}
      </AnimatePresence>
    </div>
  )
}

// ── Property Detail Drawer ────────────────────────────────────────────────────

const DRAWER_TABS = [
  { key: 'overview',    label: 'Overview',    Icon: Building2 },
  { key: 'tenants',     label: 'Tenants',     Icon: Users },
  { key: 'financials',  label: 'Financials',  Icon: Banknote },
]

function PropertyDrawer({ property, applications, payments, setPayments, setListings, onClose }) {
  const [tab, setTab]               = useState('overview')
  const [imageUrl, setImageUrl]     = useState(property.images?.[0] || '')
  const [savingImg, setSavingImg]   = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [urlMode, setUrlMode]       = useState(false)   // toggle between file-pick and URL paste
  const [toggling, setToggling]     = useState(false)

  // .toString() on both sides handles MongoDB ObjectId vs plain string comparisons
  const propId    = property._id?.toString()
  const propApps  = applications.filter(a => (a.property?._id?.toString() ?? a.property?.toString()) === propId && a.status === 'approved')
  const propPays  = payments.filter(p => (p.property?._id?.toString() ?? p.property?.toString()) === propId)
  const collected   = propPays.reduce((s, p) => s + paidOf(p), 0)
  // Outstanding = rent owed across all recorded months minus what has been collected
  // e.g. rent 40,000, paid 23,000 → outstanding 17,000
  const uniqueMonths  = new Set(propPays.map(p => new Date(p.month).toISOString().slice(0, 7))).size
  const outstanding   = Math.max(0, uniqueMonths * property.rentPerMonth - collected)

  const saveImage = async (url = imageUrl) => {
    setSavingImg(true)
    try {
      const { data } = await axios.put(`/api/properties/${property._id}`, { images: url ? [url] : [] })
      setListings(prev => prev.map(l => l._id === property._id ? data : l))
      toast.success('Image updated')
    } catch { toast.error('Failed to save image') }
    finally { setSavingImg(false) }
  }

  const uploadFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('image', file)
      const { data } = await axios.post('/api/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      // data.url is like /uploads/uuid.jpg; assetUrl adds the backend address
      const fullUrl = assetUrl(data.url)
      setImageUrl(fullUrl)
      await saveImage(fullUrl)
    } catch { toast.error('Upload failed') }
    finally { setUploading(false) }
  }

  const toggleAvailability = async () => {
    setToggling(true)
    try {
      const { data } = await axios.put(`/api/properties/${property._id}`, { isAvailable: !property.isAvailable })
      setListings(prev => prev.map(l => l._id === property._id ? data : l))
      toast.success(data.isAvailable ? 'Listed as available' : 'Marked as occupied')
    } catch { toast.error('Failed to update availability') }
    finally { setToggling(false) }
  }

  const markPaid = async (paymentId) => {
    try {
      const { data } = await axios.put(`/api/payments/${paymentId}/mark-paid`)
      setPayments(prev => prev.map(p => p._id === paymentId ? data : p))
      toast.success('Marked as paid!')
    } catch { toast.error('Failed to update') }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel */}
      <motion.div
        className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-background z-50 shadow-2xl flex flex-col"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b shrink-0">
          <div className="min-w-0 mr-3">
            <h2 className="font-bold text-lg leading-tight line-clamp-1">{property.title}</h2>
            <p className="text-sm text-muted-foreground">{property.address.street}, {property.address.city}</p>
          </div>
          <button onClick={onClose} className="shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors mt-0.5">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b shrink-0 px-1">
          {DRAWER_TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors flex-1 justify-center
                ${tab === key ? 'border-[#7c4a1e] text-[#7c4a1e]' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* ── Overview tab ── */}
          {tab === 'overview' && (
            <>
              {/* Image */}
              <div>
                {/* Image preview */}
              <div className="relative w-full h-52 rounded-xl overflow-hidden bg-gradient-to-br from-[#2c1a0e] to-[#7c4a1e]/60">
                {imageUrl
                  ? <img src={imageUrl} alt={property.title} className="w-full h-full object-cover"
                      onError={e => { e.currentTarget.style.display = 'none' }} />
                  : <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <ImageIcon className="h-10 w-10 text-white/25" />
                      <p className="text-white/40 text-sm">No photo yet</p>
                    </div>
                }
                {(uploading || savingImg) && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                    <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Upload controls */}
              <div className="mt-2 space-y-2">
                {/* Mode toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setUrlMode(false)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                      !urlMode ? 'bg-[#7c4a1e] text-white border-[#7c4a1e]' : 'text-muted-foreground hover:text-foreground border-border'
                    }`}
                  >
                    <UploadCloud className="h-3.5 w-3.5" /> Upload file
                  </button>
                  <button
                    onClick={() => setUrlMode(true)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                      urlMode ? 'bg-[#7c4a1e] text-white border-[#7c4a1e]' : 'text-muted-foreground hover:text-foreground border-border'
                    }`}
                  >
                    <LinkIcon className="h-3.5 w-3.5" /> Paste URL
                  </button>
                </div>

                {!urlMode ? (
                  /* File picker */
                  <label className="flex items-center justify-center gap-2 w-full h-11 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-[#7c4a1e]/60 text-sm text-muted-foreground hover:text-[#7c4a1e] cursor-pointer transition-colors bg-muted/20">
                    <UploadCloud className="h-4 w-4" />
                    {uploading ? 'Uploading…' : 'Choose photo (JPG, PNG, WEBP · max 5 MB)'}
                    <input type="file" accept="image/*" className="sr-only" onChange={uploadFile} disabled={uploading} />
                  </label>
                ) : (
                  /* URL input */
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://example.com/photo.jpg"
                      value={imageUrl}
                      onChange={e => setImageUrl(e.target.value)}
                      className="text-sm"
                    />
                    <Button size="sm" variant="outline" onClick={() => saveImage()} disabled={savingImg} className="shrink-0 px-3">
                      {savingImg ? '…' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                {[
                  ['Type',      property.propertyType],
                  ['Bedrooms',  property.bedrooms],
                  ['Bathrooms', property.bathrooms],
                  ['City',      property.address.city],
                  ['County',    property.address.state],
                  ['Rent',      `KES ${property.rentPerMonth.toLocaleString()}/mo`],
                ].map(([label, val]) => (
                  <div key={label} className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    <p className="font-medium text-sm capitalize truncate">{val}</p>
                  </div>
                ))}
              </div>

              {/* Availability toggle */}
              <div className={`flex items-center justify-between p-4 rounded-xl border gap-3
                ${property.isAvailable ? 'border-green-200 bg-green-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
                <div>
                  <p className="font-semibold text-sm">
                    {property.isAvailable ? '🟢 Listed as Available' : '🟠 Marked as Occupied'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {property.isAvailable
                      ? 'Tenants can find and apply for this property'
                      : 'Hidden from public search — not accepting applications'}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={toggleAvailability}
                  disabled={toggling}
                  className={`shrink-0 ${property.isAvailable ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {toggling ? '…' : property.isAvailable ? 'Mark Occupied' : 'List Available'}
                </Button>
              </div>
            </>
          )}

          {/* ── Tenants tab ── */}
          {tab === 'tenants' && (
            propApps.length === 0
              ? <EmptyState icon={<Users className="h-8 w-8" />} message="No tenant history" sub="Approved applications for this property appear here" />
              : <div className="space-y-3">
                  {propApps.map(a => (
                    <Card key={a._id}>
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#7c4a1e]/10 flex items-center justify-center shrink-0">
                            <span className="text-[#7c4a1e] font-bold">{a.tenant?.name?.[0]?.toUpperCase()}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm">{a.tenant?.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{a.tenant?.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Approved {new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <Badge variant="success" className="shrink-0">Active</Badge>
                        </div>
                        {a.message && (
                          <p className="mt-2 pt-2 border-t text-xs text-muted-foreground italic">"{a.message}"</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
          )}

          {/* ── Financials tab ── */}
          {tab === 'financials' && (
            <>
              {propPays.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="pt-3 pb-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Total Collected</p>
                      <p className="font-bold text-green-600 text-lg">KES {collected.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-3 pb-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
                      <p className="font-bold text-amber-600 text-lg">KES {outstanding.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {propPays.length === 0
                ? <EmptyState icon={<Banknote className="h-8 w-8" />} message="No payment records" sub="Add records in the Revenue section to track payments here" />
                : <div className="space-y-2">
                    {propPays.map(p => (
                      <div key={p._id} className="flex items-center justify-between gap-2 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {new Date(p.month).toLocaleString('default', { month: 'long', year: 'numeric' })}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{p.tenant?.name}</p>
                          {p.notes && <p className="text-xs italic text-muted-foreground">{p.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <p className={`font-bold text-sm ${p.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                              {amountText(p)}
                            </p>
                            <Badge variant={p.status === 'paid' ? 'success' : 'warning'} className="capitalize text-[10px]">
                              {paymentLabel(p)}
                            </Badge>
                          </div>
                          {p.status === 'pending' && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs px-2" onClick={() => markPaid(p._id)}>
                              <Check className="h-3 w-3 mr-1" /> Paid
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </>
          )}
        </div>
      </motion.div>
    </>
  )
}

//  Applications Section (Inbox) 

function ApplicationsSection({ applications, setApplications }) {
  const [expandedId, setExpandedId] = useState(null)
  const [replyMsgs, setReplyMsgs]   = useState({})
  const [processing, setProcessing] = useState({})

  const pending  = applications.filter(a => a.status === 'pending')
  const reviewed = applications.filter(a => a.status !== 'pending')

  const respond = async (appId, status) => {
    setProcessing(p => ({ ...p, [appId]: true }))
    try {
      await axios.put(`/api/applications/${appId}/status`, {
        status,
        landlordMessage: replyMsgs[appId] || '',
      })
      setApplications(prev => prev.map(a => a._id === appId ? { ...a, status, landlordMessage: replyMsgs[appId] || '' } : a))
      setExpandedId(null)
      toast.success(`Application ${status}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update')
    } finally {
      setProcessing(p => ({ ...p, [appId]: false }))
    }
  }

  const AppCard = ({ a }) => {
    const isExpanded = expandedId === a._id
    return (
      <Card className={`transition-shadow ${a.status === 'pending' ? 'border-amber-200' : ''}`}>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : a._id)}>
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm">{a.tenant?.name}</p>
                <StatusBadge status={a.status} />
              </div>
              <p className="text-xs text-muted-foreground">{a.tenant?.email}</p>
              <p className="text-xs text-muted-foreground">Applied for: <span className="font-medium text-foreground">{a.property?.title}</span></p>
              <p className="text-xs text-muted-foreground">KES {a.property?.rentPerMonth?.toLocaleString()}/mo  {a.property?.address?.city}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 mt-1">
              <p className="text-xs text-muted-foreground hidden sm:block">{new Date(a.createdAt).toLocaleDateString()}</p>
              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t space-y-4">
                  {a.message && (
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Tenant message
                      </p>
                      <p className="text-sm">"{a.message}"</p>
                    </div>
                  )}

                  {a.status === 'pending' && (
                    <>
                      <div className="space-y-1.5">
                        <Label>Reply to tenant (optional)</Label>
                        <Textarea
                          placeholder="Write a response message..."
                          value={replyMsgs[a._id] || ''}
                          onChange={e => setReplyMsgs(p => ({ ...p, [a._id]: e.target.value }))}
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => respond(a._id, 'approved')}
                          disabled={processing[a._id]}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => respond(a._id, 'rejected')}
                          disabled={processing[a._id]}
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    </>
                  )}

                  {a.landlordMessage && (
                    <div className="bg-[#7c4a1e]/5 border border-[#7c4a1e]/20 rounded-lg p-3">
                      <p className="text-xs font-medium text-[#7c4a1e] mb-1 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Your reply
                      </p>
                      <p className="text-sm">"{a.landlordMessage}"</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Applications Inbox</h3>
      {applications.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-10 w-10" />} message="No applications yet" sub="Applications from tenants will appear here" />
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-amber-700 flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> Pending Review ({pending.length})
              </p>
              {pending.map(a => <AppCard key={a._id} a={a} />)}
            </div>
          )}
          {reviewed.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Reviewed ({reviewed.length})</p>
              {reviewed.map(a => <AppCard key={a._id} a={a} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}

//  Revenue Section 

function RevenueSection({ listings, payments, setPayments }) {
  const [showForm, setShowForm]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newPayment, setNewPayment] = useState({ propertyId: '', tenantId: '', amount: '', month: '', notes: '' })
  const [approvedTenants, setApprovedTenants] = useState([])

  useEffect(() => {
    axios.get('/api/applications/received')
      .then(r => setApprovedTenants(r.data.filter(a => a.status === 'approved')))
      .catch(() => {})
  }, [])

  const now       = new Date()
  const thisMonth = payments.filter(p => {
    const d = new Date(p.month)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const expected    = listings.filter(l => !l.isAvailable).reduce((s, l) => s + l.rentPerMonth, 0)
  const collected   = thisMonth.reduce((s, p) => s + paidOf(p), 0)
  // Outstanding = what should have come in this month minus what actually has
  const outstanding = Math.max(0, expected - collected)

  const submitPayment = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { data } = await axios.post('/api/payments', newPayment)
      setPayments(prev => [data, ...prev])
      setShowForm(false)
      setNewPayment({ propertyId: '', tenantId: '', amount: '', month: '', notes: '' })
      toast.success('Payment record created')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create payment record')
    } finally {
      setSubmitting(false)
    }
  }

  const markPaid = async (paymentId) => {
    try {
      const { data } = await axios.put(`/api/payments/${paymentId}/mark-paid`)
      setPayments(prev => prev.map(p => p._id === paymentId ? data : p))
      toast.success('Marked as paid!')
    } catch {
      toast.error('Failed to update payment')
    }
  }

  const deletePayment = async (paymentId) => {
    try {
      await axios.delete(`/api/payments/${paymentId}`)
      setPayments(prev => prev.filter(p => p._id !== paymentId))
      toast.success('Record deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Revenue</h3>
        <Button size="sm" className="bg-[#7c4a1e] hover:bg-[#7c4a1e]/90" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {showForm ? 'Cancel' : 'Add Payment Record'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Monthly Expected</p>
            <p className="text-xl font-bold text-[#7c4a1e]">KES {expected.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Collected This Month</p>
            <p className="text-xl font-bold text-green-600">KES {collected.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
            <p className="text-xl font-bold text-amber-600">KES {outstanding.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-5">
            <form onSubmit={submitPayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Property</Label>
                  <Select value={newPayment.propertyId} onChange={e => setNewPayment(p => ({ ...p, propertyId: e.target.value }))} required>
                    <option value="">Select property</option>
                    {listings.map(l => <option key={l._id} value={l._id}>{l.title}</option>)}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tenant</Label>
                  <Select value={newPayment.tenantId} onChange={e => setNewPayment(p => ({ ...p, tenantId: e.target.value }))} required>
                    <option value="">Select tenant</option>
                    {approvedTenants.map(a => (
                      <option key={a._id} value={a.tenant?._id}>{a.tenant?.name}  {a.property?.title}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Amount (KES)</Label>
                  <Input type="number" placeholder="25000" value={newPayment.amount} onChange={e => setNewPayment(p => ({ ...p, amount: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Month</Label>
                  <Input type="month" value={newPayment.month} onChange={e => setNewPayment(p => ({ ...p, month: e.target.value }))} required />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Notes (optional)</Label>
                  <Input placeholder="e.g. Paid via M-Pesa" value={newPayment.notes} onChange={e => setNewPayment(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <Button type="submit" className="bg-[#7c4a1e] hover:bg-[#7c4a1e]/90" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Record'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {payments.length === 0 ? (
        <EmptyState icon={<Banknote className="h-10 w-10" />} message="No payment records yet" sub="Add a record to start tracking rent payments" />
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">Payment History</p>
          {payments.map(p => (
            <Card key={p._id}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{p.property?.title}</p>
                      <Badge variant={p.status === 'paid' ? 'success' : 'warning'} className="capitalize">{paymentLabel(p)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.tenant?.name}  {new Date(p.month).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </p>
                    {p.notes && <p className="text-xs text-muted-foreground italic">{p.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className={`font-bold text-sm ${p.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                      {amountText(p)}
                    </p>
                    {p.status === 'pending' && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs" onClick={() => markPaid(p._id)}>
                        <Check className="h-3 w-3 mr-1" /> Mark Paid
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 text-muted-foreground hover:text-destructive" onClick={() => deletePayment(p._id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

//  Maintenance Section (Landlord) 

function MaintenanceSection({ maintenanceRequests, setMaintenanceRequests }) {
  const [updatingId, setUpdatingId] = useState(null)
  const [noteEditing, setNoteEditing] = useState(null)   // request._id
  const [noteInput,   setNoteInput]  = useState('')

  const PRIORITY_STYLE = {
    low:    'bg-green-100 text-green-700 border-green-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    high:   'bg-red-100 text-red-600 border-red-200',
  }

  const STATUS_STYLE = {
    'open':        'bg-red-100 text-red-600',
    'in-progress': 'bg-amber-100 text-amber-700',
    'resolved':    'bg-green-100 text-green-700',
  }

  const STATUS_NEXT = {
    'open':        'in-progress',
    'in-progress': 'resolved',
    'resolved':    null,
  }

  const STATUS_LABEL = {
    'open':        'Mark In-Progress',
    'in-progress': 'Mark Resolved',
    'resolved':    null,
  }

  const updateStatus = async (req, newStatus) => {
    setUpdatingId(req._id)
    try {
      const { data } = await axios.put(`/api/maintenance/${req._id}/status`, { status: newStatus })
      setMaintenanceRequests(prev => prev.map(r => r._id === req._id ? { ...r, ...data } : r))
      toast.success(`Status updated to "${newStatus}"`)
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  const saveNote = async (req) => {
    setUpdatingId(req._id)
    try {
      const { data } = await axios.put(`/api/maintenance/${req._id}/status`, {
        status: req.status,
        landlordNote: noteInput,
      })
      setMaintenanceRequests(prev => prev.map(r => r._id === req._id ? { ...r, ...data } : r))
      setNoteEditing(null)
      toast.success('Note saved')
    } catch {
      toast.error('Failed to save note')
    } finally {
      setUpdatingId(null)
    }
  }

  const deleteRequest = async (id) => {
    try {
      await axios.delete(`/api/maintenance/${id}`)
      setMaintenanceRequests(prev => prev.filter(r => r._id !== id))
      toast.success('Request deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const open        = maintenanceRequests.filter(r => r.status === 'open')
  const inProgress  = maintenanceRequests.filter(r => r.status === 'in-progress')
  const resolved    = maintenanceRequests.filter(r => r.status === 'resolved')

  const groups = [
    { label: 'Open',        items: open,       dot: 'bg-red-500' },
    { label: 'In Progress', items: inProgress,  dot: 'bg-amber-500' },
    { label: 'Resolved',    items: resolved,   dot: 'bg-green-500' },
  ]

  if (maintenanceRequests.length === 0) {
    return <EmptyState icon={<Wrench className="h-10 w-10" />} message="No maintenance requests" sub="Tenants will submit repair requests here" />
  }

  return (
    <div className="space-y-6">
      {groups.map(({ label, items, dot }) => items.length > 0 && (
        <div key={label}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {label} ({items.length})
            </h3>
          </div>

          <div className="space-y-3">
            {items.map(r => (
              <Card key={r._id} className={`overflow-hidden ${r.status === 'resolved' ? 'opacity-70' : ''}`}>
                <CardContent className="p-0">
                  {/* Header row */}
                  <div className="flex items-start gap-3 p-4 pb-2">
                    {/* Priority bar */}
                    <div className={`shrink-0 mt-1 h-2 w-2 rounded-full ${r.priority === 'high' ? 'bg-red-500' : r.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm leading-tight">{r.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {r.property?.title} · {r.tenant?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${PRIORITY_STYLE[r.priority]}`}>
                            {r.priority}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[r.status]}`}>
                            {r.status}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm mt-2 text-foreground/80 leading-relaxed">{r.description}</p>

                      {/* Photo */}
                      {r.photo && (
                        <img
                          src={r.photo} alt="issue"
                          className="mt-2 rounded-lg w-full max-h-48 object-cover border"
                        />
                      )}

                      {/* Landlord note */}
                      {noteEditing === r._id ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            rows={2}
                            className="w-full text-sm rounded-lg border px-3 py-2 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-[#7c4a1e]/40"
                            placeholder="Add a note to the tenant…"
                            value={noteInput}
                            onChange={e => setNoteInput(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-[#7c4a1e] hover:bg-[#6b3f19] text-white h-7 text-xs"
                              onClick={() => saveNote(r)} disabled={updatingId === r._id}>
                              Save Note
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => setNoteEditing(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : r.landlordNote ? (
                        <div className="mt-2 bg-[#7c4a1e]/5 border border-[#7c4a1e]/20 rounded-lg px-3 py-2 flex items-start justify-between gap-2">
                          <p className="text-xs text-[#7c4a1e]">
                            <span className="font-semibold">Your note:</span> {r.landlordNote}
                          </p>
                          <button onClick={() => { setNoteEditing(r._id); setNoteInput(r.landlordNote) }}
                            className="shrink-0 text-[#7c4a1e] hover:text-[#6b3f19]">
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Footer action row */}
                  <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t bg-muted/20">
                    <div className="flex gap-2">
                      {STATUS_NEXT[r.status] && (
                        <Button
                          size="sm"
                          className="bg-[#7c4a1e] hover:bg-[#6b3f19] text-white h-7 text-xs"
                          onClick={() => updateStatus(r, STATUS_NEXT[r.status])}
                          disabled={updatingId === r._id}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          {STATUS_LABEL[r.status]}
                        </Button>
                      )}
                      {!r.landlordNote && noteEditing !== r._id && (
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => { setNoteEditing(r._id); setNoteInput('') }}>
                          <MessageSquare className="h-3 w-3 mr-1" /> Add Note
                        </Button>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteRequest(r._id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

//  Tenant Dashboard

function TenantDashboard() {
  const { user, setUser }               = useAuth()
  const [tab, setTab]                   = useState('applications')
  const [applications, setApplications] = useState([])
  const [payments, setPayments]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [paymentsLoading, setPaymentsLoading] = useState(false)

  // Phone management
  const [editingPhone, setEditingPhone] = useState(false)
  const [phoneInput, setPhoneInput]     = useState(user?.phone || '')
  const [savingPhone, setSavingPhone]   = useState(false)

  // M-Pesa STK Push
  const [stkLoading, setStkLoading]     = useState(null) // payment._id being processed

  // M-Pesa Paybill details (Paybill number comes from the server)
  const [mpesaConfig, setMpesaConfig]   = useState(null)
  useEffect(() => {
    axios.get('/api/mpesa/config').then(r => setMpesaConfig(r.data)).catch(() => {})
  }, [])

  // Maintenance requests
  const [maintenanceRequests, setMaintenanceRequests] = useState([])
  const [maintenanceLoading, setMaintenanceLoading]   = useState(false)
  const [showMaintForm, setShowMaintForm]             = useState(false)
  const [submittingMaint, setSubmittingMaint]         = useState(false)
  const [newRequest, setNewRequest] = useState({ title: '', description: '', priority: 'medium', photo: '' })

  useEffect(() => {
    axios.get('/api/applications/my-applications')
      .then(r => setApplications(r.data))
      .catch(() => toast.error('Failed to load applications'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'payments' && payments.length === 0) {
      setPaymentsLoading(true)
      axios.get('/api/payments/my-payments')
        .then(r => setPayments(r.data))
        .catch(() => toast.error('Failed to load payments'))
        .finally(() => setPaymentsLoading(false))
    }
  }, [tab])

  useEffect(() => {
    if (tab === 'maintenance' && maintenanceRequests.length === 0) {
      setMaintenanceLoading(true)
      axios.get('/api/maintenance/my-requests')
        .then(r => setMaintenanceRequests(r.data))
        .catch(() => toast.error('Failed to load maintenance requests'))
        .finally(() => setMaintenanceLoading(false))
    }
  }, [tab])

  const withdraw = async (appId) => {
    try {
      await axios.delete(`/api/applications/${appId}`)
      setApplications(prev => prev.filter(a => a._id !== appId))
      toast.success('Application withdrawn')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to withdraw')
    }
  }

  const savePhone = async () => {
    setSavingPhone(true)
    try {
      const { data } = await axios.put('/api/users/profile', { phone: phoneInput })
      if (setUser) setUser(data.user)
      setEditingPhone(false)
      toast.success('Phone number saved!')
    } catch {
      toast.error('Failed to save phone number')
    } finally {
      setSavingPhone(false)
    }
  }

  const payViaMpesa = async (payment) => {
    if (!user?.phone) {
      toast.error('Please add your phone number first to use M-Pesa')
      setEditingPhone(true)
      return
    }
    setStkLoading(payment._id)
    try {
      const amount = payment.property?.rentPerMonth || payment.amount
      const { data } = await axios.post('/api/mpesa/stkpush', {
        propertyId: payment.property?._id,
        amount,
      })
      toast.success(data.message, { duration: 6000 })
    } catch (err) {
      toast.error(err.response?.data?.message || 'M-Pesa request failed')
    } finally {
      setStkLoading(null)
    }
  }

  if (loading) return <PageSpinner />

  const activeHome = applications.find(a => a.status === 'approved')
  const pending    = applications.filter(a => a.status === 'pending').length

  const submitMaintenance = async (e) => {
    e.preventDefault()
    if (!activeHome) return
    setSubmittingMaint(true)
    try {
      const { data } = await axios.post('/api/maintenance', {
        propertyId:  activeHome.property?._id,
        title:       newRequest.title,
        description: newRequest.description,
        priority:    newRequest.priority,
        photo:       newRequest.photo,
      })
      setMaintenanceRequests(prev => [data, ...prev])
      setNewRequest({ title: '', description: '', priority: 'medium', photo: '' })
      setShowMaintForm(false)
      toast.success('Maintenance request submitted!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request')
    } finally {
      setSubmittingMaint(false)
    }
  }

  const deleteMaintRequest = async (id) => {
    try {
      await axios.delete(`/api/maintenance/${id}`)
      setMaintenanceRequests(prev => prev.filter(r => r._id !== id))
      toast.success('Request deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const TABS = [
    { key: 'applications', label: 'Applications', count: applications.length },
    { key: 'payments',     label: 'Payments',     count: payments.length },
    ...(activeHome ? [{ key: 'maintenance', label: 'Repairs', count: maintenanceRequests.filter(r => r.status !== 'resolved').length }] : []),
  ]

  return (
    <div className="space-y-5">
      {/* Active tenancy hero card */}
      {activeHome && (
        <motion.div
          variants={fadeIn} initial="hidden" animate="show"
          className="rounded-2xl bg-gradient-to-br from-[#2c1a0e] to-[#7c4a1e] text-white p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
        >
          <div className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <KeyRound className="h-6 w-6 text-[#d4a843]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/60 font-medium uppercase tracking-wide mb-0.5">Your Current Home</p>
            <p className="font-bold text-lg leading-tight">{activeHome.property?.title}</p>
            <p className="text-sm text-white/70 mt-0.5">
              {activeHome.property?.address?.city} · KES {activeHome.property?.rentPerMonth?.toLocaleString()}/mo
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-sm shrink-0 min-w-[160px]">
            <p className="text-white/60 text-xs mb-0.5">Landlord</p>
            <p className="font-semibold">{activeHome.landlord?.name}</p>
            <p className="text-white/60 text-xs">{activeHome.landlord?.email}</p>
          </div>
        </motion.div>
      )}

      {/* How to pay rent through the M-Pesa Paybill */}
      {activeHome?.accountNumber && (
        <Card className="border-[#4bb543]/40">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="h-9 w-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                <Smartphone className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Pay rent with M-Pesa</p>
                <p className="text-sm text-muted-foreground">
                  M-Pesa → Lipa na M-Pesa → Pay Bill. Enter the business number and your account number below.
                  Your payment is recorded automatically and you get an SMS receipt.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 shrink-0 text-center">
                <div className="rounded-lg bg-muted px-4 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Business no.</p>
                  <p className="font-mono font-bold">{mpesaConfig?.paybill || '—'}</p>
                </div>
                <div className="rounded-lg bg-muted px-4 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Account no.</p>
                  <p className="font-mono font-bold">{activeHome.accountNumber}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phone number card (needed for M-Pesa + WhatsApp receipts) */}
      <Card className={`border ${!user?.phone ? 'border-amber-400/60 bg-amber-50/30' : ''}`}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
              user?.phone ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <Smartphone className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium">M-Pesa / WhatsApp Number</p>
              {!editingPhone
                ? <p className={`text-sm font-semibold ${user?.phone ? 'text-foreground' : 'text-amber-600'}`}>
                    {user?.phone || 'Not set — required for M-Pesa payments &amp; receipts'}
                  </p>
                : <div className="flex gap-2 mt-1">
                    <Input
                      value={phoneInput}
                      onChange={e => setPhoneInput(e.target.value)}
                      placeholder="0712 345 678"
                      className="text-sm h-8"
                    />
                    <Button size="sm" className="bg-[#7c4a1e] hover:bg-[#7c4a1e]/90 h-8 px-3" onClick={savePhone} disabled={savingPhone}>
                      {savingPhone ? '…' : 'Save'}
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 px-3" onClick={() => setEditingPhone(false)}>Cancel</Button>
                  </div>
              }
            </div>
            {!editingPhone && (
              <button onClick={() => { setPhoneInput(user?.phone || ''); setEditingPhone(true) }}
                className="shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {TABS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
              ${tab === key ? 'border-[#7c4a1e] text-[#7c4a1e]' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {label}
            {count > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold
                ${tab === key ? 'bg-[#7c4a1e]/10 text-[#7c4a1e]' : 'bg-muted text-muted-foreground'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Applications tab ── */}
      {tab === 'applications' && (
        applications.length === 0
          ? <EmptyState icon={<ClipboardList className="h-10 w-10" />} message="No applications yet" sub="Browse properties and apply for a place to stay" />
          : <div className="space-y-4">
              {applications.map(a => <TenantAppCard key={a._id} a={a} onWithdraw={withdraw} />)}
            </div>
      )}

      {/* ── Payments tab ── */}
      {tab === 'payments' && (
        paymentsLoading
          ? <PageSpinner />
          : payments.length === 0
            ? <EmptyState icon={<Banknote className="h-10 w-10" />} message="No payment records yet" sub="Your landlord will log payment records here once you move in" />
            : <div className="space-y-2">
                {/* Summary strip */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Card>
                    <CardContent className="pt-3 pb-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
                      <p className="font-bold text-green-600">
                        KES {payments.reduce((s, p) => s + paidOf(p), 0).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-3 pb-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
                      <p className="font-bold text-amber-600">
                        KES {(() => {
                          // Per month: rent expected − amount paid that month
                          const groups = {}
                          const thisMonthKey = new Date().toISOString().slice(0, 7)
                          payments.forEach(p => {
                            const key = new Date(p.month).toISOString().slice(0, 7)
                            if (key > thisMonthKey) return // prepaid future months are not owed yet
                            if (!groups[key]) groups[key] = { rent: p.property?.rentPerMonth || 0, paid: 0 }
                            groups[key].paid += paidOf(p)
                          })
                          return Object.values(groups).reduce((s, g) => s + Math.max(0, g.rent - g.paid), 0).toLocaleString()
                        })()}
                      </p>
                    </CardContent>
                  </Card>
                </div>
                {payments.map(p => (
                  <div key={p._id} className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {new Date(p.month).toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{p.property?.title}</p>
                      {p.notes && <p className="text-xs italic text-muted-foreground">{p.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className={`font-bold text-sm ${p.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                          {amountText(p)}
                        </p>
                        <Badge variant={p.status === 'paid' ? 'success' : 'warning'} className="capitalize text-[10px] mt-0.5">
                          {paymentLabel(p)}
                        </Badge>
                      </div>
                      {p.status !== 'paid' && (
                        <Button
                          size="sm"
                          className="bg-[#4bb543] hover:bg-[#3da037] text-white text-xs h-8 px-2.5 shrink-0"
                          onClick={() => payViaMpesa(p)}
                          disabled={stkLoading === p._id}
                        >
                          <Smartphone className="h-3 w-3 mr-1" />
                          {stkLoading === p._id ? 'Sending…' : 'Pay M-Pesa'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
      )}

      {/* ── Maintenance tab ── */}
      {tab === 'maintenance' && (
        maintenanceLoading
          ? <PageSpinner />
          : (
            <div className="space-y-4">
              {/* Submit button / form toggle */}
              {!showMaintForm ? (
                <Button
                  className="bg-[#7c4a1e] hover:bg-[#6b3f19] text-white"
                  onClick={() => setShowMaintForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" /> New Request
                </Button>
              ) : (
                <Card className="border-[#7c4a1e]/30">
                  <CardHeader className="pb-3 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-[#7c4a1e]" /> Report an Issue
                      </CardTitle>
                      <button onClick={() => setShowMaintForm(false)} className="p-1 rounded hover:bg-muted">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <form onSubmit={submitMaintenance} className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Title *</Label>
                        <Input
                          required
                          placeholder="e.g. Leaking pipe in bathroom"
                          value={newRequest.title}
                          onChange={e => setNewRequest(p => ({ ...p, title: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Description *</Label>
                        <Textarea
                          required
                          rows={3}
                          placeholder="Describe the issue in detail…"
                          value={newRequest.description}
                          onChange={e => setNewRequest(p => ({ ...p, description: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Priority</Label>
                          <Select
                            value={newRequest.priority}
                            onChange={e => setNewRequest(p => ({ ...p, priority: e.target.value }))}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High — Urgent</option>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Photo URL (optional)</Label>
                          <Input
                            placeholder="https://..."
                            value={newRequest.photo}
                            onChange={e => setNewRequest(p => ({ ...p, photo: e.target.value }))}
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="bg-[#7c4a1e] hover:bg-[#6b3f19] text-white w-full"
                        disabled={submittingMaint}
                      >
                        {submittingMaint ? 'Submitting…' : 'Submit Request'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Request list */}
              {maintenanceRequests.length === 0 && !showMaintForm && (
                <EmptyState
                  icon={<Wrench className="h-10 w-10" />}
                  message="No maintenance requests yet"
                  sub="Use the button above to report an issue to your landlord"
                />
              )}

              {maintenanceRequests.map(r => {
                const PRIORITY_STYLE = {
                  low:    'bg-green-100 text-green-700',
                  medium: 'bg-amber-100 text-amber-700',
                  high:   'bg-red-100 text-red-600',
                }
                const STATUS_STYLE = {
                  'open':        'bg-red-100 text-red-600',
                  'in-progress': 'bg-amber-100 text-amber-700',
                  'resolved':    'bg-green-100 text-green-700',
                }
                return (
                  <Card key={r._id} className={r.status === 'resolved' ? 'opacity-70' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-sm">{r.title}</p>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_STYLE[r.priority]}`}>
                              {r.priority}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[r.status]}`}>
                              {r.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-sm text-foreground/80">{r.description}</p>
                          {r.photo && (
                            <img src={r.photo} alt="issue" className="mt-2 rounded-lg w-full max-h-40 object-cover border" />
                          )}
                          {r.landlordNote && (
                            <div className="mt-2 bg-[#7c4a1e]/5 border border-[#7c4a1e]/20 rounded-lg px-3 py-2">
                              <p className="text-xs text-[#7c4a1e]">
                                <span className="font-semibold">Landlord:</span> {r.landlordNote}
                              </p>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteMaintRequest(r._id)}
                          className="shrink-0 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )
      )}
    </div>
  )
}

// Timeline card for a single application

const STEPS = [
  { key: 'applied',   label: 'Applied',      Icon: ClipboardList },
  { key: 'review',    label: 'Under Review',  Icon: Clock },
  { key: 'decision',  label: 'Decision',      Icon: CheckCircle2 },
]

function TenantAppCard({ a, onWithdraw }) {
  const stepIndex = a.status === 'pending' ? 1 : 2

  const stepColor = (idx) => {
    if (idx < stepIndex) return 'bg-[#7c4a1e] text-white border-[#7c4a1e]'
    if (idx === stepIndex) {
      if (a.status === 'approved') return 'bg-green-600 text-white border-green-600'
      if (a.status === 'rejected') return 'bg-red-500 text-white border-red-500'
      return 'bg-[#7c4a1e] text-white border-[#7c4a1e]'
    }
    return 'bg-muted text-muted-foreground border-border'
  }

  const lineColor = (idx) => idx < stepIndex ? 'bg-[#7c4a1e]' : 'bg-border'

  const img = a.property?.images?.[0]

  return (
    <Card className={`overflow-hidden ${a.status === 'approved' ? 'border-green-200' : a.status === 'rejected' ? 'border-red-200' : ''}`}>
      <CardContent className="pt-0 pb-0">
        {/* Property thumbnail + info row */}
        <div className="flex gap-0">
          <div className="shrink-0 w-20 h-20 relative overflow-hidden rounded-l-lg">
            {img
              ? <img src={img} alt={a.property?.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-[#2c1a0e] to-[#7c4a1e]/60 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white/30" />
                </div>
            }
          </div>
          <div className="flex-1 min-w-0 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-tight line-clamp-1">{a.property?.title}</p>
                <p className="text-xs text-muted-foreground">{a.property?.address?.city} · KES {a.property?.rentPerMonth?.toLocaleString()}/mo</p>
                <p className="text-xs text-muted-foreground">Landlord: {a.landlord?.name}</p>
              </div>
              <p className="text-xs text-muted-foreground shrink-0 mt-0.5">{new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="px-4 py-3 border-t">
          <div className="flex items-center">
            {STEPS.map(({ key, label, Icon }, idx) => {
              const isDecision = key === 'decision'
              const DecisionIcon = a.status === 'rejected' ? XCircle : CheckCircle2
              return (
                <div key={key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center transition-colors ${stepColor(idx)}`}>
                      {isDecision
                        ? <DecisionIcon className="h-3.5 w-3.5" />
                        : <Icon className="h-3.5 w-3.5" />
                      }
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 text-center leading-tight max-w-[52px]">
                      {isDecision && a.status !== 'pending'
                        ? <span className={`font-semibold ${a.status === 'approved' ? 'text-green-600' : 'text-red-500'} capitalize`}>{a.status}</span>
                        : label
                      }
                    </p>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 mb-3 transition-colors ${lineColor(idx)}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Landlord reply */}
        {a.landlordMessage && (
          <div className="mx-4 mb-3 bg-[#7c4a1e]/5 border border-[#7c4a1e]/20 rounded-lg p-3">
            <p className="text-xs font-medium text-[#7c4a1e] mb-1 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Landlord replied
            </p>
            <p className="text-sm">"{a.landlordMessage}"</p>
          </div>
        )}

        {/* Withdraw */}
        {a.status === 'pending' && (
          <div className="px-4 pb-3">
            <Button
              size="sm" variant="outline"
              className="text-destructive border-destructive hover:bg-destructive hover:text-white"
              onClick={() => onWithdraw(a._id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Withdraw
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default DashboardPage
