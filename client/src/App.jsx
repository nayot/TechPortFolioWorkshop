import { useState, useEffect } from 'react';
import { api } from './api.js';
import Header from './components/Header.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProjectListPage from './pages/ProjectListPage.jsx';
import WizardPage from './pages/WizardPage.jsx';
import AssemblyPage from './pages/AssemblyPage.jsx';
import MentoringPlanPage from './pages/MentoringPlanPage.jsx';
import AdminPage from './pages/AdminPage.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('projects'); // 'projects' | 'wizard' | 'assembly' | 'mentoringPlan' | 'admin'
  const [currentProject, setCurrentProject] = useState(null); // { id, name, data }
  const [model, setModel] = useState('');
  const [appEnabled, setAppEnabled] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    api.get('/api/config').then(d => {
      setModel(d.model);
      setAppEnabled(d.appEnabled !== false);
    }).catch(() => {});
    api.get('/api/auth/me')
      .then(data => { setUser(data.user); setIsAdmin(data.isAdmin === true); })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await api.post('/api/auth/logout', {});
    setUser(null);
    setIsAdmin(false);
    setPage('projects');
    setCurrentProject(null);
  }

  function handleOpenProject({ id, name, data }) {
    setCurrentProject({ id, name, data });
    setPage('wizard');
  }

  function handleAssemble(updatedData) {
    setCurrentProject(prev => ({ ...prev, data: updatedData }));
    setPage('assembly');
  }

  function handleEditStep() {
    setPage('wizard');
  }

  function handleProjectUpdate(data) {
    setCurrentProject(prev => ({ ...prev, data }));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-warm-muted">
        กำลังโหลด...
      </div>
    );
  }

  if (!user) return <LoginPage />;

  if (!appEnabled && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header user={user} onLogout={handleLogout} model={model} />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4 text-2xl">
              🔒
            </div>
            <h2 className="text-xl font-bold text-gray-500 mb-2">ระบบยังไม่เปิดใช้งาน</h2>
            <p className="text-sm text-gray-400">กรุณาติดต่อผู้ดูแลระบบ</p>
          </div>
        </div>
      </div>
    );
  }

  const projectOpen = currentProject && page !== 'projects' && page !== 'admin';

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        user={user}
        onLogout={handleLogout}
        projectName={currentProject?.name?.replace('.techport.json', '')}
        model={model}
      />

      <main className="flex flex-col flex-1 min-h-0">
        {isAdmin && (
          <div className="flex border-b border-warm-border bg-parchment px-4 pt-2">
            <TabButton active={page === 'admin'} onClick={() => setPage('admin')}>
              ⚙ ผู้ดูแลระบบ
            </TabButton>
          </div>
        )}

        {projectOpen && (
          <div className="flex border-b border-warm-border bg-parchment px-4 pt-2">
            <TabButton
              active={page === 'wizard' || page === 'assembly'}
              onClick={() => setPage(page === 'assembly' ? 'assembly' : 'wizard')}
            >
              Portfolio ของ Mentee
            </TabButton>
            <TabButton
              active={page === 'mentoringPlan'}
              onClick={() => setPage('mentoringPlan')}
            >
              แผน Mentoring
            </TabButton>
          </div>
        )}

        {page === 'admin' && isAdmin && (
          <AdminPage onConfigChange={(cfg) => {
            setAppEnabled(cfg.appEnabled);
            setModel(cfg.model);
          }} />
        )}

        {page === 'projects' && (
          <ProjectListPage onOpen={handleOpenProject} />
        )}

        {page === 'wizard' && currentProject && (
          <WizardPage
            projectMeta={{ id: currentProject.id, name: currentProject.name }}
            initialData={currentProject.data}
            onAssemble={handleAssemble}
            onBack={() => setPage('projects')}
          />
        )}

        {page === 'assembly' && currentProject && (
          <AssemblyPage
            project={currentProject.data}
            projectMeta={{ id: currentProject.id, name: currentProject.name }}
            onEditStep={handleEditStep}
            onBack={() => setPage('wizard')}
          />
        )}

        {page === 'mentoringPlan' && currentProject && (
          <MentoringPlanPage
            project={currentProject.data}
            projectMeta={{ id: currentProject.id, name: currentProject.name }}
            onProjectUpdate={handleProjectUpdate}
            onBack={() => setPage('projects')}
          />
        )}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px ${
        active
          ? 'border-navy text-navy'
          : 'border-transparent text-warm-muted hover:text-navy'
      }`}
    >
      {children}
    </button>
  );
}
