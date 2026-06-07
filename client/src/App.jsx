import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthProvider.jsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute.jsx';
import { LoginPage } from './features/auth/LoginPage.jsx';
import { PurchasesPage } from './features/purchases/PurchasesPage.jsx';
import { RatesPanel } from './features/rates/RatesPanel.jsx';
import { LogsPage } from './features/logs/LogsPage.jsx';
import { AppShell } from './components/layout/AppShell.jsx';

function Placeholder({ title }) {
  return (
    <div className="p-8 bg-surface rounded-lg border border-border shadow-md text-center">
      <h1 className="text-2xl text-primary mb-4">{title}</h1>
      <p className="text-ink-muted italic">Implementation coming soon...</p>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <AppShell>
                  <PurchasesPage />
                </AppShell>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/rates" 
            element={
              <ProtectedRoute>
                <AppShell>
                  <RatesPanel />
                </AppShell>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/logs" 
            element={
              <ProtectedRoute>
                <AppShell>
                  <LogsPage />
                </AppShell>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/settings" 
            element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <AppShell>
                  <Placeholder title="Settings" />
                </AppShell>
              </ProtectedRoute>
            } 
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
