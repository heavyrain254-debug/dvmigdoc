'use client';
import { useState, useEffect } from 'react';

export default function AdminPortal() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [data, setData] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [clientName, setClientName] = useState('');
  const [internalClientId, setInternalClientId] = useState('');

  // 1. Check Auth & Fetch Data on load
  const checkAuthAndFetch = async () => {
    try {
      const res = await fetch('/api/admin/data');
      if (res.status === 401) {
        setIsAuthenticated(false);
      } else {
        const d = await res.json();
        if (Array.isArray(d)) setData(d);
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  // 2. Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/login', {
      method: 'POST', 
      body: JSON.stringify({ password })
    });
    
    if (res.ok) {
      setPassword('');
      setIsLoading(true);
      checkAuthAndFetch(); // Re-fetch data and switch to dashboard view
    } else {
      alert('Wrong password');
    }
  };

  // 3. Logout Handler
  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setData([]); // Clear sensitive data from memory
  };

  // 4. Create Link Handler
  const handleCreateLink = async () => {
    if (!clientName || !internalClientId) {
      alert("Please enter both a Client Name and your Internal Client ID.");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/create', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, internalClientId })
      });
      const result = await res.json();
      
      if (res.ok && result.success) {
        const link = `${window.location.origin}/f/${result.token}`;
        navigator.clipboard.writeText(link);
        alert(`Link for ${clientName} generated & copied to clipboard:\n\n${link}`);
        setClientName('');
        setInternalClientId('');
        checkAuthAndFetch(); 
      } else {
        alert(result.error || 'Failed to generate link.');
      }
    } catch (err) {
      console.error(err);
      alert('Error generating link.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-brand-blue font-bold">Loading...</div>;
  }

  // --- RENDER LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 w-96">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 text-center">Admin Login</h1>
          <input 
            type="password" 
            placeholder="Password" 
            className="w-full border border-gray-300 p-3 rounded-lg mb-4 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
          <button type="submit" className="w-full bg-brand-blue text-white py-3 rounded-lg font-bold hover:bg-brand-blue/90 transition-all">
            Login
          </button>
        </form>
      </div>
    );
  }

  // --- RENDER DASHBOARD SCREEN ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-brand-blue rounded-lg flex items-center justify-center text-white font-bold text-xl">D</div>
          <h1 className="text-xl font-bold text-gray-900">Admin Portal</h1>
        </div>
        <button onClick={handleLogout} className="text-sm font-medium text-gray-500 hover:text-brand-red transition-colors">
          Log Out
        </button>
      </nav>

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-brand-blue px-6 py-4">
            <h2 className="text-white font-semibold">Generate New Client Link</h2>
          </div>
          <div className="p-6 flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
              <input type="text" placeholder="e.g., Acme Corp" className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-brand-blue" value={clientName} onChange={e => setClientName(e.target.value)} />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Internal Client ID</label>
              <input type="text" placeholder="e.g., 10045" className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-brand-blue" value={internalClientId} onChange={e => setInternalClientId(e.target.value)} />
            </div>
            <button onClick={handleCreateLink} disabled={isGenerating} className="bg-brand-blue text-white px-8 py-3 rounded-lg font-medium hover:bg-brand-blue/90 disabled:bg-gray-400 shadow-sm whitespace-nowrap">
              {isGenerating ? 'Generating...' : 'Create Link'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Recent Submissions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Int. ID</th>
                  <th className="px-6 py-4 font-semibold">Client Name</th>
                  <th className="px-6 py-4 font-semibold">Link Token</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm font-bold text-gray-700">{row.internal_client_id || '—'}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{row.client_name || '—'}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">{row.token}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${row.status === 'SUBMITTED' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {row.status === 'SUBMITTED' ? (
                        <a href={`/api/admin/data?download=${row.token}`} className="inline-flex items-center gap-1 text-brand-blue font-semibold hover:underline">
                          Download PDF
                        </a>
                      ) : (
                        <a href={`/f/${row.token}`} target="_blank" className="text-gray-500 hover:text-gray-900 font-medium text-sm">
                          View Draft →
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No submissions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
