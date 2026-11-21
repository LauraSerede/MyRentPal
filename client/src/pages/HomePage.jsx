import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { Building2, Search, ShieldCheck, Users, MapPin, Home, Banknote, BedDouble } from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
}

function HomePage() {
  const [city, setCity] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [maxRent, setMaxRent] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const navigate = useNavigate()

  const showBedrooms = propertyType === 'apartment' || propertyType === 'house'

  const handleTypeChange = (e) => {
    const val = e.target.value
    setPropertyType(val)
    if (val !== 'apartment' && val !== 'house') setBedrooms('')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (city) params.set('city', city)
    if (propertyType) params.set('propertyType', propertyType)
    if (maxRent) params.set('maxRent', maxRent)
    if (bedrooms) params.set('bedrooms', bedrooms)
    navigate(`/properties?${params.toString()}`)
  }

  return (
    <div>
      {/* ── Hero ── */}
      <section
        className="relative flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/apartmentimg.png')" }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/55" />

        {/* Headline */}
        <motion.div
          className="relative z-10 text-center px-6 max-w-4xl mx-auto mb-10"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight mb-5 drop-shadow-lg">
            A Better Life Starts<br />with the Right Home
          </h1>
          <p className="text-white/75 text-base sm:text-xl mb-8 drop-shadow">
            Discover verified rentals across Kenya with{' '}
            <span className="text-[#d4a843] font-semibold">MyRentPal</span>.
          </p>
          <Link to="/properties">
            <Button
              size="lg"
              className="rounded-full px-8 bg-white text-[#2c1a0e] hover:bg-white/90 font-semibold shadow-lg text-base"
            >
              Explore Properties
            </Button>
          </Link>
        </motion.div>

        {/* Floating search bar */}
        <motion.form
          onSubmit={handleSearch}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
          className="relative z-10 bg-white rounded-2xl shadow-2xl flex flex-col sm:flex-row w-full max-w-3xl mx-4 sm:mx-6 lg:mx-auto overflow-hidden border border-white/20"
        >
          <div className="flex items-center gap-2 px-5 py-4 flex-1 border-b sm:border-b-0 sm:border-r border-gray-100">
            <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="City (e.g. Nairobi)"
              value={city}
              onChange={e => setCity(e.target.value)}
              className="outline-none text-sm w-full bg-transparent placeholder-gray-400 text-gray-700"
            />
          </div>
          <div className="flex items-center gap-2 px-5 py-4 flex-1 border-b sm:border-b-0 sm:border-r border-gray-100">
            <Home className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <select
              value={propertyType}
              onChange={handleTypeChange}
              className="outline-none text-sm w-full bg-transparent text-gray-500 appearance-none cursor-pointer"
            >
              <option value="">Property Type</option>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="studio">Studio</option>
              <option value="bedsitter">Bedsitter</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>
          {showBedrooms && (
            <div className="flex items-center gap-2 px-5 py-4 flex-1 border-b sm:border-b-0 sm:border-r border-gray-100">
              <BedDouble className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <select
                value={bedrooms}
                onChange={e => setBedrooms(e.target.value)}
                className="outline-none text-sm w-full bg-transparent text-gray-500 appearance-none cursor-pointer"
              >
                <option value="">Bedrooms</option>
                <option value="1">1 Bedroom</option>
                <option value="2">2 Bedrooms</option>
                <option value="3">3 Bedrooms</option>
                <option value="4">4 Bedrooms</option>
                <option value="5">5+ Bedrooms</option>
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 px-5 py-4 flex-1 border-b sm:border-b-0 sm:border-r border-gray-100">
            <Banknote className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <select
              value={maxRent}
              onChange={e => setMaxRent(e.target.value)}
              className="outline-none text-sm w-full bg-transparent text-gray-500 appearance-none cursor-pointer"
            >
              <option value="">Max Rent (KES)</option>
              <option value="10000">10,000</option>
              <option value="20000">20,000</option>
              <option value="30000">30,000</option>
              <option value="50000">50,000</option>
              <option value="100000">100,000</option>
              <option value="200000">200,000+</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-[#2c1a0e] text-white px-7 py-4 text-sm font-semibold hover:bg-[#7c4a1e] transition-colors sm:rounded-none rounded-b-2xl"
          >
            Find Properties
          </button>
        </motion.form>
      </section>

      {/* ── Feature Cards ── */}
      <motion.section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-3 gap-6 py-16"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
      >
        <motion.div variants={fadeUp}>
        <Card>
          <CardContent className="pt-6 text-center">
            <Search className="h-10 w-10 text-[#7c4a1e] mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-1">Browse Listings</h3>
            <p className="text-muted-foreground text-sm">Filter by city, type, and budget to find the perfect place.</p>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div variants={fadeUp}>
        <Card>
          <CardContent className="pt-6 text-center">
            <ShieldCheck className="h-10 w-10 text-[#7c4a1e] mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-1">Apply Instantly</h3>
            <p className="text-muted-foreground text-sm">Submit rental applications directly to landlords in seconds.</p>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div variants={fadeUp}>
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="h-10 w-10 text-[#7c4a1e] mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-1">Manage Everything</h3>
            <p className="text-muted-foreground text-sm">Landlords and tenants each get a role-specific dashboard.</p>
          </CardContent>
        </Card>
        </motion.div>
      </motion.section>

      {/* ── CTA Banner ── */}
      <motion.section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16"
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className="rounded-2xl bg-[#2c1a0e] text-white text-center py-14 px-6">
          <Building2 className="h-12 w-12 text-[#d4a843] mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-2">Are you a landlord?</h2>
          <p className="text-white/60 mb-6">List your properties and start receiving tenant applications today.</p>
          <Link to="/register">
            <Button size="lg" className="bg-[#d4a843] hover:bg-[#d4a843]/90 text-[#2c1a0e] font-semibold rounded-full px-8">
              List a Property
            </Button>
          </Link>
        </div>
      </motion.section>
    </div>
  )
}

export default HomePage
