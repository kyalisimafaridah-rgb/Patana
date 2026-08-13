import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function CategoryPage() {
  const { name: rawName } = useParams();
  const name = rawName ? decodeURIComponent(rawName) : '';
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!name) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .products({ category: name, limit: 40 })
      .then((r) => setProducts(r.data || []))
      .catch((e) => {
        setProducts([]);
        setError(e.message || 'Failed to load');
      })
      .finally(() => setLoading(false));
  }, [name]);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link to="/" className="text-sm text-gray-500">
            ← Home
          </Link>
          <span className="font-semibold">{name || 'Category'}</span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading && <p className="text-gray-400">Loading...</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {products.map((p) => (
              <Link key={p.id} to={`/product/${p.id}`} className="rounded-xl border overflow-hidden">
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  {p.photoUrls?.[0] ? (
                    <img src={p.photoUrls[0]} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="p-2">
                  <div className="text-sm font-medium truncate">{p.productName}</div>
                  <div className="text-xs text-patana-700">
                    {p.price ? `${Number(p.price).toLocaleString()} UGX` : 'Negotiable'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        {!loading && products.length === 0 && (
          <p className="text-center text-gray-400 py-12">No listings in this category yet</p>
        )}
      </main>
    </div>
  );
}
