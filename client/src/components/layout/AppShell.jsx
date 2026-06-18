import { useState } from 'react';
import { Sidebar } from './Sidebar.jsx';

export function AppShell({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex h-16 items-center justify-between px-4 bg-surface border-b border-border sticky top-0 z-30">
        <h2 className="text-xl text-primary font-display font-bold">Swarna Ledger</h2>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-ink hover:text-primary transition-colors"
        >
          ☰
        </button>
      </div>

      <Sidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      <main className="flex-1 md:pl-64 w-full">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
