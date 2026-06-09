import { useState, useEffect } from 'react';
import { api } from './api.js';
import Header from './components/Header.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProjectListPage from './pages/ProjectListPage.jsx';
import WizardPage from './pages/WizardPage.jsx';
import AssemblyPage from './pages/AssemblyPage.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('projects'); // 'projects' | 'wizard' | 'assembly'
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

  function handleEditStep(stepId) {
    setPage('wizard');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        กำลังโหลด...
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header
        user={user}
        onLogout={handleLogout}
        projectName={currentProject?.name?.replace('.techport.json', '')}
        model={model}
      />

      <main className="flex flex-col flex-1 min-h-0">
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
      </main>
    </div>
  );
}
