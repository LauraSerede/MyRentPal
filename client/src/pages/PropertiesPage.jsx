import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea, Label } from '../components/ui/Input'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { PageSpinner } from '../components/ui/Spinner'
import {
  BedDouble, Bath, MapPin, User, Search, X, Send,
  ImageIcon, ChevronRight, Check, Building2,
} from 'lucide-react'
import toast from 'react-hot-toast'

const PROPERTY_TYPES = ['', 'apartment', 'house', 'studio', 'bedsitter', 'commercial']

//  Property Detail Modal 
function PropertyDetailModal({ property: p, applied, onApply, onClose }) {
  const [tab, setTab] = useState('details')
  const imgs = p.images?.filter(Boolean) || []

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
        <motion.div
          className="bg-background w-full max-w-3xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 24 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
        >
          {/* Top bar */}
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b shrink-0">
            <div className="min-w-0">
              <h2 className="font-bold text-xl leading-tight line-clamp-1">{p.title}</h2>
              <div className="flex items-center gap-1 text-muted-foreground text-sm mt-0.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {p.address.street}, {p.address.city}, {p.address.state}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {applied ? (
                <Badge variant="success" className="text-sm px-3 py-1">Applied </Badge>
              ) : (
                <Button size="sm" className="bg-[#7c4a1e] hover:bg-[#7c4a1e]/90 px-4" onClick={onApply}>
                  Apply Now
                </Button>
              )}
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Hero image */}
          <div className="h-52 sm:h-64 shrink-0 relative bg-gradient-to-br from-[#2c1a0e] to-[#7c4a1e]/60 overflow-hidden">
            {imgs[0]
              ? <img src={imgs[0]} alt={p.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <ImageIcon className="h-10 w-10 text-white/20" />
                  <p className="text-white/40 text-sm">No photo yet</p>
                </div>
            }
            <div className="absolute bottom-3 left-4 bg-black/60 backdrop-blur-md text-white rounded-xl px-4 py-2">
              <span className="text-xl font-bold">KES {p.rentPerMonth.toLocaleString()}</span>
              <span className="text-white/70 text-sm">/mo</span>
            </div>
            <div className="absolute top-3 right-3">
              <Badge variant={p.isAvailable ? 'success' : 'secondary'} className="text-xs">
                {p.isAvailable ? ' Available Now' : 'Occupied'}
              </Badge>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b shrink-0 px-5">
            {['details', ...(imgs.length > 0 ? ['photos'] : [])].map(t => (
              <button
                key={t} onClick={() => setTab(t)}
                className={`capitalize px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors
                  ${tab === t ? 'border-[#7c4a1e] text-[#7c4a1e]' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {tab === 'details' && (
              <>
                {/* Key stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Bedrooms',  value: p.bedrooms },
                    { label: 'Bathrooms', value: p.bathrooms },
                    { label: 'Type',      value: p.propertyType },
                    { label: 'City',      value: p.address.city },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-muted/50 rounded-xl p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                      <p className="font-semibold text-sm capitalize">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <div>
                  <h3 className="font-semibold mb-2">About this property</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
                </div>

                {/* Features */}
                {p.features?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Features &amp; Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {p.features.map(f => (
                        <span key={f} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-[#7c4a1e]/10 text-[#7c4a1e] border border-[#7c4a1e]/20">
                          <Check className="h-3 w-3" />{f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Landlord */}
                <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/20">
                  <div className="h-10 w-10 rounded-full bg-[#7c4a1e]/15 flex items-center justify-center text-[#7c4a1e] font-bold text-sm shrink-0">
                    {p.landlord?.name?.[0]?.toUpperCase() || 'L'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">Listed by</p>
                    <p className="font-semibold text-sm">{p.landlord?.name}</p>
                    <p className="text-xs text-muted-foreground">{p.landlord?.email}</p>
                  </div>
                </div>
              </>
            )}

            {tab === 'photos' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {imgs.map((src, i) => (
                  <div key={i} className="aspect-video rounded-xl overflow-hidden bg-muted">
                    <img src={src} alt={`photo ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t shrink-0 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">{p.address.city}, {p.address.state}</p>
            {applied ? (
              <Badge variant="success" className="text-sm px-4 py-1.5">Applied </Badge>
            ) : (
              <Button className="bg-[#7c4a1e] hover:bg-[#7c4a1e]/90 px-6" onClick={onApply}>
                <Send className="h-4 w-4 mr-2" /> Apply for this Property
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </>
  )
}

//  Main Page 
function PropertiesPage() {
  const { token } = useAuth()
  const [searchParams] = useSearchParams()
  const [properties, setProperties]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [detailProperty, setDetailProperty] = useState(null)
  const [applyModal, setApplyModal]   = useState(null)
  const [applyMessage, setApplyMessage] = useState('')
  const [applySubmitting, setApplySubmitting] = useState(false)
  const [applied, setApplied]         = useState({})

  const [city, setCity]               = useState(() => searchParams.get('city') || '')
  const [propertyType, setPropertyType] = useState(() => searchParams.get('propertyType') || '')
  const [maxRent, setMaxRent]         = useState(() => searchParams.get('maxRent') || '')
  const [bedrooms, setBedrooms]       = useState(() => searchParams.get('bedrooms') || '')

  const showBedrooms = propertyType === 'apartment' || propertyType === 'house'

  const handleTypeChange = (e) => {
    const val = e.target.value
    setPropertyType(val)
    if (val !== 'apartment' && val !== 'house') setBedrooms('')
  }

  const fetchProperties = async () => {
    setLoading(true)
    try {
      const params = {}
      if (city) params.city = city
      if (propertyType) params.propertyType = propertyType
      if (maxRent) params.maxRent = maxRent
      if (bedrooms) params.bedrooms = bedrooms
      const { data } = await axios.get('/api/properties', { params })
      setProperties(data)
    } catch {
      toast.error('Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProperties() }, [])

  const openApply = (property) => {
    setDetailProperty(null)
    setApplyModal(property)
    setApplyMessage('')
  }

  const submitApply = async () => {
    setApplySubmitting(true)
    try {
      await axios.post(`/api/applications/${applyModal._id}`, { message: applyMessage })
      setApplied(prev => ({ ...prev, [applyModal._id]: true }))
      setApplyModal(null)
      toast.success('Application submitted!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply')
    } finally {
      setApplySubmitting(false)
    }
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-1">Available Properties</h2>
          <p className="text-muted-foreground">Browse and apply for listings across Kenya</p>
        </div>

        {/* Filters */}
        <form onSubmit={e => { e.preventDefault(); fetchProperties() }} className="flex flex-col sm:flex-row gap-3 mb-8 flex-wrap">
          <Input placeholder="City (e.g. Nairobi)" value={city} onChange={e => setCity(e.target.value)} className="sm:max-w-[200px]" />
          <Select value={propertyType} onChange={handleTypeChange} className="sm:max-w-[180px]">
            <option value="">All types</option>
            {PROPERTY_TYPES.filter(Boolean).map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </Select>
          {showBedrooms && (
            <Select value={bedrooms} onChange={e => setBedrooms(e.target.value)} className="sm:max-w-[160px]">
              <option value="">Bedrooms</option>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}{n===5?'+':''} Bedroom{n>1?'s':''}</option>)}
            </Select>
          )}
          <Input type="number" placeholder="Max rent (KES)" value={maxRent} onChange={e => setMaxRent(e.target.value)} className="sm:max-w-[180px]" />
          <Button type="submit" className="bg-[#7c4a1e] hover:bg-[#7c4a1e]/90 sm:w-auto">
            <Search className="h-4 w-4 mr-2" /> Search
          </Button>
        </form>

        {loading ? (
          <PageSpinner />
        ) : properties.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No properties found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          >
            {properties.map(p => {
              const img = p.images?.find(Boolean)
              return (
                <motion.div
                  key={p._id}
                  variants={{ hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: 'easeOut' } } }}
                >
                  <Card className="hover:shadow-xl transition-shadow h-full group overflow-hidden">
                    {/* Image */}
                    <div className="h-44 relative overflow-hidden cursor-pointer" onClick={() => setDetailProperty(p)}>
                      {img
                        ? <img src={img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        : <div className="w-full h-full bg-gradient-to-br from-[#2c1a0e] to-[#7c4a1e]/60 flex flex-col items-center justify-center gap-1">
                            <Building2 className="h-8 w-8 text-white/20" />
                            <span className="text-white/30 text-xs capitalize">{p.propertyType}</span>
                          </div>
                      }
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-[#2c1a0e] text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1">
                          View Details <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                      <div className="absolute top-2 left-2">
                        <Badge variant={p.isAvailable ? 'success' : 'secondary'} className="text-[10px]">
                          {p.isAvailable ? 'Available' : 'Occupied'}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-base leading-tight line-clamp-1">{p.title}</h3>
                        <Badge variant="secondary" className="shrink-0 capitalize text-[10px]">{p.propertyType}</Badge>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <MapPin className="h-3.5 w-3.5" />{p.address.city}, {p.address.state}
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> {p.bedrooms} bed</span>
                        <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" /> {p.bathrooms} bath</span>
                      </div>
                      <p className="text-[#7c4a1e] font-bold text-lg">
                        KES {p.rentPerMonth.toLocaleString()}<span className="text-muted-foreground font-normal text-sm">/mo</span>
                      </p>
                      {/* Feature pills preview */}
                      {p.features?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {p.features.slice(0, 3).map(f => (
                            <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-[#7c4a1e]/8 text-[#7c4a1e] border border-[#7c4a1e]/15">{f}</span>
                          ))}
                          {p.features.length > 3 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">+{p.features.length - 3} more</span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" /> {p.landlord?.name}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline" size="sm"
                          className="flex-1 border-[#7c4a1e]/30 text-[#7c4a1e] hover:bg-[#7c4a1e]/5"
                          onClick={() => setDetailProperty(p)}
                        >
                          View Details
                        </Button>
                        {!token ? (
                          <p className="text-xs text-muted-foreground self-center pl-1">Login to apply</p>
                        ) : applied[p._id] ? (
                          <Badge variant="success" className="self-center">Applied </Badge>
                        ) : (
                          <Button className="flex-1 bg-[#7c4a1e] hover:bg-[#7c4a1e]/90" size="sm" onClick={() => openApply(p)}>
                            Apply Now
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailProperty && (
          <PropertyDetailModal
            property={detailProperty}
            applied={!!applied[detailProperty._id]}
            onApply={() => openApply(detailProperty)}
            onClose={() => setDetailProperty(null)}
          />
        )}
      </AnimatePresence>

      {/* Apply Modal */}
      <AnimatePresence>
        {applyModal && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setApplyModal(null)} />
            <motion.div
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-background w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
                initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              >
                <div className="flex items-start justify-between p-5 border-b">
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{applyModal.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {applyModal.address.city}  KES {applyModal.rentPerMonth.toLocaleString()}/mo  {applyModal.bedrooms} bed
                    </p>
                  </div>
                  <button onClick={() => setApplyModal(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors ml-3 shrink-0">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label>Message to landlord <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Textarea
                      placeholder="Introduce yourself  mention your occupation, when you would like to move in, or any questions about the property..."
                      value={applyMessage}
                      onChange={e => setApplyMessage(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">A personal message significantly increases your chances of approval.</p>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setApplyModal(null)} disabled={applySubmitting}>Cancel</Button>
                    <Button className="flex-1 bg-[#7c4a1e] hover:bg-[#7c4a1e]/90" onClick={submitApply} disabled={applySubmitting}>
                      <Send className="h-4 w-4 mr-2" />
                      {applySubmitting ? 'Submitting...' : 'Submit Application'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default PropertiesPage
