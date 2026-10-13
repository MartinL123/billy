export default function App() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-4 px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-center">
      <div className="flex size-24 items-center justify-center rounded-[28px] bg-primary shadow-[0_8px_20px_rgba(30,90,80,0.28)]">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
          <ellipse cx="7" cy="8" rx="1.8" ry="2.3" />
          <ellipse cx="12" cy="6" rx="1.8" ry="2.3" />
          <ellipse cx="17" cy="8" rx="1.8" ry="2.3" />
          <ellipse cx="4.6" cy="12.6" rx="1.6" ry="2" />
          <ellipse cx="19.4" cy="12.6" rx="1.6" ry="2" />
          <path d="M12 11c-3 0-5.5 3.2-5.5 5.6 0 1.8 1.4 2.6 2.8 2.6 1.1 0 1.8-.6 2.7-.6s1.6.6 2.7.6c1.4 0 2.8-.8 2.8-2.6C17.5 14.2 15 11 12 11z" />
        </svg>
      </div>
      <h1 className="font-display text-[34px] font-bold tracking-[-0.5px]">Bonjour Billy</h1>
      <p className="text-muted">Son calendrier, ses souvenirs, ses papiers.</p>
    </main>
  )
}
