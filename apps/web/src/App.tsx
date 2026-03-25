import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth } from './components/RequireAuth';
import { RequireAdmin } from './components/RequireAdmin';
import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { MySubmissionsPage } from './pages/MySubmissionsPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { HospitalManagementPage } from './pages/admin/HospitalManagementPage';
import { IntervalSettingsPage } from './pages/admin/IntervalSettingsPage';
import { ThemeSettingsPage } from './pages/admin/ThemeSettingsPage';
import { DataExportPage } from './pages/admin/DataExportPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Auth required */}
      <Route path="/change-password" element={<RequireAuth><ChangePasswordPage /></RequireAuth>} />
      <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
      <Route path="/my-submissions" element={<RequireAuth><MySubmissionsPage /></RequireAuth>} />

      {/* Admin only */}
      <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
      <Route path="/admin/users" element={<RequireAdmin><UserManagementPage /></RequireAdmin>} />
      <Route path="/admin/hospitals" element={<RequireAdmin><HospitalManagementPage /></RequireAdmin>} />
      <Route path="/admin/intervals" element={<RequireAdmin><IntervalSettingsPage /></RequireAdmin>} />
      <Route path="/admin/theme" element={<RequireAdmin><ThemeSettingsPage /></RequireAdmin>} />
      <Route path="/admin/data" element={<RequireAdmin><DataExportPage /></RequireAdmin>} />
      <Route path="/admin/audit" element={<RequireAdmin><AuditLogPage /></RequireAdmin>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
