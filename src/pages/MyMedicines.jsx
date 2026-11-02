import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconClock,
  IconCalendar,
  IconUtensils,
  IconAlertCircle,
  IconCheck,
  IconHeartPulse,
  IconShield,
  IconInfo,
  IconX
} from '../components/Icons';
import { formatShortDate, formatTime12h, calculateTreatmentDuration } from '../utils/dateUtils';

export const MyMedicines = () => {
  const {
    t,
    language,
    medicines,
    deleteMedicine,
    pauseMedicine,
    resumeMedicine,
    markCompletedMedicine,
    discontinueMedicine,
    updateMedicineStock,
    setEditingMedicineId,
    setActivePage
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, paused, completed, discontinued
  const [sortBy, setSortBy] = useState('name'); // name, recent, startDate, nextTime

  // Modals
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [medicineToDelete, setMedicineToDelete] = useState(null);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);

  const [discontinueModalOpen, setDiscontinueModalOpen] = useState(false);
  const [medicineToDiscontinue, setMedicineToDiscontinue] = useState(null);
  const [discontinueReason, setDiscontinueReason] = useState('');

  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockMedicine, setStockMedicine] = useState(null);
  const [newStockQty, setNewStockQty] = useState('');

  // Search & Filter & Sort Logic
  const filteredAndSortedMedicines = medicines
    .filter((med) => {
      const matchesFilter =
        filterStatus === 'all' ? true : med.status === filterStatus;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (med.name && med.name.toLowerCase().includes(q)) ||
        (med.category && med.category.toLowerCase().includes(q)) ||
        (med.medicineForm && med.medicineForm.toLowerCase().includes(q)) ||
        (med.doctorName && med.doctorName.toLowerCase().includes(q)) ||
        (med.reason && med.reason.toLowerCase().includes(q)) ||
        (med.prescriptionReference && med.prescriptionReference.toLowerCase().includes(q));

      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'recent') {
        const dateA = new Date(a.createdAt || a.startDate || 0);
        const dateB = new Date(b.createdAt || b.startDate || 0);
        return dateB - dateA;
      }
      if (sortBy === 'startDate') {
        return (a.startDate || '').localeCompare(b.startDate || '');
      }
      if (sortBy === 'nextTime') {
        const timeA = (a.reminderTimes || a.times || [])[0] || '99:99';
        const timeB = (b.reminderTimes || b.times || [])[0] || '99:99';
        return timeA.localeCompare(timeB);
      }
      return 0;
    });

  const getFoodText = (key) => {
    return t.medicine.foodOptions[key] || t.medicine.foodOptions.noFoodInstruction;
  };

  const getCategoryText = (cat) => {
    return t.medicine.categories[cat] || cat;
  };

  // Action handlers
  const handleEdit = (med) => {
    setEditingMedicineId(med.id);
    setActivePage('addMedicine');
  };

  const openDeleteDialog = (med) => {
    setMedicineToDelete(med);
    setDeleteModalOpen(true);
  };

  const executeDelete = () => {
    if (medicineToDelete) {
      deleteMedicine(medicineToDelete.id);
      setDeleteModalOpen(false);
      setMedicineToDelete(null);
    }
  };

  const openDiscontinueDialog = (med) => {
    setMedicineToDiscontinue(med);
    setDiscontinueReason('');
    setDiscontinueModalOpen(true);
  };

  const executeDiscontinue = () => {
    if (medicineToDiscontinue) {
      discontinueMedicine(medicineToDiscontinue.id, discontinueReason);
      setDiscontinueModalOpen(false);
      setMedicineToDiscontinue(null);
    }
  };

  const openStockDialog = (med) => {
    setStockMedicine(med);
    setNewStockQty(String(med.remainingQuantity !== undefined ? med.remainingQuantity : (med.quantityRemaining || 0)));
    setStockModalOpen(true);
  };

  const executeStockUpdate = (e) => {
    e.preventDefault();
    if (stockMedicine) {
      updateMedicineStock(stockMedicine.id, newStockQty);
      setStockModalOpen(false);
      setStockMedicine(null);
    }
  };

  const handleQuickQtyChange = (med, delta) => {
    const current = parseInt(med.remainingQuantity !== undefined ? med.remainingQuantity : (med.quantityRemaining || 0), 10);
    const updated = Math.max(0, current + delta);
    updateMedicineStock(med.id, updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header & Add Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h2 className="page-title">{t.myMedicines.pageTitle}</h2>
          <p className="page-subtitle">{t.myMedicines.pageSubtitle}</p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setEditingMedicineId(null);
            setActivePage('addMedicine');
          }}
        >
          <IconPlus size={18} />
          <span>{t.myMedicines.addNewBtn}</span>
        </button>
      </div>

      {/* Search Bar, Filter Pills & Sort Dropdown */}
      <div
        className="card"
        style={{
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flex: 1,
            minWidth: '260px',
            backgroundColor: 'var(--bg-main)',
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1.5px solid var(--border-strong)'
          }}
        >
          <IconSearch size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder={t.myMedicines.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '0.95rem'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ color: 'var(--text-muted)', padding: '2px' }}
            >
              <IconX size={16} />
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="pill-group">
          <button
            type="button"
            className={`pill-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            {t.myMedicines.filterAll} ({medicines.length})
          </button>
          <button
            type="button"
            className={`pill-btn ${filterStatus === 'active' ? 'active' : ''}`}
            onClick={() => setFilterStatus('active')}
          >
            {t.myMedicines.filterActive} ({medicines.filter((m) => m.status === 'active').length})
          </button>
          <button
            type="button"
            className={`pill-btn ${filterStatus === 'paused' ? 'active' : ''}`}
            onClick={() => setFilterStatus('paused')}
          >
            {t.myMedicines.filterPaused} ({medicines.filter((m) => m.status === 'paused').length})
          </button>
          <button
            type="button"
            className={`pill-btn ${filterStatus === 'completed' ? 'active' : ''}`}
            onClick={() => setFilterStatus('completed')}
          >
            {t.myMedicines.filterCompleted} ({medicines.filter((m) => m.status === 'completed').length})
          </button>
          <button
            type="button"
            className={`pill-btn ${filterStatus === 'discontinued' ? 'active' : ''}`}
            onClick={() => setFilterStatus('discontinued')}
          >
            {t.myMedicines.filterDiscontinued} ({medicines.filter((m) => m.status === 'discontinued').length})
          </button>
        </div>

        {/* Sort Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {t.myMedicines.sortLabel}
          </span>
          <select
            className="form-control"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ minHeight: '38px', padding: '6px 12px', fontSize: '0.9rem' }}
          >
            <option value="name">{t.myMedicines.sortName}</option>
            <option value="recent">{t.myMedicines.sortRecent}</option>
            <option value="startDate">{t.myMedicines.sortStartDate}</option>
            <option value="nextTime">{t.myMedicines.sortNextTime}</option>
          </select>
        </div>
      </div>

      {/* Medicines Display Grid */}
      {filteredAndSortedMedicines.length === 0 ? (
        <EmptyState
          title={t.myMedicines.emptyTitle}
          description={t.myMedicines.emptySubtitle}
          actionLabel={t.myMedicines.addNewBtn}
          onAction={() => {
            setEditingMedicineId(null);
            setActivePage('addMedicine');
          }}
        />
      ) : (
        <div className="grid-2">
          {filteredAndSortedMedicines.map((med) => {
            const times = med.reminderTimes || med.times || [];
            const remaining = med.remainingQuantity !== undefined ? med.remainingQuantity : (med.quantityRemaining || 0);
            const threshold = med.refillThreshold !== undefined ? med.refillThreshold : 5;
            const isLowStock = remaining <= threshold;
            const isPaused = med.status === 'paused';
            const isActive = med.status === 'active';
            const isCompleted = med.status === 'completed';
            const isDiscontinued = med.status === 'discontinued';
            const durationText = calculateTreatmentDuration(med.startDate, med.endDate, med.isOngoing || med.ongoing, language);

            return (
              <div
                key={med.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '24px',
                  borderLeft: isLowStock && isActive
                    ? '5px solid #dc2626'
                    : isPaused
                    ? '5px solid #d97706'
                    : isCompleted
                    ? '5px solid #64748b'
                    : '5px solid var(--primary-600)'
                }}
              >
                <div>
                  {/* Header: Form tag, Reminder Label & Status Badge */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          backgroundColor: 'var(--primary-50)',
                          color: 'var(--primary-700)',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}
                      >
                        {getCategoryText(med.medicineForm || med.category)}
                      </span>

                      {(med.reminderLabel || med.customReminderLabel) && (
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            backgroundColor: 'var(--accent-50)',
                            color: 'var(--accent-700)',
                            padding: '4px 10px',
                            borderRadius: '8px'
                          }}
                        >
                          {med.reminderLabel || med.customReminderLabel}
                        </span>
                      )}
                    </div>

                    <StatusBadge status={med.status} />
                  </div>

                  {/* Main: Image + Name + Dosage */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
                    <div
                      style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '14px',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-light)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <img
                        src={med.imageUrl || med.medicineImage}
                        alt={med.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        loading="lazy"
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3
                        style={{
                          fontSize: '1.2rem',
                          fontWeight: 800,
                          color: 'var(--text-main)',
                          lineHeight: 1.3
                        }}
                      >
                        {med.name}
                      </h3>
                      <div
                        style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: 'var(--primary-700)',
                          marginTop: '3px'
                        }}
                      >
                        {med.dosageAmount} {med.dosageUnit}
                      </div>

                      {med.reason && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Reason: <em>{med.reason}</em>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details Block */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      fontSize: '0.88rem',
                      color: 'var(--text-secondary)',
                      backgroundColor: 'var(--bg-main)',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      marginBottom: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IconClock size={16} color="var(--primary-600)" />
                      <span>
                        <strong>{t.medicine.times}:</strong>{' '}
                        {times.map((tm) => formatTime12h(tm, language)).join(', ') || (t.medicine.noTimesSet || 'No times set')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IconUtensils size={16} color="var(--primary-600)" />
                      <span>
                        <strong>{t.medicine.instruction}:</strong> {getFoodText(med.foodInstruction)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IconCalendar size={16} color="var(--primary-600)" />
                      <span>
                        <strong>{t.medicine.duration}:</strong> {durationText}
                      </span>
                    </div>

                    {/* Remaining Stock with Quick +/- Buttons */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '4px',
                        paddingTop: '6px',
                        borderTop: '1px solid var(--border-light)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600 }}>{t.medicine.remaining}:</span>
                        <strong style={{ fontSize: '0.95rem', color: isLowStock ? '#dc2626' : 'var(--text-main)' }}>
                          {remaining} {med.quantityUnit || 'units'}
                        </strong>
                        {isLowStock && (
                          <span
                            style={{
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}
                          >
                            LOW STOCK
                          </span>
                        )}
                      </div>

                      {/* Quick stock +/- buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ minHeight: '28px', padding: '2px 8px', fontSize: '0.85rem' }}
                          onClick={() => handleQuickQtyChange(med, -1)}
                          title="Decrease 1"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ minHeight: '28px', padding: '2px 8px', fontSize: '0.85rem' }}
                          onClick={() => handleQuickQtyChange(med, 1)}
                          title="Increase 1"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ minHeight: '28px', padding: '2px 8px', fontSize: '0.78rem' }}
                          onClick={() => openStockDialog(med)}
                          title="Custom Quantity"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border-light)',
                    paddingTop: '14px',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}
                >
                  {/* Left: View Details */}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSelectedMedicine(med);
                      setDetailsModalOpen(true);
                    }}
                  >
                    <IconEye size={16} />
                    <span>{t.medicine.actions.viewDetails}</span>
                  </button>

                  {/* Right: Functional Management Controls */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {/* Pause / Resume */}
                    {isActive && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => pauseMedicine(med.id)}
                        title={t.medicine.actions.pause}
                        style={{ color: '#d97706' }}
                      >
                        ⏸ {t.medicine.actions.pause}
                      </button>
                    )}

                    {isPaused && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => resumeMedicine(med.id)}
                        title={t.medicine.actions.resume}
                        style={{ color: 'var(--primary-700)', fontWeight: 700 }}
                      >
                        ▶ {t.medicine.actions.resume}
                      </button>
                    )}

                    {/* Mark Completed (for active or paused) */}
                    {(isActive || isPaused) && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => markCompletedMedicine(med.id)}
                        title={t.medicine.actions.markCompleted}
                      >
                        ✓ {t.medicine.actions.markCompleted}
                      </button>
                    )}

                    {/* Discontinue */}
                    {(isActive || isPaused) && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openDiscontinueDialog(med)}
                        title={t.medicine.actions.discontinue}
                        style={{ color: '#dc2626' }}
                      >
                        {t.medicine.actions.discontinue}
                      </button>
                    )}

                    {/* Edit */}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleEdit(med)}
                      title={t.medicine.actions.edit}
                    >
                      <IconEdit size={16} />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => openDeleteDialog(med)}
                      title={t.medicine.actions.delete}
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =======================================================================
          DELETE CONFIRMATION MODAL
         ======================================================================= */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={t.myMedicines.confirmDeleteTitle}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDeleteModalOpen(false)}
            >
              {t.myMedicines.cancelDeleteBtn}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={executeDelete}
            >
              {t.myMedicines.confirmDeleteBtn}
            </button>
          </>
        }
      >
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {t.myMedicines.confirmDeleteText}
        </p>
        {medicineToDelete && (
          <div
            style={{
              marginTop: '16px',
              padding: '14px 18px',
              backgroundColor: 'var(--bg-main)',
              borderRadius: '10px',
              border: '1px solid var(--border-light)',
              fontWeight: 700,
              color: 'var(--text-main)'
            }}
          >
            {medicineToDelete.name} ({medicineToDelete.dosageAmount} {medicineToDelete.dosageUnit})
          </div>
        )}
      </Modal>

      {/* =======================================================================
          DISCONTINUE MEDICINE MODAL
         ======================================================================= */}
      <Modal
        isOpen={discontinueModalOpen}
        onClose={() => setDiscontinueModalOpen(false)}
        title={t.myMedicines.discontinueModalTitle}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDiscontinueModalOpen(false)}
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={executeDiscontinue}
            >
              {t.myMedicines.confirmDiscontinueBtn}
            </button>
          </>
        }
      >
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
          {t.myMedicines.discontinueDesc}
        </p>

        {medicineToDiscontinue && (
          <div style={{ marginBottom: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
            Medicine: {medicineToDiscontinue.name} ({medicineToDiscontinue.dosageAmount} {medicineToDiscontinue.dosageUnit})
          </div>
        )}

        <div className="form-group">
          <label className="form-label">
            {t.myMedicines.discontinueReasonLabel}
          </label>
          <textarea
            className="form-control"
            rows="3"
            placeholder={t.myMedicines.discontinueReasonPlaceholder}
            value={discontinueReason}
            onChange={(e) => setDiscontinueReason(e.target.value)}
          />
        </div>
      </Modal>

      {/* =======================================================================
          QUICK STOCK UPDATE MODAL
         ======================================================================= */}
      <Modal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        title={t.myMedicines.quickStockTitle}
      >
        {stockMedicine && (
          <form onSubmit={executeStockUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <strong>{stockMedicine.name}</strong> ({stockMedicine.dosageAmount} {stockMedicine.dosageUnit})
            </div>

            <div className="form-group">
              <label className="form-label">{t.myMedicines.newQuantityLabel}</label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={newStockQty}
                onChange={(e) => setNewStockQty(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStockModalOpen(false)}
              >
                {t.common.cancel}
              </button>
              <button type="submit" className="btn btn-primary">
                {t.myMedicines.saveStockBtn}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* =======================================================================
          VIEW DETAILS MODAL (ALL 20 FIELDS)
         ======================================================================= */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={t.myMedicines.detailsModalTitle}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            {selectedMedicine && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setDetailsModalOpen(false);
                  handleEdit(selectedMedicine);
                }}
              >
                <IconEdit size={16} />
                <span>{t.medicine.actions.edit}</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setDetailsModalOpen(false)}
            >
              {t.common.close}
            </button>
          </div>
        }
      >
        {selectedMedicine && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  backgroundColor: 'var(--bg-main)',
                  border: '1px solid var(--border-light)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img
                  src={selectedMedicine.imageUrl || selectedMedicine.medicineImage}
                  alt={selectedMedicine.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              <div>
                <h4 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{selectedMedicine.name}</h4>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-700)' }}>
                  {selectedMedicine.dosageAmount} {selectedMedicine.dosageUnit}
                </div>
                <div style={{ marginTop: '6px' }}>
                  <StatusBadge status={selectedMedicine.status} />
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                fontSize: '0.9rem',
                backgroundColor: 'var(--bg-main)',
                padding: '16px',
                borderRadius: '12px'
              }}
            >
              <div>
                <strong>{t.medicine.category}:</strong> {getCategoryText(selectedMedicine.medicineForm || selectedMedicine.category)}
              </div>
              <div>
                <strong>{t.medicine.route}:</strong> {t.medicine.routes[selectedMedicine.route] || selectedMedicine.route}
              </div>
              <div>
                <strong>{t.medicine.frequency}:</strong> {selectedMedicine.dosesPerDay || (selectedMedicine.times?.length || 1)} {t.common.perDay}
              </div>
              <div>
                <strong>{t.medicine.times}:</strong>{' '}
                {(selectedMedicine.reminderTimes || selectedMedicine.times)?.map((tm) => formatTime12h(tm, language)).join(', ') || (t.common?.none || 'None')}
              </div>
              <div>
                <strong>{t.medicine.startDate}:</strong> {formatShortDate(selectedMedicine.startDate, language)}
              </div>
              <div>
                <strong>{t.medicine.endDate}:</strong>{' '}
                {selectedMedicine.isOngoing || selectedMedicine.ongoing ? t.medicine.ongoing : formatShortDate(selectedMedicine.endDate, language)}
              </div>
              <div>
                <strong>{t.medicine.duration}:</strong>{' '}
                {calculateTreatmentDuration(selectedMedicine.startDate, selectedMedicine.endDate, selectedMedicine.isOngoing || selectedMedicine.ongoing, language)}
              </div>
              <div>
                <strong>{t.medicine.instruction}:</strong> {getFoodText(selectedMedicine.foodInstruction)}
              </div>

              {selectedMedicine.reason && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>{t.medicine.reason}:</strong> {selectedMedicine.reason}
                </div>
              )}

              {selectedMedicine.reminderLabel && (
                <div>
                  <strong>{t.medicine.reminderLabel}:</strong> {selectedMedicine.reminderLabel}
                </div>
              )}

              {selectedMedicine.doctorName && (
                <div>
                  <strong>{t.medicine.doctor}:</strong> {selectedMedicine.doctorName}
                </div>
              )}

              {selectedMedicine.prescriptionReference && (
                <div>
                  <strong>{t.medicine.prescriptionRef}:</strong> {selectedMedicine.prescriptionReference}
                </div>
              )}

              <div>
                <strong>{t.medicine.remaining}:</strong>{' '}
                {selectedMedicine.remainingQuantity !== undefined ? selectedMedicine.remainingQuantity : selectedMedicine.quantityRemaining} {selectedMedicine.quantityUnit || 'units'}
              </div>

              <div>
                <strong>Refill Warning at:</strong>{' '}
                &le; {selectedMedicine.refillThreshold} {selectedMedicine.quantityUnit || 'units'}
              </div>
            </div>

            {/* Prescription Document View/Attachment Link */}
            {selectedMedicine.prescriptionDoc && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: 'var(--primary-50)',
                  border: '1px solid var(--primary-200)',
                  borderRadius: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--primary-900)', fontWeight: 600 }}>
                  <span>📄 Prescription: {selectedMedicine.prescriptionDoc.name || 'Prescription Attached'}</span>
                </div>
                {selectedMedicine.prescriptionDoc.dataUrl && (
                  <a
                    href={selectedMedicine.prescriptionDoc.dataUrl}
                    download={selectedMedicine.prescriptionDoc.name || 'prescription'}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.8rem', padding: '4px 10px', minHeight: '30px' }}
                  >
                    View / Download
                  </a>
                )}
              </div>
            )}

            {/* User Instructions */}
            {selectedMedicine.instructions && (
              <div style={{ fontSize: '0.9rem', padding: '12px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                <strong style={{ color: '#1e40af' }}>{t.medicine.userInstructions}:</strong>
                <p style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>{selectedMedicine.instructions}</p>
              </div>
            )}

            {/* Notes */}
            {selectedMedicine.notes && (
              <div style={{ fontSize: '0.9rem', padding: '12px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
                <strong style={{ color: '#92400e' }}>{t.medicine.notes}:</strong>
                <p style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>{selectedMedicine.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
