import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Baby, Database, Info } from 'lucide-react';
import { childService, db } from '../services/db';
import { getAgeInWeeks, formatDate } from '../utils/dateUtils';
import { sanitizeName, isValidDate, isFutureDate, INPUT_LIMITS } from '../utils/inputValidation';

export default function Settings({ child, onChildUpdated }) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: child.name,
    dateOfBirth: new Date(child.dateOfBirth).toISOString().split('T')[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateChild = async (e) => {
    e.preventDefault();

    const sanitizedName = sanitizeName(formData.name);

    if (!sanitizedName) {
      alert('Please enter a valid name');
      return;
    }

    if (!isValidDate(formData.dateOfBirth)) {
      alert('Please enter a valid date of birth');
      return;
    }

    if (isFutureDate(formData.dateOfBirth)) {
      alert('Date of birth cannot be in the future');
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
    } catch (error) {
      console.error('Error updating child:', error);
      alert('Failed to update profile. Please try again.');
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
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const handleClearAllData = async () => {
    if (!confirm('Are you sure you want to delete ALL data? This action cannot be undone!')) {
      return;
    }

    if (!confirm('This will permanently delete all feeds, diapers, sleep, and weight records. Are you absolutely sure?')) {
      return;
    }

    try {
      await db.feeds.clear();
      await db.diapers.clear();
      await db.sleep.clear();
      await db.weight.clear();
      alert('All activity data has been cleared.');
      navigate('/');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Failed to clear data. Please try again.');
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
    </div>
  );
}
