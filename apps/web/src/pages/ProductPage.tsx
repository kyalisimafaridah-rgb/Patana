import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.product(id)
      .then(setProduct)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function contactSeller() {
    if (!product) return;
    try {
      const { whatsappUrl } = await api.tapProduct(product.id);
      window.open(whatsappUrl, '_blank');
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  if (error || !product) return <div className="min-h-screen flex items-center justify-center text-red-500">{error || 'Not found'}</div>;

  const priceText = product.price
    ? `${Number(product.price).toLocaleString()} UGX`
    : product.priceMin
      ? `${Number(product.priceMin).toLocaleString()} – ${Number(product.priceMax || 0).toLocaleString()} UGX`
      : 'Negotiable';

  return (
    <div className="min-h-screen bg-white pb-24">
      <header className="border-b border-gray-100 px-4 py-3 sticky top-0 bg-white z-20">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link to="/" className="text-sm text-gray-500">← Back</Link>
          <span className="font-semibold truncate">{product.productName}</span>
        </div>
      </header>

      {/* Gallery */}
      <div className="max-w-3xl mx-auto">
        <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
          {product.photoUrls?.[0] ? (
            <img src={product.photoUrls[0]} alt={product.productName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-300">No photo</span>
          )}
        </div>

        <div className="px-4 py-5">
          {/* Summary card */}
          <div className="mb-4">
            <h1 className="text-xl font-bold text-gray-900 mb-1">{product.productName}</h1>
            <p className="text-2xl font-bold text-patana-700 mb-3">{priceText}</p>

            <Link to={`/seller/${product.seller.id}`} className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                {product.seller.profilePhotoUrl && (
                  <img src={product.seller.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div>
                <div className="font-medium text-sm">
                  {product.seller.businessName || product.seller.fullName}
                  {product.seller.verificationStatus === 'VERIFIED' && (
                    <span className="ml-1 text-patana-600 text-xs">✓ Verified</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {product.seller.locationCity}
                  {product.seller.responseTimeAverage != null && ` · ~${product.seller.responseTimeAverage}h response`}
                </div>
              </div>
            </Link>
          </div>

          {product.description && (
            <div className="mb-6">
              <h2 className="font-semibold text-sm mb-2">Description</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{product.description}</p>
            </div>
          )}

          {/* More from seller */}
          {product.moreFromSeller?.length > 0 && (
            <div className="mb-6">
              <h2 className="font-semibold text-sm mb-3">More from this seller</h2>
              <div className="grid grid-cols-2 gap-2">
                {product.moreFromSeller.map((p: any) => (
                  <Link key={p.id} to={`/product/${p.id}`} className="rounded-lg border p-2 text-sm">
                    <div className="font-medium truncate">{p.productName}</div>
                    <div className="text-patana-700 text-xs">
                      {p.price ? `${Number(p.price).toLocaleString()} UGX` : 'Negotiable'}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Similar */}
          {product.similar?.length > 0 && (
            <div>
              <h2 className="font-semibold text-sm mb-3">Similar products</h2>
              <div className="grid grid-cols-2 gap-2">
                {product.similar.map((p: any) => (
                  <Link key={p.id} to={`/product/${p.id}`} className="rounded-lg border p-2 text-sm">
                    <div className="font-medium truncate">{p.productName}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {p.seller?.businessName || p.seller?.fullName}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed WhatsApp button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 safe-area">
        <div className="max-w-3xl mx-auto">
          <button onClick={contactSeller} className="btn-whatsapp w-full flex items-center justify-center gap-2">
            <span>💬</span> Chat on WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
