import { CompanySearchPage } from '@/pages/CompanySearch';

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-card px-4 py-3 sm:px-6">
        <h1 className="text-lg font-semibold tracking-tight">Apollo Company Search</h1>
        <p className="text-xs text-muted-foreground">Standalone search — results from Apollo (credits apply).</p>
      </header>
      <main className="mx-auto max-w-[1600px] p-4 sm:p-6">
        <CompanySearchPage />
      </main>
    </div>
  );
}
