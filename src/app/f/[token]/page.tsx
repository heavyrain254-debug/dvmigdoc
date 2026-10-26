'use client';
import { useState, useEffect, use } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type IndexMapping = { id: string; name: string; mapping: string };
type MappingCabinet = { id: string; name: string; indexes: IndexMapping[]; folderStructure: 'same' | 'change'; customFolderStructure: string };
type CabinetRow = { id: string; name: string; migrate: string; cutover: string; users: string };

export default function Form({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    accessRestrictions: '', sqlServerNotes: '', migrationSize: '',
    cabinetsList: [{ id: crypto.randomUUID(), name: '', migrate: 'Yes', cutover: '', users: '' }] as CabinetRow[],
    mappingCabinets: [
      { id: crypto.randomUUID(), name: '', indexes: [{ id: crypto.randomUUID(), name: 'Client', mapping: 'Code-Description' }, { id: crypto.randomUUID(), name: 'Matter', mapping: 'Code-Description' }], folderStructure: 'same', customFolderStructure: '' }
    ] as MappingCabinet[],
    authorFormat: 'Same format as in Worldox', authorOther: '',
    commentsOption: 'Description', docIdOption: 'Document Notes',
    overwriteOption: 'Allow users to overwrite documents created by others',
    metadataOption: 'Administrators only', metadataUsers: '',
    stampingRequired: 'No', stampingRequirement: '',
    pdfEditor: 'Docsvault\'s Built in PDF Editor', signature: ''
  });

  useEffect(() => {
    fetch(`/api/form/${token}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.data && resData.data.accessRestrictions !== undefined) setFormData(resData.data);
        if (resData.status === 'SUBMITTED') setIsSubmitted(true);
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    if (loading || isSubmitted) return;
    const timer = setTimeout(() => {
      setSaving(true);
      fetch(`/api/form/${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formData })
      }).then(() => setSaving(false));
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData, loading, isSubmitted, token]);

  const updateField = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));
  const addCabinetRow = () => updateField('cabinetsList', [...formData.cabinetsList, { id: crypto.randomUUID(), name: '', migrate: 'Yes', cutover: '', users: '' }]);
  const removeCabinetRow = (id: string) => updateField('cabinetsList', formData.cabinetsList.filter(c => c.id !== id));
  const updateCabinetRow = (id: string, field: keyof CabinetRow, value: string) => updateField('cabinetsList', formData.cabinetsList.map(c => c.id === id ? { ...c, [field]: value } : c));
  
  const addMappingCabinet = () => updateField('mappingCabinets', [...formData.mappingCabinets, { id: crypto.randomUUID(), name: '', indexes: [{ id: crypto.randomUUID(), name: '', mapping: 'Code-Description' }], folderStructure: 'same', customFolderStructure: '' }]);
  const removeMappingCabinet = (id: string) => updateField('mappingCabinets', formData.mappingCabinets.filter(c => c.id !== id));
  const updateMappingCabinet = (id: string, field: string, value: any) => updateField('mappingCabinets', formData.mappingCabinets.map(c => c.id === id ? { ...c, [field]: value } : c));
  const addIndex = (cabId: string) => updateField('mappingCabinets', formData.mappingCabinets.map(c => c.id === cabId ? { ...c, indexes: [...c.indexes, { id: crypto.randomUUID(), name: '', mapping: 'Code-Description' }] } : c));
  const removeIndex = (cabId: string, idxId: string) => updateField('mappingCabinets', formData.mappingCabinets.map(c => c.id === cabId ? { ...c, indexes: c.indexes.filter(i => i.id !== idxId) } : c));
  const updateIndex = (cabId: string, idxId: string, field: string, value: string) => updateField('mappingCabinets', formData.mappingCabinets.map(c => c.id === cabId ? { ...c, indexes: c.indexes.map(i => i.id === idxId ? { ...i, [field]: value } : i) } : c));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.signature) return;
    setSubmitting(true);

    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.setTextColor(126, 172, 247);
      doc.text("Worldox to Docsvault Migration Form", 14, 20);
      
      doc.setFontSize(12);
      doc.setTextColor(0,0,0);
      let yPos = 30;

      doc.text(`1.1 Access Restrictions: ${formData.accessRestrictions}`, 14, yPos); yPos += 10;
      doc.text(`1.2 SQL Server Notes: ${formData.sqlServerNotes}`, 14, yPos); yPos += 10;
      doc.text(`1.3 Migration Size: ${formData.migrationSize}`, 14, yPos); yPos += 15;

      autoTable(doc, {
        startY: yPos,
        head: [['Cabinet Name', 'Migrate', 'Cutover Date', 'Users/Groups']],
        body: formData.cabinetsList.map(c => [c.name, c.migrate, c.cutover, c.users]),
        theme: 'grid',
        headStyles: { fillColor: [126, 172, 247] }
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;

      formData.mappingCabinets.forEach((cab, i) => {
        doc.text(`Cabinet ${i + 1}: ${cab.name || 'Unnamed'}`, 14, yPos); yPos += 5;
        autoTable(doc, {
          startY: yPos,
          head: [['Index Name', 'Mapping']],
          body: cab.indexes.map(idx => [idx.name, idx.mapping]),
          theme: 'grid'
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
        doc.text(`Folder Structure: ${cab.folderStructure === 'same' ? 'Same as Worldox' : cab.customFolderStructure}`, 14, yPos); yPos += 15;
      });

      doc.setTextColor(236, 45, 56);
      doc.text(`Signed By: ${formData.signature}`, 14, yPos);
      doc.setTextColor(100,100,100);
      doc.setFontSize(10);
      doc.text(`Date: ${new Date().toLocaleString()}`, 14, yPos + 7);

      const pdfBase64 = doc.output('datauristring').split(',')[1];
      doc.save(`Docsvault_Migration_${token}.pdf`);

      const res = await fetch('/api/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, data: formData, pdfBase64 })
      });

      if (res.ok) setIsSubmitted(true);
      else alert('Submission failed.');
    } catch (err) {
      console.error(err);
      alert('Error generating PDF.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-brand-blue font-medium">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 pb-32">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="/images/logo.png" alt="Logo" className="h-8 w-auto object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
            <h1 className="text-lg font-bold tracking-tight">Worldox to Docsvault Migration</h1>
          </div>
          {isSubmitted ? (
             <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-brand-blue/20 text-brand-blue">Submitted</span>
          ) : (
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${saving ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {saving ? 'Saving...' : 'All changes saved'}
            </span>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-24 space-y-8">
        <form className={`space-y-8 ${isSubmitted ? 'opacity-60 pointer-events-none' : ''}`} onSubmit={handleSubmit}>
          
          <div className="bg-white shadow-sm rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-brand-blue px-6 py-4"><h2 className="text-lg font-semibold text-white">1. Information for the IT Team</h2></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">1.1 Access method / restrictions:</label>
                <textarea className="w-full rounded-lg border-gray-300 shadow-sm p-3 border bg-gray-50" rows={3} value={formData.accessRestrictions} onChange={e => updateField('accessRestrictions', e.target.value)} placeholder="Describe access methods..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">1.2 SQL Server plan / notes:</label>
                <textarea className="w-full rounded-lg border-gray-300 shadow-sm p-3 border bg-gray-50" rows={2} value={formData.sqlServerNotes} onChange={e => updateField('sqlServerNotes', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">1.3 Approx Size (GBs) / Number of Cabinets:</label>
                <input type="text" className="w-full rounded-lg border-gray-300 shadow-sm p-3 border bg-gray-50" value={formData.migrationSize} onChange={e => updateField('migrationSize', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-brand-red px-6 py-4 rounded-2xl shadow-sm mt-12 mb-4"><h2 className="text-lg font-semibold text-white">2. Information from the Decision-Maker</h2></div>

          <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-2">2.1.1 Cabinets to be migrated</h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg mt-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cabinet Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Migrate?</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Cutover Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Users/Groups</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.cabinetsList.map((cab) => (
                    <tr key={cab.id}>
                      <td className="px-2 py-2"><input className="w-full border-gray-300 rounded p-2 text-sm" value={cab.name} onChange={e => updateCabinetRow(cab.id, 'name', e.target.value)} placeholder="Cabinet Name" /></td>
                      <td className="px-2 py-2"><select className="w-full border-gray-300 rounded p-2 text-sm bg-white" value={cab.migrate} onChange={e => updateCabinetRow(cab.id, 'migrate', e.target.value)}><option>Yes</option><option>No</option></select></td>
                      <td className="px-2 py-2"><input type="date" className="w-full border-gray-300 rounded p-2 text-sm" value={cab.cutover} onChange={e => updateCabinetRow(cab.id, 'cutover', e.target.value)} /></td>
                      <td className="px-2 py-2"><input className="w-full border-gray-300 rounded p-2 text-sm" value={cab.users} onChange={e => updateCabinetRow(cab.id, 'users', e.target.value)} placeholder="Users" /></td>
                      <td className="px-2 py-2 text-center"><button type="button" onClick={() => removeCabinetRow(cab.id)} className="text-brand-red font-bold">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addCabinetRow} className="mt-4 text-sm font-medium text-brand-blue">+ Add Cabinet Row</button>
          </div>

          <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">2.2 Individual Index mapping and folder structure</h3>
            <div className="space-y-8">
              {formData.mappingCabinets.map((cabinet, idx) => (
                <div key={cabinet.id} className="border border-gray-300 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                    <h4 className="font-bold text-gray-800">Cabinet {idx + 1}</h4>
                    <button type="button" onClick={() => removeMappingCabinet(cabinet.id)} className="text-sm text-brand-red">Remove</button>
                  </div>
                  <div className="p-4 space-y-6">
                    <input className="w-full rounded-lg border-gray-300 p-3 border bg-gray-50" placeholder="Enter Cabinet Name" value={cabinet.name} onChange={(e) => updateMappingCabinet(cabinet.id, 'name', e.target.value)} />
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <label className="text-sm font-semibold text-gray-700">Index Mapping</label>
                        <button type="button" onClick={() => addIndex(cabinet.id)} className="text-sm text-brand-blue">+ Add Index</button>
                      </div>
                      <table className="w-full border border-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr><th className="p-2 border-b text-left">Index name</th><th className="p-2 border-b text-left">Docsvault mapping</th><th className="p-2 border-b w-10"></th></tr>
                        </thead>
                        <tbody>
                          {cabinet.indexes.map((index) => (
                            <tr key={index.id}>
                              <td className="p-2 border-b"><input className="w-full border-gray-300 rounded p-1" value={index.name} onChange={(e) => updateIndex(cabinet.id, index.id, 'name', e.target.value)} /></td>
                              <td className="p-2 border-b">
                                <select className="w-full border-gray-300 rounded p-1 bg-white" value={index.mapping} onChange={(e) => updateIndex(cabinet.id, index.id, 'mapping', e.target.value)}>
                                  <option>Code-Description</option><option>Code</option><option>Description</option>
                                </select>
                              </td>
                              <td className="p-2 border-b text-center"><button type="button" onClick={() => removeIndex(cabinet.id, index.id)} className="text-brand-red font-bold">✕</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Folder Structure:</label>
                      <div className="flex gap-4 mb-2">
                        <label className="flex items-center gap-2 text-sm"><input type="radio" name={`fs-${cabinet.id}`} checked={cabinet.folderStructure === 'same'} onChange={() => updateMappingCabinet(cabinet.id, 'folderStructure', 'same')} /> Keep same as Worldox</label>
                        <label className="flex items-center gap-2 text-sm"><input type="radio" name={`fs-${cabinet.id}`} checked={cabinet.folderStructure === 'change'} onChange={() => updateMappingCabinet(cabinet.id, 'folderStructure', 'change')} /> Change to:</label>
                      </div>
                      {cabinet.folderStructure === 'change' && (
                        <input className="w-full rounded-lg border-gray-300 p-2 border text-sm" placeholder="Client >> Matter >> Documents" value={cabinet.customFolderStructure} onChange={(e) => updateMappingCabinet(cabinet.id, 'customFolderStructure', e.target.value)} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addMappingCabinet} className="mt-6 w-full py-2 border-2 border-dashed border-brand-blue text-brand-blue rounded-xl font-medium">+ Add Another Cabinet Mapping</button>
          </div>

          <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-6 sm:p-8 border-t-4 border-t-brand-red">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Sign & Submit</h3>
            <p className="text-sm text-gray-600 mb-4">Type your full name to electronically sign. Once submitted, you cannot edit this form.</p>
            <input type="text" className="w-full border p-3 rounded-lg bg-gray-50 font-medium" value={formData.signature} onChange={(e) => updateField('signature', e.target.value)} placeholder="Full Name" />
            <div className="mt-6 flex justify-end">
              <button type="submit" disabled={!formData.signature || isSubmitted || submitting} className="px-10 py-3 rounded-full text-white bg-brand-blue hover:bg-brand-blue/90 font-medium disabled:bg-gray-400">
                {submitting ? 'Generating PDF...' : isSubmitted ? 'Submitted' : 'Sign & Submit Form'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
