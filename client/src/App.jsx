import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthProvider.jsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute.jsx';
import { LoginPage } from './features/auth/LoginPage.jsx';
import { useAuth } from './features/auth/AuthProvider.jsx';

function Dashboard() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen p-8 bg-bg">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl text-primary">Dashboard</h1>
          <button onClick={logout} className="btn border border-border hover:bg-surface">
            Logout
          </button>
        </div>
        
        <div className="bg-surface p-8 rounded-lg border border-border shadow-md">
          <p className="text-ink text-lg italic mb-4">Welcome back, {user?.full_name}!</p>
          <div className="grid grid-cols-2 gap-4 text-sm font-mono">
            <div className="text-ink-muted">Role:</div>
            <div className="text-primary">{user?.role}</div>
            <div className="text-ink-muted">Email:</div>
            <div className="text-ink">{user?.email}</div>
          </div>
        </div>

        <div className="p-8 bg-primary-subtle/30 border border-primary/20 rounded-lg text-center">
          <p className="text-ink-muted italic">Phase 1: Auth & RBAC Complete</p>
        </div>
      </div>
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
                <Dashboard />
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
