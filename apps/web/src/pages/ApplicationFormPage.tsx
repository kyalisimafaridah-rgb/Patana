import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

type ListingType = 'PRODUCTS' | 'SERVICES' | 'ONE_TIME';
type TargetCustomers = 'INDIVIDUALS' | 'BUSINESSES' | 'BOTH';

interface FormState {
  listingType: ListingType;
  fullName: string;
  whatsappNumber: string;
  primaryPhone: string;
  location: string;
  businessName: string;
  businessDescription: string;
  category: string;
  nationalIdNumber: string;
  deliveryAvailable: boolean;
  customOrders: boolean;
  targetCustomers: TargetCustomers | '';
}

const STEPS = ['Listing type', 'About you', 'Contact', 'Details', 'Verify'];

const LISTING_TYPES: { value: ListingType; label: string; hint: string; emoji: string }[] = [
  { value: 'PRODUCTS', label: 'Products', hint: 'Physical items you sell', emoji: '📦' },
  { value: 'SERVICES', label: 'Services', hint: 'Skills or work you offer', emoji: '🛠️' },
  { value: 'ONE_TIME', label: 'One-time item', hint: 'A single item, e.g. land or a vehicle', emoji: '🏷️' },
];

export default function ApplicationFormPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ referenceNumber: string } | null>(null);

  const [form, setForm] = useState<FormState>({
    listingType: 'PRODUCTS',
    fullName: '',
    whatsappNumber: '',
    primaryPhone: '',
    location: '',
    businessName: '',
    businessDescription: '',
    category: '',
    nationalIdNumber: '',
    deliveryAvailable: false,
    customOrders: false,
    targetCustomers: '',
  });

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function stepIsValid(i: number): boolean {
    switch (i) {
      case 0:
        return !!form.listingType;
      case 1:
        return form.fullName.trim().length >= 2;
      case 2:
        return form.whatsappNumber.trim().length >= 10 && form.primaryPhone.trim().length >= 10 && form.location.trim().length >= 2;
      case 3:
        return true;
      case 4:
        return form.nationalIdNumber.trim().length >= 5;
      default:
        return true;
    }
  }

  function next() {
    if (!stepIsValid(step)) {
      setError('Please fill in the required fields before continuing.');
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stepIsValid(4)) {
      setError('Please fill in the required fields before continuing.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        listingType: form.listingType,
        fullName: form.fullName.trim(),
        whatsappNumber: form.whatsappNumber.trim(),
        primaryPhone: form.primaryPhone.trim(),
        location: form.location.trim(),
        nationalIdNumber: form.nationalIdNumber.trim(),
      };
      if (form.businessName.trim()) body.businessName = form.businessName.trim();
      if (form.businessDescription.trim()) body.businessDescription = form.businessDescription.trim();
      if (form.category.trim()) body.category = form.category.trim();
      if (form.targetCustomers) body.targetCustomers = form.targetCustomers;
      body.deliveryAvailable = form.deliveryAvailable;
      body.customOrders = form.customOrders;

      const res = await api.submitApplication(body);
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
          <p className="text-gray-600 text-sm mb-4">Your reference number is:</p>
          <p className="text-2xl font-mono font-bold text-patana-700 mb-6">{success.referenceNumber}</p>
          <p className="text-sm text-gray-500 mb-6">
            We will review within 24 hours and contact you on WhatsApp.
          </p>
          <Link to="/" className="btn-primary inline-block">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-10">
        <Link to="/sell" className="text-sm text-patana-600 hover:underline mb-6 inline-block">
          ← Back
        </Link>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    i < step
                      ? 'bg-patana-600 text-white'
                      : i === step
                        ? 'bg-patana-100 text-patana-700 ring-2 ring-patana-600'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-[10px] mt-1 hidden sm:block ${i === step ? 'text-patana-700 font-medium' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-patana-600 transition-all duration-300"
              style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Seller Application</h1>
        <p className="text-sm text-gray-500 mb-6">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          {step === 0 && (
            <div className="space-y-3">
              {LISTING_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => update('listingType', t.value)}
                  className={`w-full text-left flex items-center gap-4 rounded-xl border-2 p-4 transition-colors ${
                    form.listingType === t.value ? 'border-patana-600 bg-patana-50' : 'border-gray-100'
                  }`}
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <span>
                    <span className="block font-semibold text-gray-900">{t.label}</span>
                    <span className="block text-xs text-gray-500">{t.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Your full name *</label>
                <input required value={form.fullName} onChange={(e) => update('fullName', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5" placeholder="e.g. Amina Nakato" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Business name (optional)</label>
                <input value={form.businessName} onChange={(e) => update('businessName', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5" placeholder="e.g. Amina's Fashion House" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category (optional)</label>
                <input value={form.category} onChange={(e) => update('category', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5" placeholder="e.g. Fashion, Electronics, Cleaning" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">WhatsApp number *</label>
                <input required value={form.whatsappNumber} onChange={(e) => update('whatsappNumber', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5" placeholder="+2567..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Primary phone *</label>
                <input required value={form.primaryPhone} onChange={(e) => update('primaryPhone', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5" placeholder="+2567..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location *</label>
                <input required value={form.location} onChange={(e) => update('location', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5" placeholder="e.g. Kampala, Entebbe" />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Tell buyers about your business (optional)</label>
                <textarea value={form.businessDescription} onChange={(e) => update('businessDescription', e.target.value)}
                  rows={4} className="w-full border rounded-lg px-3 py-2.5" placeholder="What do you sell, what makes you different?" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Who do you mainly sell to?</label>
                <select value={form.targetCustomers} onChange={(e) => update('targetCustomers', e.target.value as TargetCustomers | '')}
                  className="w-full border rounded-lg px-3 py-2.5">
                  <option value="">Prefer not to say</option>
                  <option value="INDIVIDUALS">Individuals</option>
                  <option value="BUSINESSES">Businesses</option>
                  <option value="BOTH">Both</option>
                </select>
              </div>
              <label className="flex items-center gap-3 py-1">
                <input type="checkbox" checked={form.deliveryAvailable}
                  onChange={(e) => update('deliveryAvailable', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-patana-600" />
                <span className="text-sm text-gray-700">I offer delivery</span>
              </label>
              <label className="flex items-center gap-3 py-1">
                <input type="checkbox" checked={form.customOrders}
                  onChange={(e) => update('customOrders', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-patana-600" />
                <span className="text-sm text-gray-700">I accept custom orders</span>
              </label>
            </>
          )}

          {step === 4 && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">National ID number *</label>
                <input required value={form.nationalIdNumber} onChange={(e) => update('nationalIdNumber', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5" placeholder="Used for verification only" />
                <p className="text-xs text-gray-400 mt-1">We use this to verify you're a real person. It's never shown publicly.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5 text-gray-600">
                <p><span className="text-gray-400">Name:</span> {form.fullName || '—'}</p>
                <p><span className="text-gray-400">WhatsApp:</span> {form.whatsappNumber || '—'}</p>
                <p><span className="text-gray-400">Location:</span> {form.location || '—'}</p>
                <p><span className="text-gray-400">Listing type:</span> {LISTING_TYPES.find((t) => t.value === form.listingType)?.label}</p>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            {step > 0 && (
              <button type="button" onClick={back}
                className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-600 font-medium">
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={next} className="btn-primary flex-1 py-3">
                Continue
              </button>
            ) : (
              <button type="submit" disabled={loading} className="btn-primary flex-1 py-3 disabled:opacity-60">
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
