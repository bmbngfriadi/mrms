import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import { ModalProvider } from './context/ModalContext';
import Shell from './layouts/Shell';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RoomsList from './pages/RoomsList';
import RoomDetail from './pages/RoomDetail';
import CalendarView from './pages/CalendarView';
import CreateBooking from './pages/CreateBooking';
import MyBookings from './pages/MyBookings';
import BookingDetail from './pages/BookingDetail';
import QRScanCheckin from './pages/QRScanCheckin';
import QRScanCheckout from './pages/QRScanCheckout';
import HistoryPage from './pages/History';
import Profile from './pages/Profile';

// Admin / HRGA Pages
import HRGALiveMonitoring from './pages/admin/HRGALiveMonitoring';
import HRGAAllBookings from './pages/admin/HRGAAllBookings';
import HRGAOverdue from './pages/admin/HRGAOverdue';
import HRGABlocks from './pages/admin/HRGABlocks';
import HRGAReports from './pages/admin/HRGAReports';
import HRGANotificationLogs from './pages/admin/HRGANotificationLogs';
import AdminUsers from './pages/admin/AdminUsers';
import AdminDepartments from './pages/admin/AdminDepartments';
import AdminRooms from './pages/admin/AdminRooms';
import AdminQRManagement from './pages/admin/AdminQRManagement';
import AdminSettings from './pages/admin/AdminSettings';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import WhatsAppGateway from './pages/admin/WhatsAppGateway';

// Protected Route Guard
function ProtectedRoute({ children, allowedRoles, requiredPermission }) {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-bold">
        Memverifikasi otentikasi...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If not in allowedRoles, check if user has the specific required permission override
    if (!requiredPermission || !hasPermission(requiredPermission)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

export default function App() {
  const basename = typeof window !== 'undefined' && window.location.pathname.startsWith('/meeting-room')
    ? '/meeting-room'
    : '/mrms';

  return (
    <I18nProvider>
      <AuthProvider>
        <ModalProvider>
          <BrowserRouter basename={basename}>
            <Routes>
          {/* Public Login */}
          <Route path="/login" element={<Login />} />

          {/* Protected Application Routes inside Shell */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Shell />
              </ProtectedRoute>
            }
          >
            {/* Employee Routes */}
            <Route index element={<ProtectedRoute requiredPermission="menu:dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="rooms" element={<ProtectedRoute requiredPermission="menu:rooms"><RoomsList /></ProtectedRoute>} />
            <Route path="rooms/:id" element={<ProtectedRoute requiredPermission="menu:rooms"><RoomDetail /></ProtectedRoute>} />
            <Route path="calendar" element={<ProtectedRoute requiredPermission="menu:calendar"><CalendarView /></ProtectedRoute>} />
            <Route path="bookings/new" element={<ProtectedRoute requiredPermission="menu:bookings_new"><CreateBooking /></ProtectedRoute>} />
            <Route path="my-bookings" element={<ProtectedRoute requiredPermission="menu:my_bookings"><MyBookings /></ProtectedRoute>} />
            <Route path="bookings/:id" element={<BookingDetail />} />
            <Route path="scan" element={<Navigate to="/scan/checkin" replace />} />
            <Route path="scan/checkin" element={<ProtectedRoute requiredPermission="menu:scan_qr"><QRScanCheckin /></ProtectedRoute>} />
            <Route path="scan/checkout" element={<ProtectedRoute requiredPermission="menu:scan_qr"><QRScanCheckout /></ProtectedRoute>} />
            <Route path="history" element={<ProtectedRoute requiredPermission="menu:history"><HistoryPage /></ProtectedRoute>} />
            <Route path="profile" element={<Profile />} />

            {/* HRGA & Admin Routes */}
            <Route
              path="admin"
              element={<Navigate to="/admin/live-monitoring" replace />}
            />
            <Route
              path="admin/live-monitoring"
              element={
                <ProtectedRoute allowedRoles={['HRGA', 'ADMIN']} requiredPermission="menu:live_monitoring">
                  <HRGALiveMonitoring />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/all-bookings"
              element={
                <ProtectedRoute allowedRoles={['HRGA', 'ADMIN']} requiredPermission="menu:all_bookings">
                  <HRGAAllBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/overdue"
              element={
                <ProtectedRoute allowedRoles={['HRGA', 'ADMIN']} requiredPermission="menu:overdue">
                  <HRGAOverdue />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/blocks"
              element={
                <ProtectedRoute allowedRoles={['HRGA', 'ADMIN']} requiredPermission="menu:blocks">
                  <HRGABlocks />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/reports"
              element={
                <ProtectedRoute allowedRoles={['HRGA', 'ADMIN']} requiredPermission="menu:reports">
                  <HRGAReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/notification-logs"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']} requiredPermission="menu:notification_logs">
                  <HRGANotificationLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/whatsapp"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']} requiredPermission="menu:whatsapp">
                  <WhatsAppGateway />
                </ProtectedRoute>
              }
            />

            {/* Admin Only Master Data Routes */}
            <Route
              path="admin/users"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']} requiredPermission="menu:users">
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/departments"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']} requiredPermission="menu:departments">
                  <AdminDepartments />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/rooms"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']} requiredPermission="menu:rooms_master">
                  <AdminRooms />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/qr-management"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']} requiredPermission="menu:qr_management">
                  <AdminQRManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/settings"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']} requiredPermission="menu:settings">
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/audit-logs"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']} requiredPermission="menu:audit_logs">
                  <AdminAuditLogs />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ModalProvider>
    </AuthProvider>
  </I18nProvider>
);
}
