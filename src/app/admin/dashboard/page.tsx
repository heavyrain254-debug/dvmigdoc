'use client';
import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // State for the inputs
  const [clientName, setClientName] = useState('');
  const [internalClientId, setInternalClientId] = useState('');

  const fetchData = () => {
    fetch('/api/admin/data').then(res => res.json()).then(d => setData(d));
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        
        // Clear inputs and refresh table
        setClientName('');
        setInternalClientId('');
        fetchData(); 
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

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Submissions Dashboard</h1>
        
        {/* Dynamic Link Creator */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
            <input 
              type="text" 
              placeholder="e.g., Acme Corp" 
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:border-brand-blue focus:ring-brand-blue outline-none" 
              value={clientName} 
              onChange={e => setClientName(e.target.value)} 
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Internal Client ID (Your Bookkeeping)</label>
            <input 
              type="text" 
              placeholder="e.g., 10045" 
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:border-brand-blue focus:ring-brand-blue outline-none" 
              value={internalClientId} 
              onChange={e => setInternalClientId(e.target.value)} 
            />
          </div>
          <button 
            onClick={handleCreateLink} 
            disabled={isGenerating}
            className="bg-brand-blue text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-blue/90 disabled:bg-gray-400 whitespace-nowrap"
          >
            {isGenerating ? 'Generating...' : 'Generate Link'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">Internal Client ID</th>
              <th className="p-4">Client Name</th>
              <th className="p-4">Link Token</th>
              <th className="p-4">Status</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="p-4 font-mono text-sm font-bold">{row.internal_client_id || '—'}</td>
                <td className="p-4 font-medium text-gray-900">{row.client_name || '—'}</td>
                <td className="p-4 font-mono text-xs text-gray-500">{row.token}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${row.status === 'SUBMITTED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {row.status}
                  </span>
                </td>
                <td className="p-4">
                  {row.status === 'SUBMITTED' ? (
                    <a href={`/api/admin/data?download=${row.token}`} className="text-brand-blue font-medium hover:underline">Download PDF</a>
                  ) : (
                    <a href={`/f/${row.token}`} target="_blank" className="text-gray-500 hover:underline">View Draft</a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
