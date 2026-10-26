'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/login', {
      method: 'POST', body: JSON.stringify({ password })
    });
    if (res.ok) router.push('/admin/dashboard');
    else alert('Wrong password');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-md w-96">
        <h1 className="text-xl font-bold mb-4">Admin Login</h1>
        <input type="password" placeholder="Password" className="w-full border p-2 rounded mb-4" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit" className="w-full bg-brand-blue text-white py-2 rounded font-bold">Login</button>
      </form>
    </div>
  );
}
