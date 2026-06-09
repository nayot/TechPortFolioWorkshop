import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function ProjectListPage({ onOpen }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

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

  async function deleteProject(project) {
    setDeleting(project.id);
    setConfirmDelete(null);
    try {
      await api.delete(`/api/projects/${project.id}`);
      setProjects(prev => prev.filter(p => p.id !== project.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
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
      <div className="mb-8 text-center">
        <div className="w-12 h-1 bg-gold mx-auto rounded-full mb-4" />
        <h2 className="text-2xl font-bold text-navy mb-1">Portfolio ของฉัน</h2>
        <p className="text-sm text-warm-muted">บันทึกใน Google Drive ของคุณ</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-warm-muted">กำลังโหลด...</div>
      ) : (
        <div className="space-y-3">
          {projects.map(p => (
            <div key={p.id} className="bg-parchment border border-warm-border rounded-xl p-4 hover:border-gold transition-colors">
              {confirmDelete?.id === p.id ? (
                <div className="space-y-3">
                  <p className="text-sm text-navy">ต้องการลบ <strong>{p.name.replace('.techport.json', '')}</strong> ใช่ไหม? การดำเนินการนี้ไม่สามารถยกเลิกได้</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => deleteProject(p)}
                      disabled={deleting === p.id}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting === p.id ? 'กำลังลบ...' : 'ยืนยันลบ'}
                    </button>
                    <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 text-warm-muted text-sm hover:text-navy">
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-navy">{p.name.replace('.techport.json', '')}</p>
                    <p className="text-xs text-warm-muted">แก้ไขล่าสุด {formatDate(p.modifiedTime)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmDelete(p)}
                      className="px-2 py-1.5 text-warm-muted text-sm rounded-lg hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="ลบ Portfolio"
                    >
                      🗑
                    </button>
                    <button
                      onClick={() => openProject(p)}
                      className="px-4 py-1.5 bg-navy hover:bg-navy-hover text-white text-sm rounded-lg transition-colors font-medium"
                    >
                      เปิด
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {projects.length === 0 && !showNew && (
            <div className="text-center py-12 text-warm-muted">
              <p className="text-4xl mb-3">📁</p>
              <p className="text-sm">ยังไม่มี portfolio — สร้างอันแรกได้เลย!</p>
            </div>
          )}

          {showNew ? (
            <div className="bg-parchment border-2 border-dashed border-gold/50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-navy">ชื่อ Portfolio ใหม่</p>
              <input
                autoFocus
                className="w-full border border-warm-border bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
                placeholder="เช่น ผศ.ดร.สมชาย — Tech Portfolio 2569"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createProject()}
              />
              <div className="flex gap-2">
                <button
                  onClick={createProject}
                  disabled={creating || !newName.trim()}
                  className="px-4 py-2 bg-navy hover:bg-navy-hover text-white text-sm rounded-lg disabled:opacity-50 font-medium transition-colors"
                >
                  {creating ? 'กำลังสร้าง...' : 'สร้าง'}
                </button>
                <button onClick={() => setShowNew(false)} className="px-4 py-2 text-warm-muted text-sm hover:text-navy">ยกเลิก</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNew(true)}
              className="w-full py-3 border-2 border-dashed border-warm-border text-warm-muted rounded-xl text-sm hover:border-gold hover:text-gold transition-colors font-medium"
            >
              + สร้าง Portfolio ใหม่
            </button>
          )}
        </div>
      )}
    </div>
  );
}
