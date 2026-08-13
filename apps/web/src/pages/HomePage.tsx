import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function HomePage() {
  const [stats, setStats] = useState({ totalVerifiedSellers: 0, totalActiveListings: 0, totalCategories: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
    api.recent().then(setRecent).catch(() => {});
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) window.location.href = `/search?q=${encodeURIComponent(q.trim())}`;
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-4 py-3 sticky top-0 bg-white/95 backdrop-blur z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <Link to="/" className="text-xl font-bold tracking-tight text-gray-900">PATANA</Link>
          <div className="flex items-center gap-3">
            <Link to="/sell" className="btn-primary text-sm py-2 px-4">Sell With Us</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Where buyers and sellers meet
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Verified sellers · Direct WhatsApp · Flat pricing
          </p>
        </div>

        {/* Trust promises */}
        <div className="grid grid-cols-3 gap-3 mb-8 text-center">
          <div className="rounded-xl bg-patana-50 p-3">
            <div className="font-semibold text-sm text-patana-800">Verified Only</div>
          </div>
          <div className="rounded-xl bg-patana-50 p-3">
            <div className="font-semibold text-sm text-patana-800">WhatsApp Direct</div>
          </div>
          <div className="rounded-xl bg-patana-50 p-3">
            <div className="font-semibold text-sm text-patana-800">No Commission</div>
          </div>
        </div>

        {/* Live numbers */}
        <div className="flex justify-center gap-6 mb-8 text-center text-sm">
          <div>
            <div className="text-xl font-bold text-gray-900">{stats.totalVerifiedSellers}</div>
            <div className="text-gray-500">Verified Sellers</div>
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{stats.totalActiveListings}</div>
            <div className="text-gray-500">Listings</div>
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{stats.totalCategories}</div>
            <div className="text-gray-500">Categories</div>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-10">
          <div className="flex gap-2 max-w-xl mx-auto">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products, services, sellers..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-patana-500"
            />
            <button type="submit" className="btn-primary px-5">Search</button>
          </div>
        </form>

        {/* Categories quick links */}
        <div className="mb-10">
          <h2 className="font-semibold text-gray-900 mb-3">Browse categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {['Fashion', 'Electronics', 'Food and Drinks', 'Furniture and Home', 'Hair and Beauty', 'Home Services', 'Agriculture', 'Property'].map((c) => (
              <Link
                key={c}
                to={`/category/${encodeURIComponent(c)}`}
                className="rounded-xl border border-gray-100 px-3 py-3 text-sm text-center hover:border-patana-300 hover:bg-patana-50 transition"
              >
                {c}
              </Link>
            ))}
          </div>
        </div>

        {/* Recently added */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Recently Added</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              No listings yet. Be the first seller — <Link to="/sell" className="text-patana-600 underline">Apply now</Link>
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recent.map((p) => (
                <Link key={p.id} to={`/product/${p.id}`} className="rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition">
                  <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-300 text-xs">
                    {p.photoUrls?.[0] ? <img src={p.photoUrls[0]} alt="" className="w-full h-full object-cover" /> : 'No photo'}
                  </div>
                  <div className="p-2">
                    <div className="text-sm font-medium truncate">{p.productName}</div>
                    <div className="text-xs text-patana-700 font-semibold">
                      {p.price ? `${Number(p.price).toLocaleString()} UGX` : 'Negotiable'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-gray-100 mt-16 py-8 text-center text-xs text-gray-400">
        <p>Patana · Where buyers and sellers meet</p>
        <p className="mt-1">
          <Link to="/sell" className="underline">Sell With Us</Link>
          {' · '}
          <Link to="/activate" className="underline">Activate Listing</Link>
        </p>
      </footer>
    </div>
  );
}
