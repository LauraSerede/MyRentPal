import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Input, Label, Select } from '../components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import toast from 'react-hot-toast'
import { Building2 } from 'lucide-react'

function RegisterPage() {
  const { register, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'tenant', phone: '' })

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await register(form.name, form.email, form.password, form.role, form.phone)
      toast.success('Account created! Welcome to MyRentPal.')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <Building2 className="h-10 w-10 text-[#7c4a1e] mx-auto mb-2" />
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>Join MyRentPal as a tenant or landlord</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" placeholder="John Doe" value={form.name} onChange={handleChange} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">
                Phone Number
                <span className="text-muted-foreground font-normal text-xs ml-1">(for M-Pesa &amp; WhatsApp receipts)</span>
              </Label>
              <Input id="phone" name="phone" type="tel" placeholder="0712 345 678" value={form.phone} onChange={handleChange} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">I am a…</Label>
              <Select id="role" name="role" value={form.role} onChange={handleChange}>
                <option value="tenant">Tenant — looking for a place to rent</option>
                <option value="landlord">Landlord — I have property to list</option>
              </Select>
            </div>
            <Button type="submit" className="w-full bg-[#7c4a1e] hover:bg-[#7c4a1e]/90" disabled={loading}>
              {loading ? <Spinner className="mr-2" /> : null}
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-[#7c4a1e] hover:underline font-medium">Login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default RegisterPage
