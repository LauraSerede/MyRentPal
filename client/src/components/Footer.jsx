import { Link } from 'react-router-dom'
import { Home, Building2, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer style={{ backgroundColor: '#2c1a0e' }} className="text-stone-300 mt-auto">
      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

        {/* Column 1 — Brand */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: '#d4a843' }}>
              <Home className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">MyRentPal</span>
          </div>
          <p className="text-sm text-stone-400 leading-relaxed">
            Kenya's trusted rental management platform. Connecting landlords and tenants with ease, transparency, and reliability.
          </p>
          {/* Social icons */}
          <div className="flex items-center gap-3 mt-2">
            {[
              { Icon: Facebook, href: '#' },
              { Icon: Twitter, href: '#' },
              { Icon: Instagram, href: '#' },
              { Icon: Linkedin, href: '#' },
            ].map(({ Icon, href }, i) => (
              <a
                key={i}
                href={href}
                className="w-8 h-8 rounded-full border border-stone-600 flex items-center justify-center text-stone-400 hover:border-amber-500 hover:text-amber-400 transition-colors"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Column 2 — Quick Links */}
        <div>
          <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-widest">Quick Links</h3>
          <ul className="flex flex-col gap-2">
            {[
              { label: 'Home', to: '/' },
              { label: 'Browse Properties', to: '/properties' },
              { label: 'Login', to: '/login' },
              { label: 'Create Account', to: '/register' },
              { label: 'My Dashboard', to: '/dashboard' },
            ].map(({ label, to }) => (
              <li key={label}>
                <Link
                  to={to}
                  className="text-sm text-stone-400 hover:text-amber-400 transition-colors flex items-center gap-1 group"
                >
                  <span className="inline-block w-0 group-hover:w-2 overflow-hidden transition-all duration-200 text-amber-400">›</span>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3 — For Landlords / Tenants */}
        <div>
          <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-widest">Platform</h3>
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">For Landlords</p>
              <ul className="flex flex-col gap-1.5 text-sm text-stone-400">
                <li>List &amp; manage properties</li>
                <li>Review tenant applications</li>
                <li>Track rent &amp; payments</li>
                <li>Message tenants directly</li>
              </ul>
            </div>
            <div>
              <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">For Tenants</p>
              <ul className="flex flex-col gap-1.5 text-sm text-stone-400">
                <li>Search available rentals</li>
                <li>Apply with a personal message</li>
                <li>Track your application status</li>
                <li>View your payment history</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Column 4 — Contact */}
        <div>
          <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-widest">Contact</h3>
          <ul className="flex flex-col gap-3">
            <li className="flex items-start gap-3 text-sm text-stone-400">
              <MapPin className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <span>Nairobi, Kenya</span>
            </li>
            <li className="flex items-center gap-3 text-sm text-stone-400">
              <Phone className="w-4 h-4 text-amber-400 shrink-0" />
              <a href="tel:+254700000000" className="hover:text-amber-400 transition-colors">+254 700 000 000</a>
            </li>
            <li className="flex items-center gap-3 text-sm text-stone-400">
              <Mail className="w-4 h-4 text-amber-400 shrink-0" />
              <a href="mailto:hello@myrentpal.co.ke" className="hover:text-amber-400 transition-colors">hello@myrentpal.co.ke</a>
            </li>
          </ul>

          {/* Newsletter mini-form */}
          <div className="mt-6">
            <p className="text-xs text-stone-400 mb-2">Get rental tips &amp; updates</p>
            <form onSubmit={e => e.preventDefault()} className="flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 min-w-0 text-xs px-3 py-2 rounded-md bg-stone-800 border border-stone-700 text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-md text-xs font-semibold text-white transition-colors"
                style={{ backgroundColor: '#d4a843' }}
              >
                Join
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-500">
          <span>© {year} MyRentPal. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-amber-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-amber-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-amber-400 transition-colors">Support</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
