export default function Header({ user, onLogout, projectName, model }) {
  const modelLabel = model ? model.split('/').pop() : '';

  return (
    <header className="bg-navy border-b-2 border-gold px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-base font-bold text-white leading-tight tracking-wide">Tech Portfolio</h1>
          {projectName
            ? <p className="text-xs text-gold-light">{projectName}</p>
            : <p className="text-xs text-gold-light opacity-70">Deep Mentorship Program · มหาวิทยาลัยแม่โจ้</p>
          }
        </div>
      </div>
      {user && (
        <div className="flex items-center gap-3">
          {modelLabel && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gold/40 bg-white/10 text-xs text-gold-light font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
              {modelLabel}
            </span>
          )}
          {user.picture && (
            <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full ring-2 ring-gold/50" referrerPolicy="no-referrer" />
          )}
          <span className="text-sm text-white/80 hidden sm:block">{user.name}</span>
          <button
            onClick={onLogout}
            className="text-xs text-gold-light/70 hover:text-gold transition-colors border border-gold/30 hover:border-gold px-2 py-1 rounded"
          >
            ออกจากระบบ
          </button>
        </div>
      )}
    </header>
  );
}
