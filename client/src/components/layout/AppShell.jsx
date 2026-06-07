// client/src/components/layout/AppShell.jsx
import { Sidebar } from './Sidebar.jsx';

export function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <main className="pl-64">
        <div className="max-w-6xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
