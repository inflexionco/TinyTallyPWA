import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Baby, Database, Info, Sparkles, FileText } from 'lucide-react';
import { childService, db } from '../services/db';
import { getAgeInWeeks, formatDate } from '../utils/dateUtils';
import { sanitizeName, isValidDate, isFutureDate, INPUT_LIMITS } from '../utils/inputValidation';
import { pdfReportService } from '../services/pdfReportService';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';

export default function Settings({ child, onChildUpdated }) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: child.name,
    dateOfBirth: new Date(child.dateOfBirth).toISOString().split('T')[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
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
        child: await db.child.toArray(),
        feeds: await db.feeds.toArray(),
        diapers: await db.diapers.toArray(),
        sleep: await db.sleep.toArray(),
        weight: await db.weight.toArray(),
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
                  {getAgeInWeeks(child.dateOfBirth)}
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

        {/* Data Management */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-blue-500" />
            <h2 className="text-lg font-bold text-gray-900">Data Management</h2>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleExportData}
              className="btn-secondary w-full"
            >
              Export All Data
            </button>

            <button
              onClick={handleClearAllData}
              className="w-full py-3 px-6 rounded-xl border-2 border-red-200 text-red-600 font-semibold active:scale-95 transition-transform"
            >
              Clear All Data
            </button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-gray-600">
            <p className="font-medium mb-1">About Data Storage</p>
            <p>All your data is stored locally on this device using IndexedDB. Your data never leaves your device and is not synced to any cloud service.</p>
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
