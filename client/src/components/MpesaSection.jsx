import { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Smartphone, Send, ChevronDown, ChevronUp, AlertCircle, FlaskConical, Hash } from 'lucide-react'
import { Button } from './ui/Button'
import { Input, Select, Label } from './ui/Input'
import { Card, CardContent } from './ui/Card'
import { Badge } from './ui/Badge'
import { PageSpinner } from './ui/Spinner'

const ksh = (n) => `KES ${Math.round(Number(n) || 0).toLocaleString()}`
const when = (d) => (d ? new Date(d).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : '')

const STATUS_BADGE = {
  matched:    { variant: 'success', label: 'Recorded' },
  unmatched:  { variant: 'warning', label: 'Needs assigning' },
  processing: { variant: 'secondary', label: 'Processing' },
  received:   { variant: 'secondary', label: 'Received' },
}
const RECEIPT_BADGE = {
  sent:    { variant: 'success', label: 'SMS sent' },
  failed:  { variant: 'danger', label: 'SMS failed' },
  skipped: { variant: 'secondary', label: 'SMS not sent' },
}

// Landlord page: Paybill payments, tenant account numbers, receipts and a test simulator.
export default function MpesaSection({ applications, onPaymentsChanged }) {
  const [config, setConfig]         = useState(null)
  const [txs, setTxs]               = useState([])
  const [loading, setLoading]       = useState(true)
  const [sim, setSim]               = useState({ accountNumber: '', amount: '' })
  const [simulating, setSimulating] = useState(false)
  const [assignTo, setAssignTo]     = useState({}) // transaction id -> application id
  const [expanded, setExpanded]     = useState(null)

  const tenancies = applications.filter((a) => a.status === 'approved' && a.accountNumber)

  const load = () =>
    Promise.all([axios.get('/api/mpesa/config'), axios.get('/api/mpesa/transactions')])
      .then(([c, t]) => { setConfig(c.data); setTxs(t.data) })
      .catch(() => toast.error('Failed to load M-Pesa payments'))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const afterChange = async () => {
    await load()
    onPaymentsChanged?.()
  }

  const simulate = async (e) => {
    e.preventDefault()
    setSimulating(true)
    try {
      const { data } = await axios.post('/api/mpesa/c2b/simulate', sim)
      if (data.mode === 'local') {
        const t = data.transaction
        if (t.status === 'matched') toast.success(`${ksh(t.amount)} recorded for ${t.tenancy?.accountNumber}`)
        else toast(`No tenancy has account "${t.billRef}". It is waiting below for you to assign.`, { icon: '⚠️' })
      } else {
        toast.success(data.message, { duration: 6000 })
      }
      setSim((s) => ({ ...s, amount: '' }))
      await afterChange()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Simulation failed')
    } finally {
      setSimulating(false)
    }
  }

  const assign = async (txId) => {
    const applicationId = assignTo[txId]
    if (!applicationId) return toast.error('Choose a tenant first')
    try {
      await axios.post(`/api/mpesa/transactions/${txId}/assign`, { applicationId })
      toast.success('Payment recorded and receipt sent')
      await afterChange()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not assign payment')
    }
  }

  const resend = async (txId) => {
    try {
      const { data } = await axios.post(`/api/mpesa/transactions/${txId}/resend-receipt`)
      if (data.status === 'sent') toast.success('Receipt sent')
      else toast.error(`Receipt not sent: ${data.error || data.status}`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend receipt')
    }
  }

  if (loading) return <PageSpinner />

  const now = new Date()
  const matched = txs.filter((t) => t.status === 'matched')
  const unmatched = txs.filter((t) => t.status === 'unmatched')
  const thisMonth = matched.filter((t) => {
    const d = new Date(t.transTime || t.createdAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const canSimulate = config?.simulator || config?.environment === 'sandbox'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-xl font-semibold">M-Pesa Paybill</h3>
          <p className="text-sm text-muted-foreground">
            Tenants pay to Paybill <span className="font-mono font-semibold text-foreground">{config?.paybill || 'not set'}</span> using
            their account number. Payments are recorded automatically and tenants get an SMS receipt.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={config?.environment === 'production' ? 'success' : 'secondary'} className="capitalize">{config?.environment}</Badge>
          <Badge variant={config?.smsConfigured ? 'success' : 'warning'}>{config?.smsConfigured ? 'SMS on' : 'SMS not set up'}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground mb-1">Received this month</p>
          <p className="text-xl font-bold text-green-600">{ksh(thisMonth.reduce((s, t) => s + t.amount, 0))}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground mb-1">Payments this month</p>
          <p className="text-xl font-bold text-[#7c4a1e]">{thisMonth.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground mb-1">Need assigning</p>
          <p className={`text-xl font-bold ${unmatched.length ? 'text-amber-600' : 'text-muted-foreground'}`}>{unmatched.length}</p>
        </CardContent></Card>
      </div>

      {!config?.smsConfigured && (
        <div className="flex gap-2 items-start text-sm rounded-lg border border-amber-300/60 bg-amber-50/50 p-3">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p>SMS is not set up yet, so receipts are saved here but not sent. Add your Africa&apos;s Talking keys (AT_USERNAME, AT_API_KEY) to the server&apos;s .env to send them.</p>
        </div>
      )}

      {/* Account numbers */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <p className="text-sm font-medium flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground" /> Tenant account numbers</p>
          {tenancies.length === 0 ? (
            <p className="text-sm text-muted-foreground">Approve a rental application and the tenant gets an account number automatically.</p>
          ) : (
            <div className="divide-y">
              {tenancies.map((a) => (
                <div key={a._id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.tenant?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.property?.title}</p>
                  </div>
                  <span className="font-mono font-bold bg-muted rounded-md px-2 py-1">{a.accountNumber}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Simulator */}
      {canSimulate && (
        <Card className="border-dashed">
          <CardContent className="pt-5">
            <form onSubmit={simulate} className="space-y-4">
              <div>
                <p className="text-sm font-medium flex items-center gap-2"><FlaskConical className="h-4 w-4 text-muted-foreground" /> Test a Paybill payment</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {config?.simulator
                    ? 'Simulates the message Safaricom sends when a tenant pays. No real money moves.'
                    : 'Asks the Safaricom sandbox to send a test payment. Your server must be reachable from the internet.'}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="sim-account">Account number</Label>
                  <Input
                    id="sim-account"
                    list="sim-accounts"
                    placeholder="e.g. KIL-A2"
                    value={sim.accountNumber}
                    onChange={(e) => setSim((s) => ({ ...s, accountNumber: e.target.value }))}
                    required
                  />
                  <datalist id="sim-accounts">
                    {tenancies.map((a) => <option key={a._id} value={a.accountNumber}>{a.tenant?.name}</option>)}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sim-amount">Amount (KES)</Label>
                  <Input id="sim-amount" type="number" min="1" placeholder="45000" value={sim.amount}
                    onChange={(e) => setSim((s) => ({ ...s, amount: e.target.value }))} required />
                </div>
                <Button type="submit" className="bg-[#4bb543] hover:bg-[#3da037] text-white" disabled={simulating}>
                  <Smartphone className="h-4 w-4 mr-1" /> {simulating ? 'Paying…' : 'Simulate payment'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Unmatched */}
      {unmatched.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-amber-700">Payments that need assigning</p>
          {unmatched.map((t) => (
            <Card key={t._id} className="border-amber-300/70">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{ksh(t.amount)} <span className="font-normal text-muted-foreground">from {t.payerName || 'unknown payer'}</span></p>
                    <p className="text-xs text-muted-foreground">
                      Account typed: <span className="font-mono">&ldquo;{t.billRef || 'blank'}&rdquo;</span> · Ref {t.transId} · {when(t.transTime)}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Select
                      aria-label={`Tenant for payment ${t.transId}`}
                      value={assignTo[t._id] || ''}
                      onChange={(e) => setAssignTo((m) => ({ ...m, [t._id]: e.target.value }))}
                      className="h-8 text-sm"
                    >
                      <option value="">Choose tenant</option>
                      {tenancies.map((a) => <option key={a._id} value={a._id}>{a.tenant?.name} · {a.accountNumber}</option>)}
                    </Select>
                    <Button size="sm" className="h-8 bg-[#7c4a1e] hover:bg-[#7c4a1e]/90" onClick={() => assign(t._id)}>Assign</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* History */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground font-medium">All Paybill payments</p>
        {txs.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground border border-dashed rounded-lg">
            No M-Pesa payments yet.{canSimulate ? ' Use “Test a Paybill payment” above to try one.' : ''}
          </div>
        )}
        {txs.map((t) => {
          const status = STATUS_BADGE[t.status] || STATUS_BADGE.received
          const receipt = t.receipts?.[t.receipts.length - 1]
          const rb = receipt ? RECEIPT_BADGE[receipt.status] : null
          const open = expanded === t._id
          return (
            <Card key={t._id}>
              <CardContent className="pt-3 pb-3">
                <button type="button" className="w-full text-left" onClick={() => setExpanded(open ? null : t._id)} aria-expanded={open}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{ksh(t.amount)}</p>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {rb && <Badge variant={rb.variant}>{rb.label}</Badge>}
                        {t.source === 'simulator' && <Badge variant="secondary">Test</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.tenant?.name ? `${t.tenant.name} · ${t.property?.title}` : `Account “${t.billRef}”`} · {when(t.transTime)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{t.transId}</span>
                      {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </button>
                {open && (
                  <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                    <p className="text-xs text-muted-foreground">
                      Account typed: <span className="font-mono">{t.billRef || 'blank'}</span>
                      {t.tenancy?.accountNumber ? <> · Matched to <span className="font-mono">{t.tenancy.accountNumber}</span></> : null}
                      {t.unallocated > 0 ? <> · {ksh(t.unallocated)} not yet assigned to a month</> : null}
                    </p>
                    {receipt ? (
                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-xs text-muted-foreground mb-1">Receipt to {receipt.to || 'no phone on file'} · {when(receipt.sentAt)}</p>
                        <p className="font-mono text-xs leading-relaxed">{receipt.message}</p>
                        {receipt.error && <p className="text-xs text-amber-700 mt-1">{receipt.error}</p>}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No receipt yet. Receipts are sent once the payment is assigned to a tenant.</p>
                    )}
                    {t.status === 'matched' && receipt && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => resend(t._id)}>
                        <Send className="h-3 w-3 mr-1" /> Resend receipt
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
