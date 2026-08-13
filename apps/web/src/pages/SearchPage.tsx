import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(!!q);

  useEffect(() => {
    if (!q.trim()) {
      setResult({ products: [], sellers: [], summary: 'Enter a search term' });
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .search(q)
      .then(setResult)
      .catch(() => setResult({ products: [], sellers: [], summary: 'Search failed' }))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link to="/" className="text-sm text-gray-500">
            ← Home
          </Link>
          <span className="font-semibold">Search{q ? `: ${q}` : ''}</span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading && <p className="text-gray-400">Searching...</p>}
        {!loading && result && (
          <>
            <p className="text-sm text-gray-500 mb-4">{result.summary}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {result.products?.map((p: any) => (
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
            {result.products?.length === 0 && (
              <p className="text-center text-gray-400 py-12">No products found</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
