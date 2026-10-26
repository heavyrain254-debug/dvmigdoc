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
    commentsOption: 'Description', docIdOption: 'Document Notes (We recommend using this for DocID)',
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

      doc.text(`2.3 Author/Typist: ${formData.authorFormat} ${formData.authorOther ? `(${formData.authorOther})` : ''}`, 14, yPos); yPos += 10;
      doc.text(`2.4 Comments: ${formData.commentsOption}`, 14, yPos); yPos += 10;
      doc.text(`2.5 DocID: ${formData.docIdOption}`, 14, yPos); yPos += 10;
      doc.text(`2.6 Overwrite Permissions: ${formData.overwriteOption}`, 14, yPos); yPos += 10;
      doc.text(`2.7 Metadata Values: ${formData.metadataOption} ${formData.metadataUsers ? `(${formData.metadataUsers})` : ''}`, 14, yPos); yPos += 10;
      doc.text(`2.8 Document Stamping: ${formData.stampingRequired} ${formData.stampingRequirement ? `- ${formData.stampingRequirement}` : ''}`, 14, yPos); yPos += 10;
      doc.text(`2.9 PDF Editing: ${formData.pdfEditor}`, 14, yPos); yPos += 15;

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
          
          {/* 1 */}
          <div className="bg-white shadow-sm rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-brand-blue px-6 py-4"><h2 className="text-lg font-semibold text-white">1. Information for the IT Team</h2></div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-gray-800">1.1 Access to the Docsvault machine and Worldox</h3>
                <p className="text-sm text-gray-600 mt-1 mb-3">How will the Docsvault team be given access to the Docsvault machine and Worldox for setup and migration? We recommend unattended access during migration so we can monitor progress and make changes when needed. We will follow your IT security policies and approved access process.</p>
                <label className="block text-sm font-medium text-gray-700 mb-1">Access method / any restrictions:</label>
                <textarea className="w-full rounded-lg border-gray-300 shadow-sm p-3 border bg-gray-50" rows={3} value={formData.accessRestrictions} onChange={e => updateField('accessRestrictions', e.target.value)} placeholder="Describe access methods..." />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">1.2 SQL Server</h3>
                <p className="text-sm text-gray-600 mt-1 mb-3">Docsvault includes SQL Server Express. Depending on the repository size and number of users, you may have to provision a SQL Server Standard database. Roughly, you need a Standard SQL Server License if any of the following is true: 1. Your documents repository size will be &gt;500 GB 2. Users will be &gt;15 3. The number of documents to be saved is &gt;500K. <br/><em>Note: Close to these numbers? We can discuss the requirements on a case-by-case basis.</em></p>
                <label className="block text-sm font-medium text-gray-700 mb-1">SQL Server plan / notes:</label>
                <textarea className="w-full rounded-lg border-gray-300 shadow-sm p-3 border bg-gray-50" rows={2} value={formData.sqlServerNotes} onChange={e => updateField('sqlServerNotes', e.target.value)} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">1.3 Migration size</h3>
                <label className="block text-sm font-medium text-gray-700 mt-2 mb-1">Please mention Approx Size (GBs) and Number of Cabinets/Files here:</label>
                <input type="text" className="w-full rounded-lg border-gray-300 shadow-sm p-3 border bg-gray-50" value={formData.migrationSize} onChange={e => updateField('migrationSize', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-brand-red px-6 py-4 rounded-2xl shadow-sm mt-12 mb-4"><h2 className="text-lg font-semibold text-white">2. Information from the Worldox Migration Decision-Maker</h2></div>

          {/* 2.1.1 */}
          <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-2">2.1.1 Cabinets to be migrated</h3>
            <p className="text-sm text-gray-600 mb-6">Please list all Worldox cabinets that should be migrated to Docsvault. Please also let us know if there is a specific cutover date, as we can exclude any documents dated before that date from the migration to Docsvault.</p>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
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

          {/* 2.1.2 */}
          <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-2">2.1.2 Understanding Index and metadata mapping (Informational Only)</h3>
            <p className="text-sm text-gray-600 mb-4">Worldox stores an index value as two fields: Code(ID) and Description. Docsvault uses one field, so please choose how each index should appear after migration.</p>
            
            <table className="max-w-md w-full border border-gray-300 text-sm text-left mb-4">
              <thead className="bg-gray-100"><tr><th className="p-2 border-b">Mapping option</th><th className="p-2 border-b">Example Client Value</th></tr></thead>
              <tbody>
                <tr className="bg-white"><td className="p-2 border-b">Code - Description</td><td className="p-2 border-b">001 - Acme Corp</td></tr>
                <tr className="bg-white"><td className="p-2 border-b">Code only</td><td className="p-2 border-b">001</td></tr>
                <tr className="bg-white"><td className="p-2 border-b">Description only</td><td className="p-2 border-b">Acme Corp</td></tr>
              </tbody>
            </table>
            <p className="text-sm text-gray-600 mb-6">For example, if Client Code = 001 and Client Description = Acme Corp, choose the format you prefer. Apply the same decision to indexes such as Client, Matter, DocType, Author, Creator, and any other indexes used in each cabinet.</p>
            
            {/* 2.1.2 IMAGES with Fail-Safe Placeholders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative min-h-[200px] bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                <img src="/images/2.1.2-metadata-1.png" alt="Metadata 1" className="w-full h-full object-contain p-2 rounded z-10 absolute inset-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="text-gray-500 text-sm text-center px-4 z-0">Missing Image:<br/>2.1.2-metadata-1.png</span>
              </div>
              <div className="relative min-h-[200px] bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                <img src="/images/2.1.2-metadata-2.png" alt="Metadata 2" className="w-full h-full object-contain p-2 rounded z-10 absolute inset-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="text-gray-500 text-sm text-center px-4 z-0">Missing Image:<br/>2.1.2-metadata-2.png</span>
              </div>
            </div>
          </div>

          {/* 2.1.3 */}
          <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-2">2.1.3 Understanding Folder Structure (Informational Only)</h3>
            <p className="text-sm text-gray-600 mb-4">Please let us know how you would like the Worldox folder structure mapped in Docsvault. For example: Client - Matter - Documents. To review the current structure in Worldox, select the cabinet on the left and open its active folder view to see the folder levels and documents.</p>
            
            {/* 2.1.3 IMAGES with Fail-Safe Placeholders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative min-h-[200px] bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                <img src="/images/2.1.3-folder-1.png" alt="Folder 1" className="w-full h-full object-contain p-2 rounded z-10 absolute inset-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="text-gray-500 text-sm text-center px-4 z-0">Missing Image:<br/>2.1.3-folder-1.png</span>
              </div>
              <div className="relative min-h-[200px] bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                <img src="/images/2.1.3-folder-2.png" alt="Folder 2" className="w-full h-full object-contain p-2 rounded z-10 absolute inset-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="text-gray-500 text-sm text-center px-4 z-0">Missing Image:<br/>2.1.3-folder-2.png</span>
              </div>
            </div>
          </div>

          {/* 2.2 */}
          <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">2.2 Individual Index mapping and folder structure decision for all cabinets</h3>
            <div className="space-y-8">
              {formData.mappingCabinets.map((cabinet, idx) => (
                <div key={cabinet.id} className="border border-gray-300 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                    <h4 className="font-bold text-gray-800">2.2.{idx + 1} Cabinet {idx + 1} Name</h4>
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">For Folder Structure:</label>
                      <div className="flex gap-4 mb-2">
                        <label className="flex items-center gap-2 text-sm"><input type="radio" name={`fs-${cabinet.id}`} checked={cabinet.folderStructure === 'same'} onChange={() => updateMappingCabinet(cabinet.id, 'folderStructure', 'same')} /> Keep same as Worldox</label>
                        <label className="flex items-center gap-2 text-sm"><input type="radio" name={`fs-${cabinet.id}`} checked={cabinet.folderStructure === 'change'} onChange={() => updateMappingCabinet(cabinet.id, 'folderStructure', 'change')} /> Change to following:</label>
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

          {/* 2.3 */}
          <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">2.3 Author / Typist</h3>
            <p className="text-sm text-gray-600 mb-4">For Author / Typist fields, what should Docsvault use:</p>
            <div className="space-y-2">
              {['Same format as in Worldox', 'Users\' Full Name', 'Some other format [ ]'].map(opt => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="authorFormat" checked={formData.authorFormat === opt} onChange={() => updateField('authorFormat', opt)} /> {opt}
                </label>
              ))}
              {formData.authorFormat === 'Some other format [ ]' && (
                <input className="mt-2 w-full max-w-md rounded-lg border-gray-300 p-2 border bg-gray-50 text-sm" placeholder="Specify format" value={formData.authorOther} onChange={e => updateField('authorOther', e.target.value)} />
              )}
            </div>
          </div>

          {/* 2.4 */}
          <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-2">2.4 Comments</h3>
            <p className="text-sm text-gray-600 mb-4">Where would you like Worldox comments to be stored in Docsvault?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="relative min-h-[200px] bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                <img src="/images/2.4-comments-1.png" alt="Comments 1" className="w-full h-full object-contain p-2 rounded z-10 absolute inset-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="text-gray-500 text-sm text-center px-4 z-0">Missing Image:<br/>2.4-comments-1.png</span>
              </div>
              <div className="relative min-h-[200px] bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                <img src="/images/2.4-comments-2.png" alt="Comments 2" className="w-full h-full object-contain p-2 rounded z-10 absolute inset-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="text-gray-500 text-sm text-center px-4 z-0">Missing Image:<br/>2.4-comments-2.png</span>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Description', desc: 'Comments appear in the single line Description column in document listing' },
                { label: 'Document Notes', desc: 'Comments are stored in multi line Document Notes in right panel' },
                { label: 'Version Notes', desc: 'Appears in version notes (useful when versions in WD have different comments)' }
              ].map(opt => (
                <label key={opt.label} className="flex items-start gap-2 text-sm p-2 border rounded hover:bg-gray-50">
                  <input type="radio" name="commentsOption" className="mt-1" checked={formData.commentsOption === opt.label} onChange={() => updateField('commentsOption', opt.label)} />
                  <div><span className="font-semibold">{opt.label}</span><br/><span className="text-gray-500">{opt.desc}</span></div>
                </label>
              ))}
            </div>
          </div>

          {/* 2.5 */}
          <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-2">2.5 Worldox DocID</h3>
            <p className="text-sm text-gray-600 mb-4">Does your organization use Worldox Doc IDs to search for documents? If so, where should it be copied to in Docsvault?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="relative min-h-[200px] bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                <img src="/images/2.5-docid-1.png" alt="DocID 1" className="w-full h-full object-contain p-2 rounded z-10 absolute inset-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="text-gray-500 text-sm text-center px-4 z-0">Missing Image:<br/>2.5-docid-1.png</span>
              </div>
              <div className="relative min-h-[200px] bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                <img src="/images/2.5-docid-2.png" alt="DocID 2" className="w-full h-full object-contain p-2 rounded z-10 absolute inset-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="text-gray-500 text-sm text-center px-4 z-0">Missing Image:<br/>2.5-docid-2.png</span>
              </div>
            </div>
            <div className="space-y-2">
              {['Description field (If the field is used for Comments, it cannot also be used for the Doc ID.)', 'Document Notes (We recommend using this for DocID)', 'No need to migrate Doc IDs from Worldox'].map(opt => (
                <label key={opt} className="flex items-center gap-2 text-sm p-2 border rounded hover:bg-gray-50">
                  <input type="radio" name="docIdOption" checked={formData.docIdOption === opt} onChange={() => updateField('docIdOption', opt)} /> {opt}
                </label>
              ))}
            </div>
          </div>

          {/* 2.6 */}
          <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">2.6 Document Overwrite Permissions</h3>
            <p className="text-sm text-gray-600 mb-4">For cabinets where users have access:</p>
            <div className="space-y-2">
              {['Allow users to overwrite documents created by others', 'Force users to create a new version if they do not own the document'].map(opt => (
                <label key={opt} className="flex items-center gap-2 text-sm p-2 border rounded hover:bg-gray-50">
                  <input type="radio" name="overwriteOption" checked={formData.overwriteOption === opt} onChange={() => updateField('overwriteOption', opt)} /> {opt}
                </label>
              ))}
            </div>
          </div>

          {/* 2.7 */}
          <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">2.7 Creating new metadata values</h3>
            <p className="text-sm text-gray-600 mb-4">Who should be allowed to add new values, such as a new Client, Matter, DocType, etc.?</p>
            <div className="space-y-2">
              {['All users', 'Administrators only', 'Selected users / groups'].map(opt => (
                <label key={opt} className="flex items-center gap-2 text-sm p-2 border rounded hover:bg-gray-50">
                  <input type="radio" name="metadataOption" checked={formData.metadataOption === opt} onChange={() => updateField('metadataOption', opt)} /> {opt}
                </label>
              ))}
              {formData.metadataOption === 'Selected users / groups' && (
                <input className="mt-2 w-full max-w-md rounded-lg border-gray-300 p-2 border bg-gray-50 text-sm" placeholder="Mention the name of Users/Groups" value={formData.metadataUsers} onChange={e => updateField('metadataUsers', e.target.value)} />
              )}
            </div>
          </div>

          {/* 2.8 */}
          <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">2.8 Document stamping</h3>
            <p className="text-sm text-gray-600 mb-4">Is document stamping in MS Word required? If yes, what information should appear? Example: DocID or DocID.Version</p>
            <div className="space-y-2">
              {['Yes', 'No'].map(opt => (
                <label key={opt} className="flex items-center gap-2 text-sm p-2 border rounded hover:bg-gray-50">
                  <input type="radio" name="stampingRequired" checked={formData.stampingRequired === opt} onChange={() => updateField('stampingRequired', opt)} /> {opt}
                </label>
              ))}
              {formData.stampingRequired === 'Yes' && (
                <input className="mt-2 w-full max-w-md rounded-lg border-gray-300 p-2 border bg-gray-50 text-sm" placeholder="Mention Stamping requirement here" value={formData.stampingRequirement} onChange={e => updateField('stampingRequirement', e.target.value)} />
              )}
            </div>
          </div>

          {/* 2.9 */}
          <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">2.9 PDF Editing</h3>
            <p className="text-sm text-gray-600 mb-4">Would users prefer to use their own PDF editor or Docsvault's built-in PDF editor?</p>
            <div className="space-y-2">
              {['Docsvault\'s Built in PDF Editor', 'Your current PDF Editor'].map(opt => (
                <label key={opt} className="flex items-center gap-2 text-sm p-2 border rounded hover:bg-gray-50">
                  <input type="radio" name="pdfEditor" checked={formData.pdfEditor === opt} onChange={() => updateField('pdfEditor', opt)} /> {opt}
                </label>
              ))}
            </div>
          </div>

          {/* SIGNATURE */}
          <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-6 sm:p-8 border-t-4 border-t-brand-red">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Sign & Submit</h3>
            <p className="text-sm text-gray-600 mb-4">Please type your full name below to electronically sign and submit this document. Once submitted, a PDF will be downloaded and you will not be able to edit this form.</p>
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
