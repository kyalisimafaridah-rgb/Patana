import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

interface Application {
  id: string;
  referenceNumber: string;
  fullName: string;
  businessName?: string;
  whatsappNumber: string;
  location: string;
  listingType: string;
  applicationStatus: string;
  dateSubmitted: string;
  category?: string;
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const token = localStorage.getItem('patana_admin_token');

  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
      return;
    }
    load();
  }, [token, navigate]);

  async function load() {
    try {
      setLoading(true);
      const data = await api.adminApplications(token!);
      setApplications(data as Application[]);
    } catch (err: any) {
      setError(err.message);
      if (err.message.includes('401') || err.message.includes('Authentication')) {
        localStorage.removeItem('patana_admin_token');
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  }

  async function approve(id: string) {
    if (!confirm('Approve this application and generate activation key?')) return;
    setActionLoading(id);
    try {
      const res: any = await api.approveApplication(token!, id);
      // Fetch key via separate reveal endpoint (not embedded in approve response)
      let keyMsg = '(open reveal if needed)';
      try {
        const revealed: any = await api.revealKey(token!, {
          keyId: res.keyId,
          sellerId: res.sellerId,
          referenceNumber: res.referenceNumber,
        });
        keyMsg = revealed.activationKey;
      } catch (e: any) {
        keyMsg = 'Could not reveal key automatically — use reveal endpoint';
      }
      alert(
        `Approved!\nReference: ${res.referenceNumber}\nActivation Key: ${keyMsg}\n\nSend this key to the seller via WhatsApp. Do not leave it in chat history longer than needed.`
      );
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function reject(id: string) {
    const reason = prompt('Rejection reason (will be shown to seller):');
    if (!reason || reason.length < 5) return;
    setActionLoading(id);
    try {
      await api.rejectApplication(token!, id, reason);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  function logout() {
    localStorage.removeItem('patana_admin_token');
    localStorage.removeItem('patana_admin');
    navigate('/admin/login');
  }

  const pending = applications.filter((a) =>
    ['SUBMITTED', 'UNDER_REVIEW'].includes(a.applicationStatus)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="font-bold text-lg">Patana Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Phase 1 · Applications</span>
            <button onClick={logout} className="text-sm text-red-600 hover:underline">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            Pending Applications ({pending.length})
          </h2>
          <button onClick={load} className="text-sm text-patana-600 hover:underline">
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">{error}</div>
        )}

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
            No applications yet.
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{app.fullName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {app.applicationStatus}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {app.businessName && `${app.businessName} · `}
                    {app.listingType} · {app.location}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {app.referenceNumber} · {app.whatsappNumber} ·{' '}
                    {new Date(app.dateSubmitted).toLocaleString()}
                  </p>
                </div>

                {['SUBMITTED', 'UNDER_REVIEW'].includes(app.applicationStatus) && (
                  <div className="flex gap-2">
                    <button
                      disabled={actionLoading === app.id}
                      onClick={() => approve(app.id)}
                      className="bg-patana-600 hover:bg-patana-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      disabled={actionLoading === app.id}
                      onClick={() => reject(app.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-700 text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
