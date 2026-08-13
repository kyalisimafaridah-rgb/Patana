import { useState, FormEvent } from 'react';
import { api } from '../lib/api';

export default function ApplicationFormPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ referenceNumber: string } | null>(null);

  const [form, setForm] = useState({
    listingType: 'PRODUCTS',
    fullName: '',
    whatsappNumber: '',
    primaryPhone: '',
    location: '',
    businessName: '',
    businessDescription: '',
    category: '',
    nationalIdNumber: '',
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.submitApplication(form);
      setSuccess({ referenceNumber: res.referenceNumber });
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border p-8 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-xl font-bold mb-2">Application Received</h1>
          <p className="text-gray-600 text-sm mb-4">
            Your reference number is:
          </p>
          <p className="text-2xl font-mono font-bold text-patana-700 mb-6">
            {success.referenceNumber}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            We will review within 24 hours and contact you on WhatsApp.
          </p>
          <a href="/" className="btn-primary inline-block">Back to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-10">
        <a href="/sell" className="text-sm text-patana-600 hover:underline mb-6 inline-block">
          ← Back
        </a>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Seller Application</h1>
        <p className="text-gray-500 text-sm mb-8">
          Complete the form. Every application is reviewed within 24 hours.
        </p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Listing Type</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5"
              value={form.listingType}
              onChange={(e) => update('listingType', e.target.value)}
            >
              <option value="PRODUCTS">Products</option>
              <option value="SERVICES">Services</option>
              <option value="ONE_TIME">Property / Vehicle (One-time)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5"
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business / Shop Name</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5"
              value={form.businessName}
              onChange={(e) => update('businessName', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number *</label>
              <input
                required
                placeholder="+2567..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5"
                value={form.whatsappNumber}
                onChange={(e) => update('whatsappNumber', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Phone *</label>
              <input
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5"
                value={form.primaryPhone}
                onChange={(e) => update('primaryPhone', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location (City / Area) *</label>
            <input
              required
              placeholder="Kampala, Nakawa"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5"
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">National ID Number *</label>
            <input
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5"
              value={form.nationalIdNumber}
              onChange={(e) => update('nationalIdNumber', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              placeholder="Fashion, Electronics, Hair and Beauty..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5"
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Short Bio / Description</label>
            <textarea
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5"
              value={form.businessDescription}
              onChange={(e) => update('businessDescription', e.target.value)}
            />
          </div>

          <p className="text-xs text-gray-400">
            By submitting you confirm the information is accurate. False information leads to permanent removal.
            ID photos & business proof will be requested after initial review (or via WhatsApp).
          </p>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
