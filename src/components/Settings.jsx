import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Baby, Database, Info, Sparkles, FileText, Upload, Download, QrCode, Share2, Layout, ChevronUp, ChevronDown, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { childService, db } from '../services/db';
import { getAgeInWeeks, formatDate } from '../utils/dateUtils';
import { sanitizeName, isValidDate, isFutureDate, INPUT_LIMITS } from '../utils/inputValidation';
import { pdfReportService } from '../services/pdfReportService';
import { getPreferences, updatePreference, formatAgeWithPreference, getDashboardSections, toggleDashboardSection, moveDashboardSection, resetDashboardSections } from '../utils/preferences';
import QRCode from 'qrcode';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';

export default function Settings({ child, allChildren, onChildUpdated, onChildCreated, onSwitchChild }) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildData, setNewChildData] = useState({
    name: '',
    dateOfBirth: ''
  });
  const [formData, setFormData] = useState({
    name: child.name,
    dateOfBirth: new Date(child.dateOfBirth).toISOString().split('T')[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);
  const fileInputRef = useRef(null);
  const [reportOptions, setReportOptions] = useState({
    days: 7,
    includeFeeding: true,
    includeDiapers: true,
    includeSleep: true,
    includeWeight: true,
    includeMedicines: true,
    includeMilestones: true,
    includeAlerts: true,
    includeDetailedFeeding: false
  });
  const [preferences, setPreferences] = useState(getPreferences());
  const [dashboardSections, setDashboardSections] = useState([]);

  useEffect(() => {
    setPreferences(getPreferences());
    loadDashboardSections();
  }, []);

  const loadDashboardSections = () => {
    const sections = getDashboardSections();
    setDashboardSections(sections.sort((a, b) => a.order - b.order));
  };

  const handleUpdateChild = async (e) => {
    e.preventDefault();

    const sanitizedName = sanitizeName(formData.name);

    if (!sanitizedName) {
      setToast({ message: 'Please enter a valid name', type: 'error' });
      return;
    }

    if (!isValidDate(formData.dateOfBirth)) {
      setToast({ message: 'Please enter a valid date of birth', type: 'error' });
      return;
    }

    if (isFutureDate(formData.dateOfBirth)) {
      setToast({ message: 'Date of birth cannot be in the future', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      await childService.updateChild(child.id, {
        name: sanitizedName,
        dateOfBirth: new Date(formData.dateOfBirth)
      });

      await onChildUpdated();
      setIsEditing(false);
      setToast({ message: 'Profile updated successfully', type: 'success' });
    } catch (error) {
      console.error('Error updating child:', error);
      setToast({ message: 'Failed to update profile. Please try again.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportData = async () => {
    try {
      const allData = {
        version: 1,
        child: await db.child.toArray(),
        feeds: await db.feeds.toArray(),
        diapers: await db.diapers.toArray(),
        sleep: await db.sleep.toArray(),
        weight: await db.weight.toArray(),
        medicines: await db.medicines.toArray(),
        pumping: await db.pumping.toArray(),
        tummyTime: await db.tummyTime.toArray(),
        milestones: await db.milestones.toArray(),
        exportDate: new Date().toISOString()
      };

      const dataStr = JSON.stringify(allData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tinytally-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setToast({ message: 'Data exported successfully', type: 'success' });
    } catch (error) {
      console.error('Error exporting data:', error);
      setToast({ message: 'Failed to export data. Please try again.', type: 'error' });
    }
  };

  const handleGenerateQRCode = async () => {
    try {
      // Get recent data (last 7 days) to keep QR code size manageable
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentData = {
        version: 1,
        child: [child],
        feeds: await db.feeds.where('childId').equals(child.id).filter(f => new Date(f.timestamp) >= sevenDaysAgo).toArray(),
        diapers: await db.diapers.where('childId').equals(child.id).filter(d => new Date(d.timestamp) >= sevenDaysAgo).toArray(),
        sleep: await db.sleep.where('childId').equals(child.id).filter(s => new Date(s.startTime) >= sevenDaysAgo).toArray(),
        exportDate: new Date().toISOString(),
        note: 'Last 7 days of data for ' + child.name
      };

      const dataStr = JSON.stringify(recentData);

      // Check size
      if (dataStr.length > 2000) {
        setToast({ message: 'Too much data for QR code. Use Export JSON instead.', type: 'error' });
        return;
      }

      const qrDataUrl = await QRCode.toDataURL(dataStr, { width: 400, margin: 2 });
      setQrCodeDataUrl(qrDataUrl);
      setShowSyncDialog(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      setToast({ message: 'Failed to generate QR code. Please try again.', type: 'error' });
    }
  };

  const handleImportData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedData = JSON.parse(text);

      if (!importedData.version || !importedData.child) {
        setToast({ message: 'Invalid backup file format', type: 'error' });
        return;
      }

      setConfirmDialog({
        title: 'Import Data?',
        message: `This will import data from the backup file. Existing data will be merged (not replaced). Import ${importedData.child.length} child profile(s)?`,
        confirmText: 'Import Data',
        cancelText: 'Cancel',
        variant: 'warning',
        onConfirm: async () => {
          setConfirmDialog(null);
          try {
            // Import children
            for (const childData of importedData.child || []) {
              const { id, createdAt, ...childInfo } = childData;
              await db.child.add({ ...childInfo, createdAt: new Date() });
            }

            // Import other data
            if (importedData.feeds) await db.feeds.bulkAdd(importedData.feeds.map(({ id, ...rest }) => rest));
            if (importedData.diapers) await db.diapers.bulkAdd(importedData.diapers.map(({ id, ...rest }) => rest));
            if (importedData.sleep) await db.sleep.bulkAdd(importedData.sleep.map(({ id, ...rest }) => rest));
            if (importedData.weight) await db.weight.bulkAdd(importedData.weight.map(({ id, ...rest }) => rest));
            if (importedData.medicines) await db.medicines.bulkAdd(importedData.medicines.map(({ id, ...rest }) => rest));
            if (importedData.pumping) await db.pumping.bulkAdd(importedData.pumping.map(({ id, ...rest }) => rest));
            if (importedData.tummyTime) await db.tummyTime.bulkAdd(importedData.tummyTime.map(({ id, ...rest }) => rest));
            if (importedData.milestones) await db.milestones.bulkAdd(importedData.milestones.map(({ id, ...rest }) => rest));

            setToast({ message: 'Data imported successfully', type: 'success' });
            await onChildUpdated();
          } catch (error) {
            console.error('Error importing data:', error);
            setToast({ message: 'Failed to import some data. Check console for details.', type: 'error' });
          }
        },
        onCancel: () => setConfirmDialog(null)
      });
    } catch (error) {
      console.error('Error reading import file:', error);
      setToast({ message: 'Failed to read backup file. Please try again.', type: 'error' });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearAllData = async () => {
    setConfirmDialog({
      title: 'Delete All Data?',
      message: 'This will permanently delete all feeds, diapers, sleep, and weight records. This action cannot be undone!',
      confirmText: 'Delete All Data',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await db.feeds.clear();
          await db.diapers.clear();
          await db.sleep.clear();
          await db.weight.clear();
          setToast({ message: 'All activity data has been cleared.', type: 'success' });
          setTimeout(() => navigate('/'), 1500);
        } catch (error) {
          console.error('Error clearing data:', error);
          setToast({ message: 'Failed to clear data. Please try again.', type: 'error' });
        }
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const handleGenerateReport = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - reportOptions.days);

      await pdfReportService.downloadReport(child, startDate, endDate, reportOptions);

      setToast({ message: 'Report downloaded successfully', type: 'success' });
      setShowReportDialog(false);
    } catch (error) {
      console.error('Error generating report:', error);
      setToast({ message: 'Failed to generate report. Please try again.', type: 'error' });
    }
  };

  const handleAddChild = async (e) => {
    e.preventDefault();

    const sanitizedName = sanitizeName(newChildData.name);

    if (!sanitizedName) {
      setToast({ message: 'Please enter a valid name', type: 'error' });
      return;
    }

    if (!isValidDate(newChildData.dateOfBirth)) {
      setToast({ message: 'Please enter a valid date of birth', type: 'error' });
      return;
    }

    if (isFutureDate(newChildData.dateOfBirth)) {
      setToast({ message: 'Date of birth cannot be in the future', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const newChildId = await childService.createChild({
        name: sanitizedName,
        dateOfBirth: new Date(newChildData.dateOfBirth)
      });

      setToast({ message: `${sanitizedName} added successfully`, type: 'success' });
      setShowAddChild(false);
      setNewChildData({ name: '', dateOfBirth: '' });

      await onChildCreated(newChildId);
    } catch (error) {
      console.error('Error adding child:', error);
      setToast({ message: 'Failed to add child. Please try again.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteChild = (childToDelete) => {
    if (allChildren.length === 1) {
      setToast({ message: 'Cannot delete the only child profile', type: 'error' });
      return;
    }

    setConfirmDialog({
      title: `Delete ${childToDelete.name}?`,
      message: `This will permanently delete ${childToDelete.name}'s profile and ALL associated data (feeds, diapers, sleep, etc.). This action cannot be undone!`,
      confirmText: 'Delete Profile',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await childService.deleteChild(childToDelete.id);

          // If deleting active child, switch to first remaining child
          if (childToDelete.id === child.id) {
            const remainingChildren = allChildren.filter(c => c.id !== childToDelete.id);
            if (remainingChildren.length > 0) {
              onSwitchChild(remainingChildren[0].id);
            }
          }

          await onChildUpdated();
          setToast({ message: `${childToDelete.name}'s profile deleted`, type: 'success' });
        } catch (error) {
          console.error('Error deleting child:', error);
          setToast({ message: 'Failed to delete profile. Please try again.', type: 'error' });
        }
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const handlePreferenceChange = (key, value) => {
    const updatedPrefs = updatePreference(key, value);
    setPreferences(updatedPrefs);
    setToast({ message: 'Preference updated', type: 'success' });
  };

  const handleToggleSection = (sectionId) => {
    toggleDashboardSection(sectionId);
    loadDashboardSections();
    setToast({ message: 'Section visibility updated', type: 'success' });
  };

  const handleMoveSection = (sectionId, direction) => {
    moveDashboardSection(sectionId, direction);
    loadDashboardSections();
    setToast({ message: 'Section order updated', type: 'success' });
  };

  const handleResetSections = () => {
    setConfirmDialog({
      title: 'Reset Home Page Layout?',
      message: 'This will restore the default home page layout with all sections visible in their original order.',
      confirmText: 'Reset Layout',
      cancelText: 'Cancel',
      variant: 'warning',
      onConfirm: () => {
        setConfirmDialog(null);
        resetDashboardSections();
        loadDashboardSections();
        setToast({ message: 'Home page layout reset to default', type: 'success' });
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white safe-top">
        <div className="container-safe pt-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 bg-white/20 rounded-full active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">Settings</h1>
            <div className="w-10"></div>
          </div>
        </div>
      </div>

      <div className="container-safe py-6 space-y-4">
        {/* ========== FREQUENTLY USED ========== */}

        {/* Child Profile */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Baby className="w-6 h-6 text-blue-500" />
            <h2 className="text-lg font-bold text-gray-900">Child Profile</h2>
          </div>

          {!isEditing ? (
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Name</div>
                <div className="text-lg font-medium text-gray-900">{child.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Date of Birth</div>
                <div className="text-lg font-medium text-gray-900">
                  {formatDate(child.dateOfBirth)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Age</div>
                <div className="text-lg font-medium text-gray-900">
                  {formatAgeWithPreference(child.dateOfBirth, preferences.ageFormat)}
                </div>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="btn-secondary w-full mt-4"
              >
                Edit Profile
              </button>
            </div>
          ) : (
            <form onSubmit={handleUpdateChild} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  maxLength={INPUT_LIMITS.NAME_MAX_LENGTH}
                  required
                />
              </div>
              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  id="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="input-field"
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: child.name,
                      dateOfBirth: new Date(child.dateOfBirth).toISOString().split('T')[0]
                    });
                  }}
                  className="btn-secondary flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Multi-Child Management - Switch Child */}
        {allChildren && allChildren.length > 1 && (
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Baby className="w-6 h-6 text-green-500" />
              <h2 className="text-lg font-bold text-gray-900">Switch Child</h2>
            </div>

            <div className="space-y-2">
              {allChildren.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSwitchChild(c.id);
                    setToast({ message: `Switched to ${c.name}`, type: 'success' });
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    c.id === child.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-green-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Baby className={`w-5 h-5 ${c.id === child.id ? 'text-green-500' : 'text-gray-400'}`} />
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      <div className="text-sm text-gray-600">{formatAgeWithPreference(c.dateOfBirth, preferences.ageFormat)}</div>
                    </div>
                  </div>
                  {c.id === child.id && (
                    <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">Active</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Display Preferences */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-6 h-6 text-indigo-500" />
            <h2 className="text-lg font-bold text-gray-900">Display Preferences</h2>
          </div>

          <div className="space-y-6">
            {/* Age Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Age Display Format
              </label>
              <div className="space-y-2">
                {[
                  { value: 'auto', label: 'Auto (Smart)', description: 'Automatically selects the best format' },
                  { value: 'days', label: 'Days', description: 'Always show in days' },
                  { value: 'weeks', label: 'Weeks', description: 'Show weeks and days' },
                  { value: 'months', label: 'Months', description: 'Show months and weeks' }
                ].map(option => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      preferences.ageFormat === option.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-indigo-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="ageFormat"
                      value={option.value}
                      checked={preferences.ageFormat === option.value}
                      onChange={(e) => handlePreferenceChange('ageFormat', e.target.value)}
                      className="mt-1 w-4 h-4 text-indigo-600"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{option.label}</div>
                      <div className="text-xs text-gray-600">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-3 p-3 bg-indigo-50 rounded-lg text-xs text-gray-600">
                <span className="font-medium">Preview: </span>
                {formatAgeWithPreference(child.dateOfBirth, preferences.ageFormat)}
              </div>
            </div>

            {/* Volume Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Volume Unit
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'oz', label: 'Ounces (oz)', description: 'US standard' },
                  { value: 'ml', label: 'Milliliters (ml)', description: 'Metric' }
                ].map(option => (
                  <label
                    key={option.value}
                    className={`flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      preferences.volumeUnit === option.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="volumeUnit"
                        value={option.value}
                        checked={preferences.volumeUnit === option.value}
                        onChange={(e) => handlePreferenceChange('volumeUnit', e.target.value)}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="font-semibold text-gray-900">{option.label}</span>
                    </div>
                    <div className="text-xs text-gray-600 ml-6">{option.description}</div>
                  </label>
                ))}
              </div>
              <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-gray-600">
                All volume measurements will be displayed in {preferences.volumeUnit === 'oz' ? 'ounces' : 'milliliters'}. Original data is preserved.
              </div>
            </div>
          </div>
        </div>

        {/* ========== MODERATE USE ========== */}

        {/* Home Page Layout Customization */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Layout className="w-6 h-6 text-purple-500" />
            <h2 className="text-lg font-bold text-gray-900">Home Page Layout</h2>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              Customize your home page by showing/hiding sections and changing their order.
            </p>

            <div className="space-y-2">
              {dashboardSections.map((section, index) => (
                <div
                  key={section.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    section.enabled
                      ? 'border-purple-200 bg-purple-50'
                      : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  {/* Toggle Visibility */}
                  <button
                    onClick={() => handleToggleSection(section.id)}
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                    title={section.enabled ? 'Hide section' : 'Show section'}
                  >
                    {section.enabled ? (
                      <Eye className="w-5 h-5 text-purple-600" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {/* Section Label */}
                  <div className="flex-1">
                    <div className={`font-semibold ${section.enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                      {section.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {section.enabled ? 'Visible' : 'Hidden'}
                    </div>
                  </div>

                  {/* Move Up/Down */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleMoveSection(section.id, 'up')}
                      disabled={index === 0}
                      className={`p-1 rounded transition-colors ${
                        index === 0
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-purple-600 hover:bg-white/50'
                      }`}
                      title="Move up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveSection(section.id, 'down')}
                      disabled={index === dashboardSections.length - 1}
                      className={`p-1 rounded transition-colors ${
                        index === dashboardSections.length - 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-purple-600 hover:bg-white/50'
                      }`}
                      title="Move down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Reset Button */}
            <button
              onClick={handleResetSections}
              className="w-full mt-4 flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:from-gray-100 hover:to-gray-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default Layout
            </button>
          </div>

          <div className="p-3 bg-purple-50 rounded-lg text-xs text-gray-600">
            <p className="font-medium mb-1">Tip:</p>
            <p>Hide sections you don&apos;t use to create a cleaner home page. Reorder sections by priority to see the most important information first.</p>
          </div>
        </div>

        {/* Tracking & Growth */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-6 h-6 text-purple-500" />
            <h2 className="text-lg font-bold text-gray-900">Tracking & Growth</h2>
          </div>

          <button
            onClick={() => navigate('/milestones')}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <div className="text-left">
                <div className="font-semibold text-gray-900">Milestones</div>
                <div className="text-sm text-gray-600">Track {child.name}&apos;s special moments</div>
              </div>
            </div>
            <ArrowLeft className="w-5 h-5 text-purple-500 rotate-180" />
          </button>
        </div>

        {/* Pediatrician Reports */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-6 h-6 text-indigo-500" />
            <h2 className="text-lg font-bold text-gray-900">Pediatrician Reports</h2>
          </div>

          <button
            onClick={() => setShowReportDialog(true)}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-500" />
              <div className="text-left">
                <div className="font-semibold text-gray-900">Generate PDF Report</div>
                <div className="text-sm text-gray-600">For doctor visits & checkups</div>
              </div>
            </div>
            <ArrowLeft className="w-5 h-5 text-indigo-500 rotate-180" />
          </button>
        </div>

        {/* Partner Sync & Data Sharing */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Share2 className="w-6 h-6 text-blue-500" />
            <h2 className="text-lg font-bold text-gray-900">Partner Sync & Sharing</h2>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportData}
                className="btn-secondary flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
            </div>

            <button
              onClick={handleGenerateQRCode}
              className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl active:scale-95 transition-transform font-semibold text-gray-900"
            >
              <QrCode className="w-5 h-5 text-blue-500" />
              Share via QR Code (Last 7 Days)
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-gray-600">
            <p className="font-medium mb-2">Partner Sync Instructions:</p>
            <ol className="space-y-1 text-xs list-decimal list-inside">
              <li>Export data from one device</li>
              <li>Transfer file to partner&apos;s device (email, cloud, QR)</li>
              <li>Partner imports file on their device</li>
              <li>Data merges automatically</li>
            </ol>
          </div>
        </div>

        {/* ========== OCCASIONAL USE ========== */}

        {/* Add Another Child */}
        <div className="card">
          <button
            onClick={() => setShowAddChild(true)}
            className="w-full flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl active:scale-95 transition-transform"
          >
            <Baby className="w-5 h-5 text-green-500" />
            <span className="font-semibold text-gray-900">Add Another Child</span>
          </button>

          {allChildren && allChildren.length > 1 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Manage Profiles
              </label>
              {allChildren.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                  <span className="text-sm font-medium text-gray-900">{c.name}</span>
                  <button
                    onClick={() => handleDeleteChild(c)}
                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                    disabled={allChildren.length === 1}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Data Management */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-red-500" />
            <h2 className="text-lg font-bold text-gray-900">Data Management</h2>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleClearAllData}
              className="w-full py-3 px-6 rounded-xl border-2 border-red-200 text-red-600 font-semibold active:scale-95 transition-transform"
            >
              Clear All Data
            </button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-gray-600">
            <p className="font-medium mb-1">About Data Storage</p>
            <p>All your data is stored locally on this device using IndexedDB. Data is only shared when you explicitly export/import.</p>
          </div>
        </div>

        {/* About */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-6 h-6 text-blue-500" />
            <h2 className="text-lg font-bold text-gray-900">About TinyTally</h2>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Version:</strong> 1.0.0</p>
            <p>
              TinyTally is a Progressive Web App (PWA) designed to help parents track their
              child&apos;s daily activities including feeding, diaper changes, and sleep patterns.
            </p>
            <p className="mt-4 text-xs text-gray-500">
              Built with React, Tailwind CSS, and IndexedDB
            </p>
          </div>
        </div>
      </div>

      {/* Report Generation Dialog */}
      {showReportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
              <h2 className="text-lg font-bold text-gray-900">Generate Pediatrician Report</h2>
            </div>

            <div className="p-4 space-y-4">
              {/* Time Period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Period
                </label>
                <select
                  value={reportOptions.days}
                  onChange={(e) => setReportOptions({ ...reportOptions, days: parseInt(e.target.value) })}
                  className="input-field"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 2 weeks</option>
                  <option value={30}>Last month</option>
                  <option value={90}>Last 3 months</option>
                </select>
              </div>

              {/* Sections to Include */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Sections to Include
                </label>
                <div className="space-y-2">
                  {[
                    { key: 'includeFeeding', label: 'Feeding Summary' },
                    { key: 'includeDiapers', label: 'Diaper Statistics' },
                    { key: 'includeSleep', label: 'Sleep Patterns' },
                    { key: 'includeWeight', label: 'Weight Tracking' },
                    { key: 'includeMedicines', label: 'Medications' },
                    { key: 'includeMilestones', label: 'Milestones' },
                    { key: 'includeAlerts', label: 'Health Insights & Alerts' },
                    { key: 'includeDetailedFeeding', label: 'Detailed Feeding Log (up to 50 entries)' }
                  ].map(option => (
                    <label key={option.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reportOptions[option.key]}
                        onChange={(e) => setReportOptions({
                          ...reportOptions,
                          [option.key]: e.target.checked
                        })}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
                <p className="text-xs text-gray-600">
                  This report includes {child.name}&apos;s statistics, trends, and health insights.
                  Perfect for pediatrician visits and checkups.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowReportDialog(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateReport}
                  className="btn-primary flex-1"
                >
                  Generate PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Sync Dialog */}
      {showSyncDialog && qrCodeDataUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
              <h2 className="text-lg font-bold text-gray-900">Share via QR Code</h2>
            </div>

            <div className="p-4 text-center space-y-4">
              <p className="text-sm text-gray-600">
                Scan this QR code with your partner&apos;s device to share the last 7 days of data for {child.name}.
              </p>

              <div className="bg-white p-4 rounded-xl border-2 border-gray-200 inline-block">
                <img src={qrCodeDataUrl} alt="QR Code" className="w-full max-w-sm" />
              </div>

              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 text-xs text-gray-600">
                <p className="font-medium mb-1">Note:</p>
                <p>QR codes work best for recent data only. For full history, use Export/Import instead.</p>
              </div>

              <button
                onClick={() => {
                  setShowSyncDialog(false);
                  setQrCodeDataUrl(null);
                }}
                className="btn-primary w-full"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Child Dialog */}
      {showAddChild && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
              <h2 className="text-lg font-bold text-gray-900">Add Another Child</h2>
            </div>

            <form onSubmit={handleAddChild} className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="newChildName" className="block text-sm font-medium text-gray-700 mb-2">
                  Child&apos;s Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="newChildName"
                  value={newChildData.name}
                  onChange={(e) => setNewChildData({ ...newChildData, name: e.target.value })}
                  className="input-field"
                  placeholder="Enter child's name"
                  maxLength={INPUT_LIMITS.NAME_MAX_LENGTH}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label htmlFor="newChildDob" className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="newChildDob"
                  value={newChildData.dateOfBirth}
                  onChange={(e) => setNewChildData({ ...newChildData, dateOfBirth: e.target.value })}
                  className="input-field"
                  max={new Date().toISOString().split('T')[0]}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddChild(false);
                    setNewChildData({ name: '', dateOfBirth: '' });
                  }}
                  className="btn-secondary flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add Child'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </div>
  );
}
