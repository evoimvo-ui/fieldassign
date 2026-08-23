import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore.js'

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { changePassword } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.newPassword !== form.confirmPassword) {
      setError('Nova lozinka i potvrda se ne podudaraju')
      return
    }

    if (form.newPassword.length < 8) {
      setError('Nova lozinka mora imati najmanje 8 karaktera')
      return
    }
    if (!/[A-Z]/.test(form.newPassword)) {
      setError('Nova lozinka mora sadržavati barem jedno veliko slovo')
      return
    }
    if (!/[a-z]/.test(form.newPassword)) {
      setError('Nova lozinka mora sadržavati barem jedno malo slovo')
      return
    }
    if (!/[0-9]/.test(form.newPassword)) {
      setError('Nova lozinka mora sadržavati barem jedan broj')
      return
    }

    setLoading(true)
    try {
      await changePassword(form.currentPassword, form.newPassword)
      setSuccess(true)
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.message || 'Greška pri promjeni lozinke')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 mb-4">
            🔒
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Promjena lozinke</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            Molimo promijenite svoju privremenu lozinku
          </p>
        </div>

        <div className="card p-8">
          {success ? (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                ✅
              </div>
              <p className="text-green-600 font-bold text-center">
                Lozinka uspješno promijenjena! Preusmjeravamo vas...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1.5 block">Trenutna lozinka</label>
                  <input 
                    type="password"
                    className="input"
                    value={form.currentPassword} 
                    onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} 
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1.5 block">Nova lozinka</label>
                  <input 
                    type="password"
                    className="input"
                    value={form.newPassword} 
                    onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} 
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1.5 block">Potvrdi novu lozinku</label>
                  <input 
                    type="password"
                    className="input"
                    value={form.confirmPassword} 
                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} 
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 text-center">
                  {error}
                </div>
              )}

              <button 
                className="btn btn-primary w-full justify-center py-3 mt-2" 
                disabled={loading}
              >
                {loading ? 'Učitavanje...' : 'Promijeni lozinku'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
