export default function SellWithUsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <a href="/" className="text-sm text-patana-600 hover:underline mb-6 inline-block">← Back to home</a>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Sell With Patana</h1>
        <p className="text-gray-600 mb-8">
          Join Uganda's verified marketplace directory. Reach real buyers on WhatsApp.
        </p>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 space-y-4">
          <h2 className="font-semibold">Why sellers choose Patana</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• No commission — keep 100% of every sale</li>
            <li>• Verified badge that builds buyer trust</li>
            <li>• Direct WhatsApp connection with buyers</li>
            <li>• Fair visibility — no paid ranking games</li>
          </ul>
        </div>
        <a href="/apply" className="btn-primary inline-block w-full text-center py-3">
          Apply Now
        </a>
      </div>
    </div>
  );
}
