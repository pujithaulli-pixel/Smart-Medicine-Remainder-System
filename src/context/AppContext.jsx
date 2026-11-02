import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  StorageKeys,
  getStoredItem,
  setStoredItem,
  clearAllAppData
} from '../services/storageService';
import {
  INITIAL_SAMPLE_MEDICINES,
  INITIAL_TODAY_DOSES,
  INITIAL_DOSE_HISTORY,
  INITIAL_MEDICINE_HISTORY,
  INITIAL_CARETAKER,
  INITIAL_ACTIVITY_LOG
} from '../services/medicineService';
import { translations, getTranslation, interpolate } from '../i18n/translations';
import { getTodayDateString, isDateCoveringToday, calculateTreatmentDuration } from '../utils/dateUtils';
import {
  syncDoseOccurrencesForDate,
  evaluateDoseTransitions,
  applySnoozeToDose,
  ENGINE_CONFIG
} from '../services/reminderEngine';
import { alarmSoundService } from '../services/alarmSoundService';
import { notificationService } from '../services/notificationService';
import { caretakerAlertService } from '../services/caretakerAlertService';
import {
  authApi,
  medicinesApi,
  dosesApi,
  caretakerApi,
  preferencesApi,
  getAuthToken,
  getStoredUser,
  isAuthenticated
} from '../services/apiService';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  // 0. User Account & Authentication State (Phase 7)
  const [user, setUser] = useState(() => getStoredUser());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);

  // 1. Language State (en, hi, te)
  const [language, setLanguageState] = useState(() => {
    return getStoredItem(StorageKeys.LANGUAGE, 'en');
  });

  const setLanguage = (newLang) => {
    setLanguageState(newLang);
    setStoredItem(StorageKeys.LANGUAGE, newLang);
  };

  // Helper translation getter with guaranteed deep English fallback
  const t = getTranslation(language);

  // 2. Active Page Navigation & Editing State
  const [activePage, setActivePage] = useState('dashboard');
  const [editingMedicineId, setEditingMedicineId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

  // 3. User Preferences (Elderly mode, sound, test mode)
  const [preferences, setPreferences] = useState(() => {
    return getStoredItem(StorageKeys.PREFERENCES, {
      largeTextMode: false,
      soundEnabled: true,
      isTestMode: false
    });
  });

  useEffect(() => {
    setStoredItem(StorageKeys.PREFERENCES, preferences);
    if (preferences.largeTextMode) {
      document.body.classList.add('large-text-mode');
    } else {
      document.body.classList.remove('large-text-mode');
    }
  }, [preferences]);

  // 4. Medicines Collection
  const [medicines, setMedicines] = useState(() => {
    return getStoredItem(StorageKeys.MEDICINES, INITIAL_SAMPLE_MEDICINES);
  });

  useEffect(() => {
    setStoredItem(StorageKeys.MEDICINES, medicines);
  }, [medicines]);

  // 5. Today's Scheduled Dose Occurrences
  const todayStr = getTodayDateString();

  const [todayDoses, setTodayDoses] = useState(() => {
    const rawStored = getStoredItem(StorageKeys.TODAY_DOSES, INITIAL_TODAY_DOSES);
    const initialMeds = getStoredItem(StorageKeys.MEDICINES, INITIAL_SAMPLE_MEDICINES);
    return syncDoseOccurrencesForDate(todayStr, initialMeds, rawStored);
  });

  useEffect(() => {
    setStoredItem(StorageKeys.TODAY_DOSES, todayDoses);
  }, [todayDoses]);

  // Sync scheduled doses whenever medicines or date changes
  useEffect(() => {
    setTodayDoses((prev) => syncDoseOccurrencesForDate(todayStr, medicines, prev));
  }, [medicines, todayStr]);

  // 6. Historical Dose Records (for Taken & Missed pages)
  const [doseHistory, setDoseHistory] = useState(() => {
    return getStoredItem(StorageKeys.DOSE_HISTORY, INITIAL_DOSE_HISTORY);
  });

  useEffect(() => {
    setStoredItem(StorageKeys.DOSE_HISTORY, doseHistory);
  }, [doseHistory]);

  // 7. Discontinued / Finished Medicine History
  const [medicineHistory, setMedicineHistory] = useState(() => {
    return getStoredItem(StorageKeys.MEDICINE_HISTORY, INITIAL_MEDICINE_HISTORY);
  });

  useEffect(() => {
    setStoredItem(StorageKeys.MEDICINE_HISTORY, medicineHistory);
  }, [medicineHistory]);

  // 8. Caretaker Details
  const [caretaker, setCaretaker] = useState(() => {
    return getStoredItem(StorageKeys.CARETAKER, INITIAL_CARETAKER);
  });

  useEffect(() => {
    setStoredItem(StorageKeys.CARETAKER, caretaker);
  }, [caretaker]);

  // 8b. Caretaker Alerts (Phase 5)
  const [caretakerAlerts, setCaretakerAlerts] = useState([]);

  const refreshAlerts = async () => {
    try {
      const data = await caretakerAlertService.getAlerts();
      if (Array.isArray(data)) setCaretakerAlerts(data);
    } catch (e) {
      console.warn('Failed to refresh alerts:', e);
    }
  };

  useEffect(() => {
    refreshAlerts();
  }, []);

  // 9. Recent Activity Log
  const [activityLog, setActivityLog] = useState(() => {
    return getStoredItem(StorageKeys.ACTIVITY, INITIAL_ACTIVITY_LOG);
  });

  useEffect(() => {
    setStoredItem(StorageKeys.ACTIVITY, activityLog);
  }, [activityLog]);

  // 10. Global Toast / Alert Banner
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Log an activity event
  const logActivity = (actionText) => {
    const newEntry = {
      id: `act-${Date.now()}`,
      timestamp: 'Just now',
      actionText
    };
    setActivityLog((prev) => [newEntry, ...prev.slice(0, 24)]);
  };

  // 10b. User Authentication & Multi-Tenant Data Refresh (Phase 7)
  const refreshUserData = async () => {
    if (!isAuthenticated()) return;
    try {
      const [fetchedMeds, fetchedOccs, fetchedDoseHist, fetchedMedHist, fetchedCaretaker, fetchedPrefs] = await Promise.all([
        medicinesApi.getAll().catch(() => null),
        dosesApi.getForDate(todayStr).catch(() => null),
        dosesApi.getHistory().catch(() => null),
        dosesApi.getMedicineHistory().catch(() => null),
        caretakerApi.getProfile().catch(() => null),
        preferencesApi.get().catch(() => null)
      ]);

      if (Array.isArray(fetchedMeds)) setMedicines(fetchedMeds);
      if (Array.isArray(fetchedDoseHist)) setDoseHistory(fetchedDoseHist);
      if (Array.isArray(fetchedMedHist)) setMedicineHistory(fetchedMedHist);
      if (fetchedCaretaker && fetchedCaretaker.name) {
        setCaretaker(fetchedCaretaker);
      } else {
        setCaretaker({
          name: '',
          relationship: '',
          phone: '',
          email: '',
          preferredChannel: 'email',
          alertsEnabled: true
        });
      }
      if (fetchedPrefs) setPreferences((prev) => ({ ...prev, ...fetchedPrefs }));

      // Handle Today's Schedule Sync
      if (Array.isArray(fetchedOccs) && fetchedOccs.length > 0) {
        setTodayDoses(fetchedOccs);
      } else if (Array.isArray(fetchedMeds) && fetchedMeds.length > 0) {
        const synced = syncDoseOccurrencesForDate(todayStr, fetchedMeds, []);
        setTodayDoses(synced);
        if (synced.length > 0) {
          dosesApi.syncOccurrences(synced).catch(console.warn);
        }
      } else {
        setTodayDoses([]);
      }

      // Check if migration modal should be presented
      const migrationDone = getStoredItem('medical_reminder_migration_completed', false);
      const migrationDismissed = getStoredItem('medical_reminder_migration_dismissed', false);
      const localMeds = getStoredItem(StorageKeys.MEDICINES, []);
      if (!migrationDone && !migrationDismissed && localMeds.length > 0) {
        setMigrationModalOpen(true);
      }
    } catch (e) {
      console.warn('Failed to load user records from database:', e);
    }
  };

  // Check auth session validity on mount
  useEffect(() => {
    if (getAuthToken()) {
      authApi.getMe().then((me) => {
        if (me) {
          setUser(me);
        }
      }).catch(() => {
        setUser(null);
      });
    }

    const handleSessionExpired = () => {
      setUser(null);
      showToast(t.auth?.sessionExpired || 'Your session has expired. Please sign in again.', 'warning');
      setAuthModalOpen(true);
      setAuthMode('login');
    };

    window.addEventListener('auth:session_expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session_expired', handleSessionExpired);
  }, []);

  // Hydrate user records whenever authenticated user changes
  useEffect(() => {
    if (user) {
      refreshUserData();
    }
  }, [user?.id]);

  const loginWithCredentials = async (email, password) => {
    try {
      const res = await authApi.login({ email, password });
      if (res && res.user) {
        setUser(res.user);
        setActivePage('dashboard');
        return { success: true, user: res.user };
      }
      return { success: false, error: res?.error || 'Invalid credentials' };
    } catch (e) {
      return { success: false, error: e.message || 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setUser(null);
    setActivePage('dashboard');
    setIsNotificationPanelOpen(false);
    alarmSoundService.stopAlarm();
    setMedicines(getStoredItem(StorageKeys.MEDICINES, INITIAL_SAMPLE_MEDICINES));
    setDoseHistory(getStoredItem(StorageKeys.DOSE_HISTORY, INITIAL_DOSE_HISTORY));
    setMedicineHistory(getStoredItem(StorageKeys.MEDICINE_HISTORY, INITIAL_MEDICINE_HISTORY));
    setCaretaker(getStoredItem(StorageKeys.CARETAKER, INITIAL_CARETAKER));
    setPreferences(getStoredItem(StorageKeys.PREFERENCES, { largeTextMode: false, soundEnabled: true, isTestMode: false }));
    showToast(t.auth?.logoutSuccess || 'Logged out successfully.');
  };

  // 11. REMINDER ENGINE: Due Doses & Alarm State
  const [activeDueDoseId, setActiveDueDoseId] = useState(null);
  const [isReminderDismissed, setIsReminderDismissed] = useState(false);

  // Derive due doses directly from todayDoses
  const dueDoses = todayDoses.filter((d) => d.status === 'due');

  // Keep activeDueDoseId pointed to a valid due dose
  useEffect(() => {
    if (dueDoses.length > 0) {
      if (!activeDueDoseId || !dueDoses.some((d) => d.id === activeDueDoseId)) {
        setActiveDueDoseId(dueDoses[0].id);
      }
    } else {
      setActiveDueDoseId(null);
      setIsReminderDismissed(false);
      alarmSoundService.stopAlarm();
    }
  }, [dueDoses, activeDueDoseId]);

  // =========================================================================
  // SHARED REMINDER ENGINE TICK LOOP (1 Second periodic evaluation)
  // =========================================================================
  const tickRef = useRef(null);

  useEffect(() => {
    const runEngineTick = () => {
      // Phase 10: Only tick patient dose alarms when authenticated as a patient
      if (!user || user.role !== 'patient') return;

      const now = new Date();
      const isTestMode = Boolean(preferences.isTestMode);

      setTodayDoses((currentDoses) => {
        const result = evaluateDoseTransitions({
          doses: currentDoses,
          now,
          isTestMode
        });

        if (!result.hasChanges) {
          return currentDoses;
        }

        // Handle newly due doses
        if (result.newlyDueDoses.length > 0) {
          // Open reminder modal (un-dismiss)
          setIsReminderDismissed(false);

          result.newlyDueDoses.forEach((dueDose) => {
            logActivity(`Dose is due now: ${dueDose.medicineName} (${dueDose.dosage})`);

            // Play audible alarm if sound enabled
            if (preferences.soundEnabled !== false) {
              alarmSoundService.startAlarm();
            }

            // Trigger browser notification
            notificationService.showDoseNotification(dueDose, (clickedDose) => {
              setActiveDueDoseId(clickedDose.id);
              setIsReminderDismissed(false);
            });
          });
        }

        // Handle newly missed doses (grace period expired)
        if (result.newlyMissedDoses.length > 0) {
          result.newlyMissedDoses.forEach((missedDose) => {
            logActivity(`Dose missed: ${missedDose.medicineName} (${missedDose.dosage}) - Grace period expired`);

            // Persist to history
            const historyEntry = {
              id: `hist-${missedDose.id}`,
              medicineId: missedDose.medicineId,
              medicineName: missedDose.medicineName,
              dosage: missedDose.dosage,
              imageUrl: missedDose.imageUrl,
              date: missedDose.scheduledDate,
              scheduledTime: missedDose.scheduledTime,
              status: 'missed',
              recordedTime: null,
              missedTimestamp: missedDose.missedTimestamp || new Date().toISOString(),
              snoozeCount: missedDose.snoozeCount || 0,
              reminderInfo: missedDose.foodInstruction || ''
            };

            setDoseHistory((prevHist) => {
              const existingIdx = prevHist.findIndex((h) => h.id === historyEntry.id);
              if (existingIdx >= 0) {
                const updated = [...prevHist];
                updated[existingIdx] = historyEntry;
                return updated;
              }
              return [historyEntry, ...prevHist];
            });

            // Dispatch Caretaker Missed-Dose Alert (Idempotent Phase 5 Integration)
            caretakerAlertService.dispatchMissedDoseAlert(missedDose, caretaker).then((alert) => {
              if (alert) {
                setCaretakerAlerts((prev) => [alert, ...prev.filter((a) => a.id !== alert.id)]);
              }
            });
          });

          // If no remaining due doses, stop alarm
          const remainingDue = result.updatedDoses.filter((d) => d.status === 'due');
          if (remainingDue.length === 0) {
            alarmSoundService.stopAlarm();
          }
        }

        return result.updatedDoses;
      });
    };

    tickRef.current = setInterval(runEngineTick, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [preferences.isTestMode, preferences.soundEnabled]);

  // =========================================================================
  // ACTIONS: MARK AS TAKEN, SKIP, SNOOZE
  // =========================================================================

  const markDoseTaken = (doseId) => {
    const currentDose = todayDoses.find((d) => d.id === doseId);
    if (!currentDose) return;

    alarmSoundService.stopAlarm();
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nowIso = now.toISOString();

    const updatedDose = {
      ...currentDose,
      status: 'taken',
      takenTimestamp: nowIso,
      confirmationTime: timeString,
      recordedAt: timeString,
      updatedAt: nowIso
    };

    // Update today's dose occurrence canonical record
    setTodayDoses((prev) => prev.map((d) => (d.id === doseId ? updatedDose : d)));

    // Update doseHistory canonically (prevent duplicates)
    const historyEntry = {
      id: `hist-${currentDose.id}`,
      medicineId: currentDose.medicineId,
      medicineName: currentDose.medicineName,
      dosage: currentDose.dosage,
      imageUrl: currentDose.imageUrl,
      date: currentDose.scheduledDate,
      scheduledTime: currentDose.scheduledTime,
      status: 'taken',
      recordedTime: timeString,
      confirmationTime: timeString,
      takenTimestamp: nowIso,
      userInstructions: currentDose.userInstructions || currentDose.instructions || '',
      notes: currentDose.notes || ''
    };

    setDoseHistory((prev) => {
      const existingIdx = prev.findIndex((h) => h.id === historyEntry.id || (h.medicineName === currentDose.medicineName && h.scheduledTime === currentDose.scheduledTime && h.date === currentDose.scheduledDate));
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = historyEntry;
        return updated;
      }
      return [historyEntry, ...prev];
    });

    if (isAuthenticated()) {
      dosesApi.recordHistory(historyEntry).catch(console.warn);
      dosesApi.syncOccurrences([updatedDose]).catch(console.warn);
    }

    logActivity(`Marked as taken: ${currentDose.medicineName} (${currentDose.dosage}) at ${timeString}`);
    showToast(t.reminderModal.takenSuccessToast.replace('{time}', timeString));
  };

  const markDoseSkipped = (doseId, skipReasonText = '') => {
    const currentDose = todayDoses.find((d) => d.id === doseId);
    if (!currentDose) return;

    alarmSoundService.stopAlarm();
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nowIso = now.toISOString();
    const reason = skipReasonText || 'Skipped by user';

    const updatedDose = {
      ...currentDose,
      status: 'skipped',
      skippedTimestamp: nowIso,
      skipReason: reason,
      confirmationTime: timeString,
      recordedAt: `Skipped: ${reason}`,
      updatedAt: nowIso
    };

    setTodayDoses((prev) => prev.map((d) => (d.id === doseId ? updatedDose : d)));

    // Record into doseHistory as 'skipped' (kept distinct from 'missed')
    const historyEntry = {
      id: `hist-${currentDose.id}`,
      medicineId: currentDose.medicineId,
      medicineName: currentDose.medicineName,
      dosage: currentDose.dosage,
      imageUrl: currentDose.imageUrl,
      date: currentDose.scheduledDate,
      scheduledTime: currentDose.scheduledTime,
      status: 'skipped',
      skipReason: reason,
      recordedTime: timeString,
      skippedTimestamp: nowIso
    };

    setDoseHistory((prev) => {
      const existingIdx = prev.findIndex((h) => h.id === historyEntry.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = historyEntry;
        return updated;
      }
      return [historyEntry, ...prev];
    });

    if (isAuthenticated()) {
      dosesApi.recordHistory(historyEntry).catch(console.warn);
      dosesApi.syncOccurrences([updatedDose]).catch(console.warn);
    }

    logActivity(`Dose skipped: ${currentDose.medicineName} (${reason})`);
    showToast(t.reminderModal.skippedSuccessToast);
  };

  const snoozeDose = (doseId) => {
    const currentDose = todayDoses.find((d) => d.id === doseId);
    if (!currentDose) return;

    alarmSoundService.stopAlarm();
    const isTestMode = Boolean(preferences.isTestMode);
    const snoozeResult = applySnoozeToDose(currentDose, isTestMode);

    if (!snoozeResult.success) {
      showToast(snoozeResult.message || 'Maximum 3 snoozes reached.', 'warning');
      return;
    }

    // Update today's dose with incremented snooze count and new deadline
    setTodayDoses((prev) =>
      prev.map((d) => (d.id === doseId ? snoozeResult.dose : d))
    );

    if (isAuthenticated()) {
      dosesApi.syncOccurrences([snoozeResult.dose]).catch(console.warn);
    }

    // If 3rd snooze reached, optionally dispatch early warning alert to caretaker (Requirement 3)
    if (snoozeResult.snoozeCount === 3 && caretaker?.notifySnoozeLimit !== false) {
      caretakerAlertService.dispatchSnoozeWarningAlert(currentDose, caretaker).then((alert) => {
        if (alert) {
          setCaretakerAlerts((prev) => [alert, ...prev.filter((a) => a.id !== alert.id)]);
        }
      });
    }

    const snoozeDurationText = isTestMode ? '15 seconds' : '10 minutes';
    logActivity(`Snoozed ${currentDose.medicineName} (Snooze ${snoozeResult.snoozeCount}/3) for ${snoozeDurationText}`);
    showToast(
      t.reminderModal.snoozedSuccessToast
        .replace('{time}', snoozeDurationText)
        .replace('{count}', String(snoozeResult.snoozeCount))
    );
  };

  const dismissReminderModal = () => {
    alarmSoundService.stopAlarm();
    setIsReminderDismissed(true);
  };

  const openReminderModal = (doseId) => {
    if (doseId) setActiveDueDoseId(doseId);
    setIsReminderDismissed(false);
    if (preferences.soundEnabled !== false) {
      alarmSoundService.startAlarm();
    }
  };

  // Actions for Medicines
  const addMedicine = (medData) => {
    const newId = `med-${Date.now()}`;
    const sortedTimes = [...(medData.reminderTimes || medData.times || [])].sort();
    const nowIso = new Date().toISOString();

    const newMed = {
      ...medData,
      id: newId,
      times: sortedTimes,
      reminderTimes: sortedTimes,
      status: 'active',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    setMedicines((prev) => [newMed, ...prev]);

    if (isAuthenticated()) {
      medicinesApi.create(newMed).catch(console.warn);
    }

    logActivity(`Added new medicine: ${newMed.name} (${newMed.dosageAmount} ${newMed.dosageUnit})`);
    showToast(`${t.addMedicine.validation.savedSuccess}`);
    return newMed;
  };

  const updateMedicine = (id, updatedFields) => {
    const sortedTimes = updatedFields.reminderTimes
      ? [...updatedFields.reminderTimes].sort()
      : updatedFields.times
      ? [...updatedFields.times].sort()
      : undefined;

    setMedicines((prev) =>
      prev.map((med) => {
        if (med.id === id) {
          return {
            ...med,
            ...updatedFields,
            times: sortedTimes || med.times,
            reminderTimes: sortedTimes || med.reminderTimes,
            updatedAt: new Date().toISOString()
          };
        }
        return med;
      })
    );

    if (isAuthenticated()) {
      medicinesApi.update(id, updatedFields).catch(console.warn);
    }

    logActivity(`Updated medicine details: ${updatedFields.name || id}`);
    showToast(t.addMedicine.validation.updatedSuccess || 'Medicine updated successfully!');
  };

  const pauseMedicine = (id) => {
    const med = medicines.find((m) => m.id === id);
    if (!med) return;

    setMedicines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'paused', updatedAt: new Date().toISOString() } : m))
    );

    if (isAuthenticated()) {
      medicinesApi.update(id, { status: 'paused' }).catch(console.warn);
    }

    logActivity(`Paused medicine: ${med.name}`);
    showToast(`Medicine "${med.name}" has been paused. Reminders are temporarily suspended.`);
  };

  const resumeMedicine = (id) => {
    const med = medicines.find((m) => m.id === id);
    if (!med) return;

    setMedicines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'active', updatedAt: new Date().toISOString() } : m))
    );

    if (isAuthenticated()) {
      medicinesApi.update(id, { status: 'active' }).catch(console.warn);
    }

    logActivity(`Resumed medicine: ${med.name}`);
    showToast(`Medicine "${med.name}" resumed to active schedule!`);
  };

  const markCompletedMedicine = (id) => {
    const med = medicines.find((m) => m.id === id);
    if (!med) return;

    const todayString = getTodayDateString();
    const updatedMed = {
      ...med,
      status: 'completed',
      endDate: med.endDate || todayString,
      isOngoing: false,
      ongoing: false,
      updatedAt: new Date().toISOString()
    };

    setMedicines((prev) =>
      prev.map((m) => (m.id === id ? updatedMed : m))
    );

    const histItem = {
      id: `med-hist-${Date.now()}`,
      medicineId: med.id,
      name: med.name,
      dosage: `${med.dosageAmount} ${med.dosageUnit}`,
      category: med.medicineForm || med.category,
      startDate: med.startDate,
      endDate: updatedMed.endDate,
      duration: calculateTreatmentDuration(med.startDate, updatedMed.endDate, false),
      reason: 'Treatment course marked as completed.',
      doctorName: med.doctorName || 'Not specified',
      imageUrl: med.imageUrl || med.medicineImage,
      status: 'completed'
    };

    setMedicineHistory((prev) => [histItem, ...prev]);

    if (isAuthenticated()) {
      medicinesApi.update(id, updatedMed).catch(console.warn);
      dosesApi.addMedicineHistory(histItem).catch(console.warn);
    }

    logActivity(`Completed medicine treatment: ${med.name}`);
    showToast(`Medicine "${med.name}" marked as completed.`);
  };

  const discontinueMedicine = (id, reasonText = '') => {
    const med = medicines.find((m) => m.id === id);
    if (!med) return;

    const todayString = getTodayDateString();
    const reason = reasonText || 'Discontinued by user/physician';
    const updatedMed = {
      ...med,
      status: 'discontinued',
      endDate: med.endDate || todayString,
      isOngoing: false,
      ongoing: false,
      reason,
      updatedAt: new Date().toISOString()
    };

    setMedicines((prev) =>
      prev.map((m) => (m.id === id ? updatedMed : m))
    );

    const histItem = {
      id: `med-hist-${Date.now()}`,
      medicineId: med.id,
      name: med.name,
      dosage: `${med.dosageAmount} ${med.dosageUnit}`,
      category: med.medicineForm || med.category,
      startDate: med.startDate,
      endDate: updatedMed.endDate,
      duration: calculateTreatmentDuration(med.startDate, updatedMed.endDate, false),
      reason: reason,
      doctorName: med.doctorName || 'Not specified',
      imageUrl: med.imageUrl || med.medicineImage,
      status: 'discontinued'
    };

    setMedicineHistory((prev) => [histItem, ...prev]);

    if (isAuthenticated()) {
      medicinesApi.update(id, updatedMed).catch(console.warn);
      dosesApi.addMedicineHistory(histItem).catch(console.warn);
    }

    logActivity(`Discontinued medicine: ${med.name} (${reason})`);
    showToast(`Medicine "${med.name}" discontinued and archived to history.`);
  };

  const deleteMedicine = (id) => {
    const medToDelete = medicines.find((m) => m.id === id);
    if (!medToDelete) return;

    // Archive snapshot into medicineHistory if not already present
    const histItem = {
      id: `med-hist-${Date.now()}`,
      medicineId: medToDelete.id,
      name: medToDelete.name,
      dosage: `${medToDelete.dosageAmount || ''} ${medToDelete.dosageUnit || ''}`.trim() || medToDelete.dosage || '',
      category: medToDelete.medicineForm || medToDelete.category || 'tablet',
      startDate: medToDelete.startDate,
      endDate: medToDelete.endDate || getTodayDateString(),
      isOngoing: false,
      duration: calculateTreatmentDuration(medToDelete.startDate, medToDelete.endDate || getTodayDateString(), false),
      reason: 'Removed from active prescriptions (historical records preserved).',
      doctorName: medToDelete.doctorName || 'Not specified',
      imageUrl: medToDelete.imageUrl || medToDelete.medicineImage,
      status: 'discontinued'
    };

    setMedicineHistory((prev) => {
      const exists = prev.some((h) => h.medicineId === medToDelete.id || h.name === medToDelete.name);
      if (exists) return prev;
      return [histItem, ...prev];
    });

    setMedicines((prev) => prev.filter((m) => m.id !== id));

    if (isAuthenticated()) {
      medicinesApi.delete(id).catch(console.warn);
    }

    logActivity(`Deleted medicine: ${medToDelete.name} (Past dose history preserved)`);
    showToast(`Medicine "${medToDelete.name}" removed. Historical dose records remain preserved.`);
  };

  const updateMedicineStock = (id, newQuantity) => {
    const qty = Math.max(0, parseInt(newQuantity, 10) || 0);
    setMedicines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, remainingQuantity: qty, updatedAt: new Date().toISOString() } : m))
    );

    if (isAuthenticated()) {
      medicinesApi.updateStock(id, qty).catch(console.warn);
    }

    showToast('Remaining stock quantity updated.');
  };

  // Actions for Caretaker
  const updateCaretaker = (caretakerData) => {
    const updated = {
      ...caretaker,
      ...caretakerData,
      updatedAt: getTodayDateString()
    };
    setCaretaker(updated);
    caretakerAlertService.saveProfile(updated);

    if (isAuthenticated()) {
      caretakerApi.saveProfile(updated).catch(console.warn);
    }

    logActivity(`Updated caretaker contact: ${caretakerData.name}`);
    showToast(t.caretakerPage.validation.savedSuccess);
  };

  // Reset to sample initial state
  const resetToSampleData = () => {
    clearAllAppData();
    alarmSoundService.stopAlarm();
    setMedicines(INITIAL_SAMPLE_MEDICINES);
    const initialSync = syncDoseOccurrencesForDate(todayStr, INITIAL_SAMPLE_MEDICINES, INITIAL_TODAY_DOSES);
    setTodayDoses(initialSync);
    setDoseHistory(INITIAL_DOSE_HISTORY);
    setMedicineHistory(INITIAL_MEDICINE_HISTORY);
    setCaretaker(INITIAL_CARETAKER);
    setActivityLog(INITIAL_ACTIVITY_LOG);
    setPreferences({
      largeTextMode: false,
      soundEnabled: true,
      isTestMode: false
    });
    setEditingMedicineId(null);
    setIsReminderDismissed(false);
    showToast('Reset to initial sample data.');
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,
        formatText: interpolate,
        activePage,
        setActivePage,
        editingMedicineId,
        setEditingMedicineId,
        mobileMenuOpen,
        setMobileMenuOpen,
        isNotificationPanelOpen,
        setIsNotificationPanelOpen,
        medicines,
        addMedicine,
        updateMedicine,
        pauseMedicine,
        resumeMedicine,
        markCompletedMedicine,
        discontinueMedicine,
        deleteMedicine,
        updateMedicineStock,
        todayDoses,
        dueDoses,
        activeDueDoseId,
        setActiveDueDoseId,
        isReminderDismissed,
        openReminderModal,
        dismissReminderModal,
        markDoseTaken,
        markDoseSkipped,
        snoozeDose,
        doseHistory,
        medicineHistory,
        caretaker,
        updateCaretaker,
        caretakerAlerts,
        setCaretakerAlerts,
        refreshAlerts,
        activityLog,
        preferences,
        setPreferences,
        toast,
        showToast,
        resetToSampleData,
        // Phase 7 User Authentication & Multi-Tenant Persistence
        user,
        setUser,
        isLoggedIn: Boolean(user),
        authModalOpen,
        setAuthModalOpen,
        authMode,
        setAuthMode,
        profileModalOpen,
        setProfileModalOpen,
        migrationModalOpen,
        setMigrationModalOpen,
        refreshUserData,
        loginWithCredentials,
        logout
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

