import React from 'react';
import { useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { CaretakerDashboard } from './pages/CaretakerDashboard';
import { WelcomeLanding } from './pages/WelcomeLanding';
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
    user,
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

  // 1. Unauthenticated Visitor Experience (Requirement 1 & 4)
  // Hide private reminders, notifications, and patient schedules before login
  if (!user) {
    return (
      <div className="unauthenticated-app">
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode={authMode}
        />
        <WelcomeLanding />
      </div>
    );
  }

  // 2. Role-Based Navigation & Page Rendering (Requirement 1, 2 & 3)
  const isCaretaker = user.role === 'caretaker';

  const renderActivePage = () => {
    if (isCaretaker) {
      // Caretakers can only access CaretakerDashboard, Caretaker Profile, and Settings
      switch (activePage) {
        case 'dashboard':
          return <CaretakerDashboard />;
        case 'caretaker':
          return <Caretaker />;
        case 'settings':
          return <Settings />;
        default:
          return <CaretakerDashboard />;
      }
    }

    // Patient Pages
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
      {/* Prominent Reminder Alarm Modal (Patients Only) */}
      {!isReminderDismissed && dueDoses && dueDoses.length > 0 && !isCaretaker && <ReminderModal />}

      {/* Slide-out Caretaker Alerts & Notifications Panel */}
      <NotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
      />

      {/* User Authentication & Account Modals */}
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
