import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function ProjectListPage({ onOpen }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    api.get('/api/projects')
      .then(data => setProjects(data.projects || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function createProject() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const data = await api.post('/api/projects', { name: newName.trim() });
      onOpen({ id: data.id, name: data.name, data: data.data });
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  async function openProject(project) {
    try {
      const data = await api.get(`/api/projects/${project.id}`);
      onOpen({ id: project.id, name: project.name, data });
    } catch (err) {
      setError(err.message);
    }
  }

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Portfolio ของฉัน</h2>
      <p className="text-sm text-gray-500 mb-6">บันทึกใน Google Drive ของคุณ</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>
      ) : (
        <div className="space-y-3">
          {projects.map(p => (
            <div key={p.id} className="flex items-center justify-between border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-900">{p.name.replace('.techport.json', '')}</p>
                <p className="text-xs text-gray-400">แก้ไขล่าสุด {formatDate(p.modifiedTime)}</p>
              </div>
              <button
                onClick={() => openProject(p)}
                className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
              >
                เปิด
              </button>
            </div>
          ))}

          {projects.length === 0 && !showNew && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">📁</p>
              <p className="text-sm">ยังไม่มี portfolio — สร้างอันแรกได้เลย!</p>
            </div>
          )}

          {showNew ? (
            <div className="border border-dashed border-indigo-300 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">ชื่อ Portfolio ใหม่</p>
              <input
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="เช่น ผศ.ดร.สมชาย — Tech Portfolio 2569"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createProject()}
              />
              <div className="flex gap-2">
                <button
                  onClick={createProject}
                  disabled={creating || !newName.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? 'กำลังสร้าง...' : 'สร้าง'}
                </button>
                <button onClick={() => setShowNew(false)} className="px-4 py-2 text-gray-500 text-sm">ยกเลิก</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNew(true)}
              className="w-full py-3 border-2 border-dashed border-gray-200 text-gray-500 rounded-xl text-sm hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              + สร้าง Portfolio ใหม่
            </button>
          )}
        </div>
      )}
    </div>
  );
}
