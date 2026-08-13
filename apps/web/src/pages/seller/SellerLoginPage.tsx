import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api';

export default function SellerLoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function requestOtp(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.requestOtp(referenceNumber.trim(), whatsappNumber.trim());
      if (res.devOtp) setDevOtp(res.devOtp);
      setStep('verify');
    } catch (err: any) {
      setError(err.message || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.verifyOtp(referenceNumber.trim(), whatsappNumber.trim(), otp.trim());
      localStorage.setItem('patana_seller_token', res.token);
      localStorage.setItem('patana_seller', JSON.stringify(res.seller));
      navigate('/seller/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border p-8">
        <h1 className="text-xl font-bold text-center mb-2">Seller Login</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          {step === 'request' ? 'Request a one-time code' : 'Enter the OTP sent to your WhatsApp'}
        </p>

        {step === 'request' ? (
          <form onSubmit={requestOtp} className="space-y-4">
            {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
            <div>
              <label className="block text-sm font-medium mb-1">Reference Number</label>
              <input required value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5" placeholder="PAT-XXXXXX" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">WhatsApp Number</label>
              <input required value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5" placeholder="+2567..." />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
            {devOtp && (
              <div className="bg-amber-50 text-amber-800 text-sm rounded-lg px-4 py-3">
                Dev OTP: <strong>{devOtp}</strong> (only shown in non-production)
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">OTP Code</label>
              <input required value={otp} onChange={(e) => setOtp(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 tracking-widest" placeholder="6-digit code" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            <button type="button" onClick={() => setStep('request')} className="w-full text-sm text-gray-500">
              ← Request a new code
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          New seller? <Link to="/activate" className="text-patana-600 underline">Activate first</Link>
        </p>
      </div>
    </div>
  );
}
