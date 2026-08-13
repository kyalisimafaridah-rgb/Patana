import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function SellerProfilePage() {
  const { id } = useParams();
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.seller(id).then(setSeller).catch(() => setSeller(null)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  if (!seller) return <div className="min-h-screen flex items-center justify-center text-red-500">Seller not found</div>;

  return (
    <div className="min-h-screen bg-white pb-10">
      <header className="border-b px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <Link to="/" className="text-sm text-gray-500">← Home</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden">
            {seller.profilePhotoUrl && <img src={seller.profilePhotoUrl} className="w-full h-full object-cover" alt="" />}
          </div>
          <div>
            <h1 className="text-xl font-bold">{seller.businessName || seller.fullName}</h1>
            <p className="text-sm text-gray-500">
              {seller.locationCity} · {seller.trustBadge} · Member since {new Date(seller.memberSince).getFullYear()}
            </p>
          </div>
        </div>
        {seller.bio && <p className="text-sm text-gray-600 mb-6">{seller.bio}</p>}
        <h2 className="font-semibold mb-3">Listings ({seller.products?.length || 0})</h2>
        <div className="grid grid-cols-2 gap-3">
          {seller.products?.map((p: any) => (
            <Link key={p.id} to={`/product/${p.id}`} className="rounded-xl border p-3">
              <div className="font-medium text-sm truncate">{p.productName}</div>
              <div className="text-xs text-patana-700">
                {p.price ? `${Number(p.price).toLocaleString()} UGX` : 'Negotiable'}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
