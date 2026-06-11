import { useState, useEffect } from 'react';
import { api } from './api.js';
import Header from './components/Header.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProjectListPage from './pages/ProjectListPage.jsx';
import WizardPage from './pages/WizardPage.jsx';
import AssemblyPage from './pages/AssemblyPage.jsx';
import MentoringPlanPage from './pages/MentoringPlanPage.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('projects'); // 'projects' | 'wizard' | 'assembly' | 'mentoringPlan'
  const [currentProject, setCurrentProject] = useState(null); // { id, name, data }
  const [model, setModel] = useState('');

  useEffect(() => {
    api.get('/api/config').then(d => setModel(d.model)).catch(() => {});
    api.get('/api/auth/me')
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await api.post('/api/auth/logout', {});
    setUser(null);
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

  const projectOpen = currentProject && page !== 'projects';

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        user={user}
        onLogout={handleLogout}
        projectName={currentProject?.name?.replace('.techport.json', '')}
        model={model}
      />

      <main className="flex flex-col flex-1 min-h-0">
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
