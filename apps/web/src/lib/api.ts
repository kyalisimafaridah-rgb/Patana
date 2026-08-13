const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export const api = {
  // Public
  stats: () =>
    request<{ totalVerifiedSellers: number; totalActiveListings: number; totalCategories: number }>(
      '/public/stats'
    ),
  categories: () => request<any[]>('/public/categories'),
  products: (params?: Record<string, string | number>) => {
    const q = new URLSearchParams(params as any).toString();
    return request<{ data: any[]; pagination: any }>(`/public/products?${q}`);
  },
  product: (id: string) => request<any>(`/public/products/${id}`),
  tapProduct: (id: string) =>
    request<{ whatsappUrl: string }>(`/public/products/${id}/tap`, { method: 'POST' }),
  seller: (id: string) => request<any>(`/public/sellers/${id}`),
  recent: () => request<any[]>('/public/homepage/recent'),
  search: (q: string) => request<any>(`/public/search?q=${encodeURIComponent(q)}`),

  // Applications
  submitApplication: (body: Record<string, unknown>) =>
    request<{ message: string; referenceNumber: string }>('/applications/submit', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getApplicationStatus: (ref: string) => request(`/applications/status/${ref}`),
  activate: (referenceNumber: string, activationKey: string) =>
    request<{
      message: string;
      referenceNumber: string;
      status: string;
      token: string;
      sellerId: string;
      businessName?: string;
    }>('/activate', {
      method: 'POST',
      body: JSON.stringify({ referenceNumber, activationKey }),
    }),

  // Auth
  adminLogin: (email: string, password: string) =>
    request<{ token: string; admin: any }>('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  requestOtp: (referenceNumber: string, whatsappNumber: string) =>
    request<{ message: string; devOtp?: string }>('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ referenceNumber, whatsappNumber }),
    }),
  verifyOtp: (referenceNumber: string, whatsappNumber: string, otp: string) =>
    request<{ token: string; seller: any }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ referenceNumber, whatsappNumber, otp }),
    }),

  // Admin
  adminApplications: (token: string, status?: string) =>
    request(`/admin/applications${status ? `?status=${status}` : ''}`, {
      headers: authHeaders(token),
    }),
  approveApplication: (token: string, id: string) =>
    request(`/admin/applications/${id}/approve`, {
      method: 'POST',
      headers: authHeaders(token),
    }),
  rejectApplication: (token: string, id: string, reason: string) =>
    request(`/admin/applications/${id}/reject`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ reason }),
    }),
  adminSellers: (token: string) =>
    request('/admin/sellers', { headers: authHeaders(token) }),
  revealKey: (token: string, body: { keyId?: string; sellerId?: string; referenceNumber?: string }) =>
    request<{ activationKey: string; expiresAt: string; warning: string }>('/admin/keys/reveal', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }),

  // Seller
  sellerDashboard: (token: string) =>
    request<any>('/seller/dashboard', { headers: authHeaders(token) }),
  sellerListings: (token: string) =>
    request<any[]>('/seller/listings', { headers: authHeaders(token) }),
  createListing: (token: string, body: any) =>
    request('/seller/listings', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }),
  updateListing: (token: string, id: string, body: any) =>
    request(`/seller/listings/${id}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }),
  updateListingStatus: (token: string, id: string, status: string) =>
    request(`/seller/listings/${id}/status`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ status }),
    }),
  deleteListing: (token: string, id: string) =>
    request(`/seller/listings/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),
  uploadPhotos: async (token: string, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append('photos', f));
    form.append('folder', 'products');
    const res = await fetch(`${API_BASE}/seller/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.urls as string[];
  },
};
