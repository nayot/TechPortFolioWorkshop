export default function Header({ user, onLogout, projectName }) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-base font-semibold text-gray-900 leading-tight">Tech Portfolio</h1>
          {projectName && (
            <p className="text-xs text-gray-500">{projectName}</p>
          )}
        </div>
      </div>
      {user && (
        <div className="flex items-center gap-3">
          {user.picture && (
            <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
          )}
          <span className="text-sm text-gray-700 hidden sm:block">{user.name}</span>
          <button
            onClick={onLogout}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            ออกจากระบบ
          </button>
        </div>
      )}
    </header>
  );
}
