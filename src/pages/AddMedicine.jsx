import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  IconUpload,
  IconX,
  IconCheck,
  IconAlertCircle,
  IconClock,
  IconPill,
  IconUtensils,
  IconPlus,
  IconCalendar,
  IconInfo
} from '../components/Icons';
import { SAMPLE_MEDICINE_IMAGES } from '../services/medicineService';
import { getTodayDateString, formatTime12h } from '../utils/dateUtils';
import {
  validateImageFile,
  validatePrescriptionFile,
  compressImage,
  readPrescriptionFile
} from '../utils/imageUtils';

export const AddMedicine = () => {
  const {
    t,
    medicines,
    addMedicine,
    updateMedicine,
    editingMedicineId,
    setEditingMedicineId,
    setActivePage
  } = useApp();

  const isEditMode = Boolean(editingMedicineId);
  const editingMedicine = isEditMode
    ? medicines.find((m) => m.id === editingMedicineId)
    : null;

  const todayStr = getTodayDateString();

  // Form State
  const initialFormState = {
    name: '',
    category: 'tablet',
    medicineForm: 'tablet',
    route: 'oral',
    dosageAmount: '',
    dosageUnit: 'mg',
    dosesPerDay: '1',
    times: ['08:00'],
    customReminderLabel: '',
    startDate: todayStr,
    endDate: '',
    isOngoing: true,
    ongoing: true,
    foodInstruction: 'afterFood',
    imageUrl: SAMPLE_MEDICINE_IMAGES.whiteTablet,
    imagePreview: null,
    prescriptionDoc: null,
    doctorName: '',
    prescriptionReference: '',
    reason: '',
    instructions: '',
    quantityRemaining: '30',
    quantityUnit: 'tablets',
    refillThreshold: '5',
    notes: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [imageError, setImageError] = useState('');
  const [prescriptionError, setPrescriptionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form if in edit mode
  useEffect(() => {
    if (editingMedicine) {
      setFormData({
        name: editingMedicine.name || '',
        category: editingMedicine.medicineForm || editingMedicine.category || 'tablet',
        medicineForm: editingMedicine.medicineForm || editingMedicine.category || 'tablet',
        route: editingMedicine.route || 'oral',
        dosageAmount: String(editingMedicine.dosageAmount || ''),
        dosageUnit: editingMedicine.dosageUnit || 'mg',
        dosesPerDay: String(editingMedicine.dosesPerDay || (editingMedicine.times ? editingMedicine.times.length : 1)),
        times: editingMedicine.reminderTimes || editingMedicine.times || ['08:00'],
        customReminderLabel: editingMedicine.reminderLabel || editingMedicine.customReminderLabel || '',
        startDate: editingMedicine.startDate || todayStr,
        endDate: editingMedicine.endDate || '',
        isOngoing: editingMedicine.isOngoing !== undefined ? editingMedicine.isOngoing : (editingMedicine.ongoing !== undefined ? editingMedicine.ongoing : !editingMedicine.endDate),
        ongoing: editingMedicine.isOngoing !== undefined ? editingMedicine.isOngoing : (editingMedicine.ongoing !== undefined ? editingMedicine.ongoing : !editingMedicine.endDate),
        foodInstruction: editingMedicine.foodInstruction || 'afterFood',
        imageUrl: editingMedicine.imageUrl || editingMedicine.medicineImage || SAMPLE_MEDICINE_IMAGES.whiteTablet,
        imagePreview: editingMedicine.imageUrl || editingMedicine.medicineImage || null,
        prescriptionDoc: editingMedicine.prescriptionFile || editingMedicine.prescriptionDoc || null,
        doctorName: editingMedicine.doctorName || '',
        prescriptionReference: editingMedicine.prescriptionReference || '',
        reason: editingMedicine.reason || '',
        instructions: editingMedicine.instructions || '',
        quantityRemaining: editingMedicine.remainingQuantity !== undefined ? String(editingMedicine.remainingQuantity) : (editingMedicine.quantityRemaining !== undefined ? String(editingMedicine.quantityRemaining) : '30'),
        quantityUnit: editingMedicine.quantityUnit || 'tablets',
        refillThreshold: editingMedicine.refillThreshold !== undefined ? String(editingMedicine.refillThreshold) : '5',
        notes: editingMedicine.notes || ''
      });
    }
  }, [editingMedicineId, editingMedicine]);

  // Adjust reminder times dynamically when doses per day changes
  const handleDosesPerDayChange = (countStr) => {
    const count = Math.max(1, Math.min(8, parseInt(countStr, 10) || 1));
    let newTimes = [...formData.times];

    const defaultSchedulePresets = {
      1: ['08:00'],
      2: ['08:00', '20:00'],
      3: ['08:00', '14:00', '20:00'],
      4: ['08:00', '12:00', '16:00', '20:00'],
      5: ['06:00', '10:00', '14:00', '18:00', '22:00'],
      6: ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      7: ['06:00', '09:00', '12:00', '15:00', '17:00', '19:00', '22:00'],
      8: ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '21:00']
    };

    if (newTimes.length === 0 || (newTimes.length === 1 && newTimes[0] === '08:00')) {
      newTimes = defaultSchedulePresets[count] || ['08:00'];
    } else if (newTimes.length < count) {
      const presets = defaultSchedulePresets[count] || [];
      while (newTimes.length < count) {
        const nextSuggested = presets[newTimes.length] || '12:00';
        newTimes.push(nextSuggested);
      }
    } else if (newTimes.length > count) {
      newTimes = newTimes.slice(0, count);
    }

    setFormData({
      ...formData,
      dosesPerDay: String(count),
      times: newTimes
    });
  };

  const handleTimeChange = (index, value) => {
    const updated = [...formData.times];
    updated[index] = value;
    setFormData({ ...formData, times: updated });
  };

  const handleAddTime = () => {
    if (formData.times.length >= 8) return;
    const updated = [...formData.times, '12:00'];
    setFormData({
      ...formData,
      times: updated,
      dosesPerDay: String(updated.length)
    });
  };

  const handleRemoveTime = (index) => {
    if (formData.times.length <= 1) return;
    const updated = formData.times.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      times: updated,
      dosesPerDay: String(updated.length)
    });
  };

  // Image Upload with Canvas compression
  const handleImageChange = async (e) => {
    setImageError('');
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateImageFile(file, t);
    if (!validation.valid) {
      setImageError(validation.error);
      return;
    }

    try {
      // Compress to lightweight JPEG base64 to avoid localStorage quota issues
      const compressedUrl = await compressImage(file, 400, 400, 0.75);
      setFormData({
        ...formData,
        imagePreview: compressedUrl,
        imageUrl: compressedUrl
      });
    } catch (err) {
      setImageError('Failed to process image. Please try another file.');
    }
  };

  const handleRemoveImage = () => {
    setFormData({
      ...formData,
      imagePreview: null,
      imageUrl: SAMPLE_MEDICINE_IMAGES.whiteTablet
    });
    setImageError('');
  };

  // Prescription Upload
  const handlePrescriptionChange = async (e) => {
    setPrescriptionError('');
    const file = e.target.files[0];
    if (!file) return;

    const validation = validatePrescriptionFile(file, t);
    if (!validation.valid) {
      setPrescriptionError(validation.error);
      return;
    }

    try {
      const doc = await readPrescriptionFile(file);
      setFormData({
        ...formData,
        prescriptionDoc: doc
      });
    } catch (err) {
      setPrescriptionError('Failed to read prescription file.');
    }
  };

  const handleRemovePrescription = () => {
    setFormData({
      ...formData,
      prescriptionDoc: null
    });
    setPrescriptionError('');
  };

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t.addMedicine.validation.nameRequired;
    }

    if (!formData.dosageAmount.trim() || isNaN(formData.dosageAmount) || Number(formData.dosageAmount) <= 0) {
      newErrors.dosageAmount = t.addMedicine.validation.dosageRequired;
    }

    if (!formData.startDate) {
      newErrors.startDate = t.addMedicine.validation.startDateRequired;
    }

    if (!formData.isOngoing && formData.endDate) {
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        newErrors.endDate = t.addMedicine.validation.endDateInvalid;
      }
    }

    if (!formData.foodInstruction) {
      newErrors.foodInstruction = t.addMedicine.validation.foodInstructionRequired;
    }

    // Validate reminder times
    if (!formData.times || formData.times.length === 0) {
      newErrors.times = t.addMedicine.validation.reminderTimeRequired;
    } else {
      const hasEmpty = formData.times.some((tm) => !tm || tm.trim() === '');
      if (hasEmpty) {
        newErrors.times = t.addMedicine.validation.incompleteTimes || 'Please set a valid time for all reminder slots.';
      } else {
        // Check for duplicates
        const uniqueTimes = new Set(formData.times);
        if (uniqueTimes.size !== formData.times.length) {
          newErrors.times = t.addMedicine.validation.duplicateTime || 'Duplicate reminder times are not allowed.';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    const sortedTimes = [...formData.times].sort();

    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      medicineForm: formData.category,
      route: formData.route,
      dosageAmount: formData.dosageAmount.trim(),
      dosageUnit: formData.dosageUnit,
      dosesPerDay: sortedTimes.length,
      times: sortedTimes,
      reminderTimes: sortedTimes,
      customReminderLabel: formData.customReminderLabel.trim(),
      reminderLabel: formData.customReminderLabel.trim(),
      startDate: formData.startDate,
      endDate: formData.isOngoing ? '' : formData.endDate,
      isOngoing: formData.isOngoing,
      ongoing: formData.isOngoing,
      foodInstruction: formData.foodInstruction,
      imageUrl: formData.imagePreview || formData.imageUrl,
      medicineImage: formData.imagePreview || formData.imageUrl,
      prescriptionDoc: formData.prescriptionDoc,
      prescriptionFile: formData.prescriptionDoc,
      doctorName: formData.doctorName.trim(),
      prescriptionReference: formData.prescriptionReference.trim(),
      reason: formData.reason.trim(),
      instructions: formData.instructions.trim(),
      quantityRemaining: parseInt(formData.quantityRemaining, 10) || 0,
      remainingQuantity: parseInt(formData.quantityRemaining, 10) || 0,
      quantityUnit: formData.quantityUnit,
      refillThreshold: parseInt(formData.refillThreshold, 10) || 0,
      notes: formData.notes.trim()
    };

    setTimeout(() => {
      if (isEditMode) {
        updateMedicine(editingMedicineId, payload);
        setEditingMedicineId(null);
      } else {
        addMedicine(payload);
      }

      setIsSubmitting(false);
      setActivePage('myMedicines');
    }, 200);
  };

  const handleCancel = () => {
    setEditingMedicineId(null);
    setActivePage('myMedicines');
  };

  const handleReset = () => {
    setFormData(initialFormState);
    setErrors({});
    setImageError('');
    setPrescriptionError('');
  };

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="page-title">
            {isEditMode ? t.addMedicine.editPageTitle : t.addMedicine.pageTitle}
          </h2>
          <p className="page-subtitle">
            {isEditMode ? t.addMedicine.editPageSubtitle : t.addMedicine.pageSubtitle}
          </p>
        </div>

        {isEditMode && (
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              backgroundColor: 'var(--primary-100)',
              color: 'var(--primary-800)',
              padding: '6px 14px',
              borderRadius: '20px'
            }}
          >
            Editing Mode: {editingMedicine?.name}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* =====================================================================
            SECTION 1: BASIC MEDICINE DETAILS
           ===================================================================== */}
        <div className="card">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px', color: 'var(--primary-900)' }}>
            {t.addMedicine.formSections.primary}
          </h3>

          <div className="grid-2">
            {/* Medicine Name */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label" htmlFor="medName">
                {t.addMedicine.fields.name} <span className="required-star">*</span>
              </label>
              <input
                id="medName"
                type="text"
                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                placeholder={t.addMedicine.fields.namePlaceholder}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              {errors.name && (
                <div className="form-error">
                  <IconAlertCircle size={14} />
                  <span>{errors.name}</span>
                </div>
              )}
            </div>

            {/* Medicine Form (Category) */}
            <div className="form-group">
              <label className="form-label" htmlFor="medCategory">
                {t.addMedicine.fields.category} <span className="required-star">*</span>
              </label>
              <select
                id="medCategory"
                className="form-control"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value, medicineForm: e.target.value })}
              >
                <option value="tablet">{t.medicine.categories.tablet}</option>
                <option value="capsule">{t.medicine.categories.capsule}</option>
                <option value="syrup">{t.medicine.categories.syrup}</option>
                <option value="drops">{t.medicine.categories.drops}</option>
                <option value="injection">{t.medicine.categories.injection}</option>
                <option value="cream">{t.medicine.categories.cream}</option>
                <option value="inhaler">{t.medicine.categories.inhaler}</option>
                <option value="topical">{t.medicine.categories.topical}</option>
                <option value="other">{t.medicine.categories.other}</option>
              </select>
            </div>

            {/* Route of Administration */}
            <div className="form-group">
              <label className="form-label" htmlFor="medRoute">
                {t.addMedicine.fields.route} <span className="required-star">*</span>
              </label>
              <select
                id="medRoute"
                className="form-control"
                value={formData.route}
                onChange={(e) => setFormData({ ...formData, route: e.target.value })}
              >
                <option value="oral">{t.medicine.routes.oral}</option>
                <option value="topical">{t.medicine.routes.topical}</option>
                <option value="nasal">{t.medicine.routes.nasal}</option>
                <option value="respiratory">{t.medicine.routes.respiratory}</option>
                <option value="injection">{t.medicine.routes.injection}</option>
                <option value="ophthalmic">{t.medicine.routes.ophthalmic}</option>
                <option value="other">{t.medicine.routes.other}</option>
              </select>
            </div>

            {/* Dosage Amount */}
            <div className="form-group">
              <label className="form-label" htmlFor="dosageAmount">
                {t.addMedicine.fields.dosageAmount} <span className="required-star">*</span>
              </label>
              <input
                id="dosageAmount"
                type="text"
                className={`form-control ${errors.dosageAmount ? 'is-invalid' : ''}`}
                placeholder={t.addMedicine.fields.dosageAmountPlaceholder}
                value={formData.dosageAmount}
                onChange={(e) => setFormData({ ...formData, dosageAmount: e.target.value })}
              />
              {errors.dosageAmount && (
                <div className="form-error">
                  <IconAlertCircle size={14} />
                  <span>{errors.dosageAmount}</span>
                </div>
              )}
            </div>

            {/* Dosage Unit */}
            <div className="form-group">
              <label className="form-label" htmlFor="dosageUnit">
                {t.addMedicine.fields.dosageUnit} <span className="required-star">*</span>
              </label>
              <select
                id="dosageUnit"
                className="form-control"
                value={formData.dosageUnit}
                onChange={(e) => setFormData({ ...formData, dosageUnit: e.target.value })}
              >
                <option value="mg">mg (Milligrams)</option>
                <option value="ml">ml (Milliliters / Syrup)</option>
                <option value="mcg">mcg (Micrograms)</option>
                <option value="g">g (Grams)</option>
                <option value="tablet">Tablet / Pill</option>
                <option value="capsule">Capsule</option>
                <option value="drops">Drops</option>
                <option value="puffs">Puffs (Inhaler)</option>
                <option value="units">Units (IU)</option>
              </select>
            </div>
          </div>
        </div>

        {/* =====================================================================
            SECTION 2: DOSAGE & REMINDER TIMING
           ===================================================================== */}
        <div className="card">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px', color: 'var(--primary-900)' }}>
            {t.addMedicine.formSections.schedule}
          </h3>

          <div className="grid-2">
            {/* Doses Per Day */}
            <div className="form-group">
              <label className="form-label" htmlFor="dosesPerDay">
                {t.addMedicine.fields.dosesPerDay} <span className="required-star">*</span>
              </label>
              <select
                id="dosesPerDay"
                className="form-control"
                value={formData.dosesPerDay}
                onChange={(e) => handleDosesPerDayChange(e.target.value)}
              >
                <option value="1">1 time per day (Once daily)</option>
                <option value="2">2 times per day (Twice daily)</option>
                <option value="3">3 times per day (Thrice daily)</option>
                <option value="4">4 times per day (Four times)</option>
                <option value="5">5 times per day</option>
                <option value="6">6 times per day</option>
                <option value="7">7 times per day</option>
                <option value="8">8 times per day</option>
              </select>
            </div>

            {/* Food Instruction */}
            <div className="form-group">
              <label className="form-label" htmlFor="foodInstruction">
                {t.addMedicine.fields.foodInstruction} <span className="required-star">*</span>
              </label>
              <select
                id="foodInstruction"
                className="form-control"
                value={formData.foodInstruction}
                onChange={(e) => setFormData({ ...formData, foodInstruction: e.target.value })}
              >
                <option value="afterFood">{t.medicine.foodOptions.afterFood}</option>
                <option value="beforeFood">{t.medicine.foodOptions.beforeFood}</option>
                <option value="withFood">{t.medicine.foodOptions.withFood}</option>
                <option value="noFoodInstruction">{t.medicine.foodOptions.noFoodInstruction}</option>
              </select>
            </div>

            {/* Dynamic Reminder Time Fields */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  {t.addMedicine.fields.reminderTimes} <span className="required-star">*</span>
                </label>
                {formData.times.length < 8 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddTime}
                    style={{ fontSize: '0.82rem', padding: '4px 10px', minHeight: '32px' }}
                  >
                    <IconPlus size={14} />
                    <span>{t.addMedicine.fields.addTimeBtn}</span>
                  </button>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px'
                }}
              >
                {formData.times.map((time, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      backgroundColor: 'var(--bg-main)',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-800)' }}>
                        Dose #{idx + 1}
                      </span>
                      {time && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {formatTime12h(time)}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="time"
                        className="form-control"
                        value={time}
                        onChange={(e) => handleTimeChange(idx, e.target.value)}
                        style={{ minHeight: '40px', padding: '6px 10px' }}
                        required
                      />

                      {formData.times.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleRemoveTime(idx)}
                          title={t.addMedicine.fields.removeTimeBtn}
                          style={{ minHeight: '40px', padding: '6px 8px' }}
                        >
                          <IconX size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {errors.times && (
                <div className="form-error" style={{ marginTop: '8px' }}>
                  <IconAlertCircle size={14} />
                  <span>{errors.times}</span>
                </div>
              )}
            </div>

            {/* Custom Reminder Label */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label" htmlFor="customReminderLabel">
                {t.addMedicine.fields.customReminderLabel}
              </label>
              <input
                id="customReminderLabel"
                type="text"
                className="form-control"
                placeholder={t.addMedicine.fields.customReminderLabelPlaceholder}
                value={formData.customReminderLabel}
                onChange={(e) => setFormData({ ...formData, customReminderLabel: e.target.value })}
              />
            </div>

            {/* Start Date */}
            <div className="form-group">
              <label className="form-label" htmlFor="startDate">
                {t.addMedicine.fields.startDate} <span className="required-star">*</span>
              </label>
              <input
                id="startDate"
                type="date"
                className={`form-control ${errors.startDate ? 'is-invalid' : ''}`}
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
              {errors.startDate && (
                <div className="form-error">
                  <IconAlertCircle size={14} />
                  <span>{errors.startDate}</span>
                </div>
              )}
            </div>

            {/* End Date & Ongoing Checkbox */}
            <div className="form-group">
              <label className="form-label" htmlFor="endDate">
                {t.addMedicine.fields.endDate}
              </label>
              <input
                id="endDate"
                type="date"
                className={`form-control ${errors.endDate ? 'is-invalid' : ''}`}
                value={formData.endDate}
                disabled={formData.isOngoing}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                style={{ opacity: formData.isOngoing ? 0.6 : 1 }}
              />
              {errors.endDate && (
                <div className="form-error">
                  <IconAlertCircle size={14} />
                  <span>{errors.endDate}</span>
                </div>
              )}

              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="isOngoingCheck"
                  checked={formData.isOngoing}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isOngoing: e.target.checked,
                      ongoing: e.target.checked,
                      endDate: e.target.checked ? '' : formData.endDate
                    })
                  }
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary-600)', cursor: 'pointer' }}
                />
                <label
                  htmlFor="isOngoingCheck"
                  style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  {t.addMedicine.fields.isOngoing}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            SECTION 3: MEDICINE IMAGE UPLOAD & PREVIEW
           ===================================================================== */}
        <div className="card">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px', color: 'var(--primary-900)' }}>
            {t.addMedicine.fields.imageUpload}
          </h3>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            {t.addMedicine.fields.imageHelp}
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              flexWrap: 'wrap',
              padding: '20px',
              backgroundColor: 'var(--bg-main)',
              borderRadius: '12px',
              border: '1.5px dashed var(--border-strong)'
            }}
          >
            {/* Image Preview Box */}
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '14px',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                border: '2px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <img
                src={formData.imagePreview || formData.imageUrl}
                alt="Medicine Preview"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                  <IconUpload size={16} />
                  <span>
                    {formData.imagePreview
                      ? t.addMedicine.fields.changeImage
                      : t.addMedicine.fields.chooseFile}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                </label>

                {formData.imagePreview && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={handleRemoveImage}
                  >
                    <IconX size={16} />
                    <span>{t.addMedicine.fields.removeImage}</span>
                  </button>
                )}
              </div>

              {imageError && (
                <div className="form-error" style={{ marginTop: '8px' }}>
                  <IconAlertCircle size={14} />
                  <span>{imageError}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =====================================================================
            SECTION 4: DOCTOR, PRESCRIPTION & QUANTITY DETAILS (OPTIONAL)
           ===================================================================== */}
        <div className="card">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px', color: 'var(--primary-900)' }}>
            {t.addMedicine.formSections.additional}
          </h3>

          <div className="grid-2">
            {/* Reason for Taking Medicine */}
            <div className="form-group">
              <label className="form-label" htmlFor="reason">
                {t.addMedicine.fields.reasonForTaking}
              </label>
              <input
                id="reason"
                type="text"
                className="form-control"
                placeholder={t.addMedicine.fields.reasonPlaceholder}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>

            {/* Prescribing Doctor */}
            <div className="form-group">
              <label className="form-label" htmlFor="doctorName">
                {t.addMedicine.fields.doctorName}
              </label>
              <input
                id="doctorName"
                type="text"
                className="form-control"
                placeholder={t.addMedicine.fields.doctorPlaceholder}
                value={formData.doctorName}
                onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
              />
            </div>

            {/* Prescription / Rx Reference Number */}
            <div className="form-group">
              <label className="form-label" htmlFor="prescriptionReference">
                {t.addMedicine.fields.prescriptionRef}
              </label>
              <input
                id="prescriptionReference"
                type="text"
                className="form-control"
                placeholder={t.addMedicine.fields.prescriptionRefPlaceholder}
                value={formData.prescriptionReference}
                onChange={(e) => setFormData({ ...formData, prescriptionReference: e.target.value })}
              />
            </div>

            {/* Quantity Unit */}
            <div className="form-group">
              <label className="form-label" htmlFor="quantityUnit">
                {t.addMedicine.fields.quantityUnit}
              </label>
              <select
                id="quantityUnit"
                className="form-control"
                value={formData.quantityUnit}
                onChange={(e) => setFormData({ ...formData, quantityUnit: e.target.value })}
              >
                <option value="tablets">{t.medicine.quantityUnits.tablets}</option>
                <option value="capsules">{t.medicine.quantityUnits.capsules}</option>
                <option value="ml">{t.medicine.quantityUnits.ml}</option>
                <option value="doses">{t.medicine.quantityUnits.doses}</option>
                <option value="drops">{t.medicine.quantityUnits.drops}</option>
                <option value="puffs">{t.medicine.quantityUnits.puffs}</option>
                <option value="units">{t.medicine.quantityUnits.units}</option>
              </select>
            </div>

            {/* Quantity Remaining */}
            <div className="form-group">
              <label className="form-label" htmlFor="qtyRemaining">
                {t.addMedicine.fields.quantityRemaining}
              </label>
              <input
                id="qtyRemaining"
                type="number"
                min="0"
                className="form-control"
                placeholder={t.addMedicine.fields.quantityPlaceholder}
                value={formData.quantityRemaining}
                onChange={(e) => setFormData({ ...formData, quantityRemaining: e.target.value })}
              />
            </div>

            {/* Low-stock Threshold */}
            <div className="form-group">
              <label className="form-label" htmlFor="refillThreshold">
                {t.addMedicine.fields.refillThreshold}
              </label>
              <input
                id="refillThreshold"
                type="number"
                min="0"
                className="form-control"
                placeholder={t.addMedicine.fields.refillPlaceholder}
                value={formData.refillThreshold}
                onChange={(e) => setFormData({ ...formData, refillThreshold: e.target.value })}
              />
            </div>

            {/* Prescription Document Upload */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">
                {t.addMedicine.fields.prescriptionFile}
              </label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                {t.addMedicine.fields.prescriptionFileHelp}
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-main)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-light)',
                  flexWrap: 'wrap'
                }}
              >
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                  <IconUpload size={16} />
                  <span>Choose Prescription File (PDF/Image)</span>
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={handlePrescriptionChange}
                    style={{ display: 'none' }}
                  />
                </label>

                {formData.prescriptionDoc && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--primary-700)' }}>
                      📄 {formData.prescriptionDoc.name || t.addMedicine.fields.prescriptionAttached}
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={handleRemovePrescription}
                      style={{ padding: '4px 8px', minHeight: '32px' }}
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                )}
              </div>

              {prescriptionError && (
                <div className="form-error" style={{ marginTop: '8px' }}>
                  <IconAlertCircle size={14} />
                  <span>{prescriptionError}</span>
                </div>
              )}
            </div>

            {/* User Instructions */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label" htmlFor="userInstructions">
                {t.addMedicine.fields.userInstructions}
              </label>
              <input
                id="userInstructions"
                type="text"
                className="form-control"
                placeholder={t.addMedicine.fields.userInstructionsPlaceholder}
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              />
            </div>

            {/* Notes */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label" htmlFor="notes">
                {t.addMedicine.fields.notes}
              </label>
              <textarea
                id="notes"
                className="form-control"
                rows="3"
                placeholder={t.addMedicine.fields.notesPlaceholder}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
        </div>

        {/* Buttons: Save / Update, Cancel, Reset */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '14px',
            flexWrap: 'wrap',
            paddingTop: '8px'
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleReset}
          >
            {t.addMedicine.buttons.reset}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCancel}
          >
            {t.addMedicine.buttons.cancel}
          </button>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isSubmitting}
            style={{ minWidth: '190px' }}
          >
            <IconCheck size={18} />
            <span>
              {isSubmitting
                ? t.addMedicine.buttons.saving
                : isEditMode
                ? t.addMedicine.buttons.update
                : t.addMedicine.buttons.save}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
