import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function ActivationPage() {
  const navigate = useNavigate();
  const [referenceNumber, setReferenceNumber] = useState('');
  const [activationKey, setActivationKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.activate(referenceNumber.trim(), activationKey.trim());
      localStorage.setItem('patana_seller_token', res.token);
      localStorage.setItem(
        'patana_seller',
        JSON.stringify({
          id: res.sellerId,
          referenceNumber: res.referenceNumber,
          businessName: res.businessName,
        })
      );
      navigate('/seller/dashboard');
    } catch (err: any) {
      setError(err.message || 'Activation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Activate Your Listing</h1>
        <p className="text-gray-500 text-sm text-center mb-8">
          Enter the reference number and activation key from admin.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
            <input
              required
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5"
              placeholder="PAT-XXXXXX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activation Key</label>
            <input
              required
              value={activationKey}
              onChange={(e) => setActivationKey(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5"
              placeholder="Enter key"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">
            {loading ? 'Activating...' : 'Activate & Go to Dashboard'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-6">
          Already activated?{' '}
          <Link to="/seller/login" className="text-patana-600 underline">Seller login</Link>
        </p>
      </div>
    </div>
  );
}
