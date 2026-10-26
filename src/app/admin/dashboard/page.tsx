'use client';
import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/data').then(res => res.json()).then(d => setData(d));
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Submissions Dashboard</h1>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">Client ID / Token</th>
              <th className="p-4">Status</th>
              <th className="p-4">Last Updated</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b">
                <td className="p-4 font-mono text-sm">{row.token}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${row.status === 'SUBMITTED' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                    {row.status}
                  </span>
                </td>
                <td className="p-4 text-sm">{new Date(row.updated_at).toLocaleString()}</td>
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
