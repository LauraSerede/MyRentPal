import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from './ui/Button'
import { Home, LogOut, LayoutDashboard, Building2, Menu, X, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/')
    setMenuOpen(false)
  }

  const close = () => setMenuOpen(false)

  return (
    <nav
      className="sticky top-0 z-50 w-full border-b text-white shadow-md"
      style={{
        backgroundImage: "url('/woodimg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/45 z-0" />

      {/* ── Top bar ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" onClick={close} className="flex items-center gap-2 text-xl font-bold text-[#d4a843] hover:opacity-90">
          <Building2 className="h-6 w-6" />
          MyRentPal
        </Link>

        {/* Desktop links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-white/10">
              <Home className="h-4 w-4 mr-1" /> Home
            </Button>
          </Link>
          <Link to="/properties">
            <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-white/10">
              Properties
            </Button>
          </Link>
          {user ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-white/10">
                  <LayoutDashboard className="h-4 w-4 mr-1" /> Dashboard
                </Button>
              </Link>
              <span className="text-sm text-white/50 hidden lg:block">Hi, {user.name}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-white border-white/30 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4 mr-1" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-white/10">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="bg-[#7c4a1e] hover:bg-[#7c4a1e]/90">
                  Register
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Hamburger — visible on mobile only */}
        <button
          className="md:hidden relative z-10 p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* ── Mobile dropdown menu ── */}
      {menuOpen && (
        <div className="relative z-10 md:hidden border-t border-white/10 bg-black/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
            <Link to="/" onClick={close}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-colors">
              <span className="flex items-center gap-2"><Home className="h-4 w-4" /> Home</span>
              <ChevronRight className="h-4 w-4 text-white/40" />
            </Link>
            <Link to="/properties" onClick={close}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-colors">
              <span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Properties</span>
              <ChevronRight className="h-4 w-4 text-white/40" />
            </Link>

            {user ? (
              <>
                <Link to="/dashboard" onClick={close}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-colors">
                  <span className="flex items-center gap-2"><LayoutDashboard className="h-4 w-4" /> Dashboard</span>
                  <ChevronRight className="h-4 w-4 text-white/40" />
                </Link>
                <div className="border-t border-white/10 my-1" />
                <div className="px-3 py-1.5 text-xs text-white/50">Signed in as {user.name}</div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-white/10 transition-colors w-full text-left"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </>
            ) : (
              <>
                <div className="border-t border-white/10 my-1" />
                <Link to="/login" onClick={close}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-colors">
                  <span>Login</span>
                  <ChevronRight className="h-4 w-4 text-white/40" />
                </Link>
                <Link to="/register" onClick={close}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium bg-[#7c4a1e] text-white hover:bg-[#7c4a1e]/90 transition-colors">
                  <span>Register</span>
                  <ChevronRight className="h-4 w-4 text-white/40" />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar
