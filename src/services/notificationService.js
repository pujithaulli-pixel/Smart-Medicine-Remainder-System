// Browser Notifications Service for Smart Medical Reminder System

class NotificationService {
  isSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  getPermissionStatus() {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission; // 'default', 'granted', 'denied'
  }

  async requestPermission() {
    if (!this.isSupported()) return 'unsupported';
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (err) {
      console.warn('[NotificationService] Permission request failed:', err);
      return 'denied';
    }
  }

  showDoseNotification(dose, onClickCallback) {
    if (!this.isSupported()) return null;
    if (Notification.permission !== 'granted') return null;

    try {
      const title = `Medicine Reminder: ${dose.medicineName}`;
      const options = {
        body: `It is time to take your dose: ${dose.dosage} (Scheduled: ${dose.scheduledTime}).`,
        icon: dose.imageUrl || '/favicon.ico',
        tag: `dose-alert-${dose.id}`,
        renotify: true
      };

      const notification = new Notification(title, options);

      notification.onclick = () => {
        window.focus();
        if (typeof onClickCallback === 'function') {
          onClickCallback(dose);
        }
        notification.close();
      };

      return notification;
    } catch (err) {
      console.warn('[NotificationService] Failed to display notification:', err);
      return null;
    }
  }
}

export const notificationService = new NotificationService();
