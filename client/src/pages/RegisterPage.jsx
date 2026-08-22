import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';

export default function RegisterPage() {
  const [form, setForm] = useState({ orgName: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.orgName, form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Greška pri registraciji');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">FieldAssign</h1>
          <p className="text-sm text-gray-500 mt-1">Kreirajte nalog za vašu firmu</p>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Registracija</h2>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Naziv firme / organizacije</label>
              <input name="orgName" type="text" className="input" value={form.orgName} onChange={handleChange} placeholder="npr. Zaštita Plus d.o.o." required />
            </div>
            <div>
              <label className="label">Vaše ime i prezime</label>
              <input name="name" type="text" className="input" value={form.name} onChange={handleChange} placeholder="Ime Prezime" required />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" className="input" value={form.email} onChange={handleChange} placeholder="vasa@email.com" required />
            </div>
            <div>
              <label className="label">Lozinka</label>
              <input name="password" type="password" className="input" value={form.password} onChange={handleChange} placeholder="Min. 6 znakova" minLength={6} required />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-2.5">
              {loading ? 'Registracija...' : 'Registruj se besplatno'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Već imate nalog?{' '}
          <Link to="/login" className="text-brand-600 hover:text-brand-800 font-medium">Prijavite se</Link>
        </p>
      </div>
    </div>
  );
}
