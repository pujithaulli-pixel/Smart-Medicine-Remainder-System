import React from 'react';
import { useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { AddMedicine } from './pages/AddMedicine';
import { MyMedicines } from './pages/MyMedicines';
import { MedicineTaken } from './pages/MedicineTaken';
import { MedicineMissed } from './pages/MedicineMissed';
import { MedicineHistory } from './pages/MedicineHistory';
import { Reports } from './pages/Reports';
import { Caretaker } from './pages/Caretaker';
import { Settings } from './pages/Settings';
import { ReminderModal } from './components/ReminderModal';
import { NotificationPanel } from './components/NotificationPanel';
import { AuthModal } from './components/AuthModal';
import { DataMigrationModal } from './components/DataMigrationModal';
import { AccountProfileModal } from './components/AccountProfileModal';
import { IconCheckCircle, IconAlertCircle, IconInfo } from './components/Icons';

export const App = () => {
  const {
    activePage,
    toast,
    dueDoses,
    isReminderDismissed,
    isNotificationPanelOpen,
    setIsNotificationPanelOpen,
    authModalOpen,
    setAuthModalOpen,
    authMode,
    migrationModalOpen,
    setMigrationModalOpen,
    profileModalOpen,
    setProfileModalOpen,
    logout
  } = useApp();

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'addMedicine':
        return <AddMedicine />;
      case 'myMedicines':
        return <MyMedicines />;
      case 'medicineTaken':
        return <MedicineTaken />;
      case 'medicineMissed':
        return <MedicineMissed />;
      case 'medicineHistory':
        return <MedicineHistory />;
      case 'reports':
        return <Reports />;
      case 'caretaker':
        return <Caretaker />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      {/* Prominent Reminder Alarm Modal */}
      {!isReminderDismissed && dueDoses && dueDoses.length > 0 && <ReminderModal />}

      {/* Slide-out Caretaker Alerts & Notifications Panel */}
      <NotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
      />

      {/* User Authentication & Account Modals (Phase 7) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />

      <DataMigrationModal
        isOpen={migrationModalOpen}
        onClose={() => setMigrationModalOpen(false)}
      />

      <AccountProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onLogout={logout}
      />

      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Header />

        <main className="content-container">
          {/* Toast / Status Alert Banner */}
          {toast && (
            <div
              className={`toast-banner ${
                toast.type === 'error'
                  ? 'toast-warning'
                  : toast.type === 'info'
                  ? 'toast-info'
                  : 'toast-success'
              }`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {toast.type === 'info' ? (
                  <IconInfo size={18} />
                ) : (
                  <IconCheckCircle size={18} />
                )}
                <span>{toast.message}</span>
              </div>
            </div>
          )}

          {renderActivePage()}
        </main>
      </div>
    </div>
  );
};
