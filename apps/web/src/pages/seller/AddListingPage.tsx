import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api';

const CATEGORIES = [
  'Fashion', 'Electronics', 'Food and Drinks', 'Furniture and Home',
  'Beauty and Skincare', 'Agriculture', 'Vehicles', 'Baby Products',
  'Building Materials', 'Books and Stationery', 'Art and Crafts', 'Sports Equipment',
  'Hair and Beauty', 'Home Services', 'Events', 'Transport',
  'Repairs and Maintenance', 'Tutoring and Education', 'Cleaning', 'IT Services',
  'Legal Services', 'Medical Services', 'Photography', 'Other Services', 'Property',
];

export default function AddListingPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('patana_seller_token');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [form, setForm] = useState({
    productName: '',
    description: '',
    price: '',
    category: 'Fashion',
    listingType: 'PRODUCT',
  });

  if (!token) {
    navigate('/seller/login');
    return null;
  }

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length || !token) return;

    setUploading(true);
    setError('');
    try {
      const urls = await api.uploadPhotos(token, Array.from(files));
      setPhotoUrls((prev) => [...prev, ...urls].slice(0, 5));
    } catch (err: any) {
      setError(err.message || 'Upload failed. You can still publish without photos, or paste a URL below.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function removePhoto(index: number) {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const body: any = {
        productName: form.productName,
        description: form.description || undefined,
        category: form.category,
        listingType: form.listingType,
        priceType: form.price ? 'FIXED' : 'NEGOTIABLE',
        photoUrls,
      };
      if (form.price) body.price = Number(form.price);
      await api.createListing(token!, body);
      navigate('/seller/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3">
        <div className="max-w-xl mx-auto">
          <Link to="/seller/dashboard" className="text-sm text-gray-500">← Dashboard</Link>
        </div>
      </header>
      <main className="max-w-xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-6">Add Listing</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

          <div>
            <label className="block text-sm font-medium mb-1">Product / Service name *</label>
            <input required value={form.productName} onChange={(e) => update('productName', e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select value={form.category} onChange={(e) => update('category', e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select value={form.listingType} onChange={(e) => update('listingType', e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5">
              <option value="PRODUCT">Product</option>
              <option value="SERVICE">Service</option>
              <option value="PROPERTY">Property</option>
              <option value="VEHICLE">Vehicle</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Price (UGX)</label>
            <input type="number" min="0" value={form.price} onChange={(e) => update('price', e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5" placeholder="Leave empty if negotiable" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea rows={4} value={form.description} onChange={(e) => update('description', e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5" />
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-sm font-medium mb-1">Photos (up to 5)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFiles}
              disabled={uploading || photoUrls.length >= 5}
              className="w-full text-sm"
            />
            {uploading && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
            {photoUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {photoUrls.map((url, i) => (
                  <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-0 right-0 bg-black/60 text-white text-xs w-5 h-5"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">
              JPEG, PNG or WebP · max 5MB each. Requires Cloudinary env vars on the API.
            </p>
          </div>

          <button type="submit" disabled={loading || uploading} className="btn-primary w-full py-3 disabled:opacity-60">
            {loading ? 'Publishing...' : 'Publish Listing'}
          </button>
        </form>
      </main>
    </div>
  );
}
