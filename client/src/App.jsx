import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthProvider.jsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute.jsx';
import { AppShell } from './components/layout/AppShell.jsx';
import { FullPageSpinner } from './components/ui/FullPageSpinner.jsx';

const LoginPage = lazy(() => import('./features/auth/LoginPage.jsx').then(module => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import('./features/auth/SignupPage.jsx').then(module => ({ default: module.SignupPage })));
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage.jsx').then(module => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./features/auth/ResetPasswordPage.jsx').then(module => ({ default: module.ResetPasswordPage })));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage.jsx').then(module => ({ default: module.DashboardPage })));
const PurchasesPage = lazy(() => import('./features/purchases/PurchasesPage.jsx').then(module => ({ default: module.PurchasesPage })));
const RatesPanel = lazy(() => import('./features/rates/RatesPanel.jsx').then(module => ({ default: module.RatesPanel })));
const LogsPage = lazy(() => import('./features/logs/LogsPage.jsx').then(module => ({ default: module.LogsPage })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage.jsx').then(module => ({ default: module.SettingsPage })));
const MembersPage = lazy(() => import('./features/members/MembersPage.jsx').then(module => ({ default: module.MembersPage })));
const MemberDetailPage = lazy(() => import('./features/members/MemberDetailPage.jsx').then(module => ({ default: module.MemberDetailPage })));

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
        <Suspense fallback={<FullPageSpinner variant="gold" message="Loading Swarna Ledger..." />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <AppShell>
                    <DashboardPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/transactions" 
              element={
                <ProtectedRoute>
                  <AppShell>
                    <PurchasesPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/members" 
              element={
                <ProtectedRoute>
                  <AppShell>
                    <MembersPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/members/:id" 
              element={
                <ProtectedRoute>
                  <AppShell>
                    <MemberDetailPage />
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
                    <SettingsPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
}

export default App;
