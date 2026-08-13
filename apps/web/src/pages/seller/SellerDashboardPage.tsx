import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

export default function SellerDashboardPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('patana_seller_token');
  const [data, setData] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/seller/login');
      return;
    }
    Promise.all([api.sellerDashboard(token), api.sellerListings(token)])
      .then(([dash, list]) => {
        setData(dash);
        setListings(list);
      })
      .catch((e) => {
        setError(e.message);
        if (e.message.includes('Authentication') || e.message.includes('401')) {
          localStorage.removeItem('patana_seller_token');
          navigate('/seller/login');
        }
      })
      .finally(() => setLoading(false));
  }, [token, navigate]);

  function logout() {
    localStorage.removeItem('patana_seller_token');
    localStorage.removeItem('patana_seller');
    navigate('/seller/login');
  }

  async function markStatus(id: string, status: string) {
    if (!token) return;
    try {
      await api.updateListingStatus(token, id, status);
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, availabilityStatus: status } : l)));
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <div className="font-bold">Seller Dashboard</div>
            <div className="text-xs text-gray-500">
              {data?.seller?.businessName || data?.seller?.fullName} · {data?.seller?.referenceNumber}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-gray-500">View site</Link>
            <button onClick={logout} className="text-sm text-red-600">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-xl font-bold">{data?.stats?.totalListings ?? 0}</div>
            <div className="text-xs text-gray-500">Listings</div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-xl font-bold">{data?.stats?.totalViews ?? 0}</div>
            <div className="text-xs text-gray-500">Views</div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-xl font-bold">{data?.stats?.totalWhatsappTaps ?? 0}</div>
            <div className="text-xs text-gray-500">WhatsApp taps</div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-xl font-bold">{data?.seller?.trustScore ?? 100}</div>
            <div className="text-xs text-gray-500">Trust score</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Your Listings</h2>
          <Link to="/seller/listings/new" className="btn-primary text-sm py-2 px-4">+ Add Listing</Link>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
            No listings yet.{' '}
            <Link to="/seller/listings/new" className="text-patana-600 underline">Add your first product</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((l) => (
              <div key={l.id} className="bg-white rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{l.productName}</div>
                  <div className="text-sm text-gray-500">
                    {l.price ? `${Number(l.price).toLocaleString()} UGX` : 'Negotiable'} · {l.availabilityStatus} · {l.viewsCount} views · {l.whatsappTapsCount} taps
                  </div>
                </div>
                <div className="flex gap-2 text-sm">
                  {l.availabilityStatus === 'AVAILABLE' && (
                    <>
                      <button onClick={() => markStatus(l.id, 'OUT_OF_STOCK')} className="px-3 py-1.5 rounded-lg bg-gray-100">Out of stock</button>
                      <button onClick={() => markStatus(l.id, 'SOLD')} className="px-3 py-1.5 rounded-lg bg-gray-100">Mark sold</button>
                    </>
                  )}
                  {l.availabilityStatus !== 'AVAILABLE' && (
                    <button onClick={() => markStatus(l.id, 'AVAILABLE')} className="px-3 py-1.5 rounded-lg bg-patana-50 text-patana-700">Mark available</button>
                  )}
                  <Link to={`/product/${l.id}`} className="px-3 py-1.5 rounded-lg border text-gray-600">View</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
