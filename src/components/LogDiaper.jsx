import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, Droplet } from 'lucide-react';
import { diaperService } from '../services/db';
import { INPUT_LIMITS, sanitizeTextInput, isFutureDate } from '../utils/inputValidation';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';

// Visual indicators for stool characteristics
const CONSISTENCY_ICONS = {
  liquid: '💧',
  soft: '🌊',
  seedy: '🌾',
  formed: '🥖',
  hard: '🪨'
};

const COLOR_ICONS = {
  yellow: '🟡',
  green: '🟢',
  brown: '🟤',
  black: '⚫',
  red: '🔴'
};

const QUANTITY_ICONS = {
  small: '○',
  medium: '◉',
  large: '⬤'
};

export default function LogDiaper({ child }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const [formData, setFormData] = useState({
    type: 'wet',
    timestamp: new Date().toISOString().slice(0, 16),
    wetness: '',
    consistency: '',
    color: '',
    quantity: '',
    notes: ''
  });
  const [timeMode, setTimeMode] = useState('now'); // 'now' | 'recent' | 'custom'
  const [recentMinutes, setRecentMinutes] = useState(0);
  const [detailedMode, setDetailedMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const [toast, setToast] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (editId) {
      loadDiaperData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const loadDiaperData = async () => {
    try {
      const diaper = await diaperService.getDiaper(parseInt(editId));
      if (diaper) {
        setFormData({
          type: diaper.type,
          timestamp: new Date(diaper.timestamp).toISOString().slice(0, 16),
          wetness: diaper.wetness || '',
          consistency: diaper.consistency || '',
          color: diaper.color || '',
          quantity: diaper.quantity || '',
          notes: diaper.notes || ''
        });
        // When editing, show custom time mode and detailed mode
        setTimeMode('custom');
        setDetailedMode(true);
      }
    } catch (error) {
      setToast({ message: 'Failed to load diaper data. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getTimestamp = () => {
    if (timeMode === 'now') {
      return new Date();
    } else if (timeMode === 'recent') {
      const time = new Date();
      time.setMinutes(time.getMinutes() - recentMinutes);
      return time;
    } else {
      return new Date(formData.timestamp);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const timestamp = getTimestamp();

    // Validate timestamp is not in the future
    if (timestamp > new Date()) {
      setToast({ message: 'Diaper change time cannot be in the future', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const diaperData = {
        childId: child.id,
        timestamp: timestamp,
        type: formData.type,
        notes: sanitizeTextInput(formData.notes)
      };

      // Add wetness for wet diapers
      if (formData.type === 'wet' || formData.type === 'both') {
        diaperData.wetness = formData.wetness || 'medium';
      }

      // Add consistency, color, quantity for dirty diapers
      if (formData.type === 'dirty' || formData.type === 'both') {
        diaperData.consistency = formData.consistency || 'soft';
        diaperData.color = formData.color || 'yellow';
        diaperData.quantity = formData.quantity || 'medium';
      }

      if (editId) {
        await diaperService.updateDiaper(parseInt(editId), diaperData);
      } else {
        await diaperService.addDiaper(diaperData);
      }
      navigate('/');
    } catch (error) {
      setToast({ message: 'Failed to save diaper change. Please try again.', type: 'error' });
      setIsSubmitting(false);
    }
  };

  const showWetFields = formData.type === 'wet' || formData.type === 'both';
  const showDirtyFields = formData.type === 'dirty' || formData.type === 'both';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading diaper data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white safe-top">
        <div className="container-safe pt-4 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 bg-white/20 rounded-full active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <Droplet className="w-6 h-6" />
              <h1 className="text-xl font-bold">{editId ? 'Edit Diaper' : 'Log Diaper'}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="container-safe py-6">
        <form onSubmit={handleSubmit} className="card space-y-6">
          {/* Mode Toggle - Show in detailed mode only */}
          {detailedMode && (
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">Detailed Mode</h3>
              <button
                type="button"
                onClick={() => setDetailedMode(false)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ← Simple Mode
              </button>
            </div>
          )}

          {/* Diaper Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Diaper Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'wet' })}
                className={`p-4 rounded-xl border-2 font-medium transition-all ${
                  formData.type === 'wet'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                💧 Wet
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'dirty' })}
                className={`p-4 rounded-xl border-2 font-medium transition-all ${
                  formData.type === 'dirty'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                💩 Dirty
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'both' })}
                className={`p-4 rounded-xl border-2 font-medium transition-all ${
                  formData.type === 'both'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                💧💩 Both
              </button>
            </div>
          </div>

          {/* Timestamp - Only in detailed mode */}
          {detailedMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                When did this happen?
              </label>

            {timeMode === 'now' && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-green-500" />
                    <span className="font-medium text-gray-900">Just now</span>
                    <span className="text-green-600">✓</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTimeMode('recent')}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Adjust time...
                  </button>
                </div>
              </div>
            )}

            {timeMode === 'recent' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRecentMinutes(0);
                      setTimeMode('now');
                    }}
                    className="p-3 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all text-sm font-medium"
                  >
                    Just now
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecentMinutes(5);
                      setTimeMode('recent');
                    }}
                    className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      recentMinutes === 5 && timeMode === 'recent'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-green-400 hover:bg-green-50'
                    }`}
                  >
                    5 min ago
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecentMinutes(15);
                      setTimeMode('recent');
                    }}
                    className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      recentMinutes === 15 && timeMode === 'recent'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-green-400 hover:bg-green-50'
                    }`}
                  >
                    15 min ago
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecentMinutes(30);
                      setTimeMode('recent');
                    }}
                    className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      recentMinutes === 30 && timeMode === 'recent'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-green-400 hover:bg-green-50'
                    }`}
                  >
                    30 min ago
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecentMinutes(60);
                      setTimeMode('recent');
                    }}
                    className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      recentMinutes === 60 && timeMode === 'recent'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-green-400 hover:bg-green-50'
                    }`}
                  >
                    1 hour ago
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeMode('custom')}
                    className="p-3 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all text-sm font-medium"
                  >
                    Custom time...
                  </button>
                </div>
              </div>
            )}

            {timeMode === 'custom' && (
              <div className="space-y-3">
                <input
                  type="datetime-local"
                  id="timestamp"
                  value={formData.timestamp}
                  onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
                  className="input-field"
                  max={new Date().toISOString().slice(0, 16)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setTimeMode('now')}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  ← Back to quick options
                </button>
              </div>
            )}
            </div>
          )}

          {/* Wetness (for wet diapers) - Only in detailed mode */}
          {detailedMode && showWetFields && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Wetness Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['small', 'medium', 'large', 'soaked'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFormData({ ...formData, wetness: level })}
                    className={`p-3 rounded-xl border-2 font-medium capitalize transition-all text-sm ${
                      formData.wetness === level
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stool Details (for dirty diapers) - Only in detailed mode */}
          {detailedMode && showDirtyFields && (
            <>
              {/* Consistency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Consistency
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['liquid', 'soft', 'seedy', 'formed', 'hard'].map((cons) => (
                    <button
                      key={cons}
                      type="button"
                      onClick={() => setFormData({ ...formData, consistency: cons })}
                      className={`p-3 rounded-xl border-2 font-medium capitalize transition-all text-sm ${
                        formData.consistency === cons
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-2xl">{CONSISTENCY_ICONS[cons]}</span>
                        <span className="text-xs">{cons}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Color
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['yellow', 'green', 'brown', 'black', 'red'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: col })}
                      className={`p-3 rounded-xl border-2 font-medium capitalize transition-all text-sm ${
                        formData.color === col
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-2xl">{COLOR_ICONS[col]}</span>
                        <span className="text-xs">{col}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Quantity
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['small', 'medium', 'large'].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setFormData({ ...formData, quantity: qty })}
                      className={`p-3 rounded-xl border-2 font-medium capitalize transition-all text-sm ${
                        formData.quantity === qty
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-2xl">{QUANTITY_ICONS[qty]}</span>
                        <span className="text-xs">{qty}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notes - Only in detailed mode */}
          {detailedMode && (
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input-field resize-none"
                rows="3"
                maxLength={INPUT_LIMITS.NOTES_MAX_LENGTH}
                placeholder="Add any additional notes..."
              />
            </div>
          )}

          {/* Add Details Button - Only in quick mode */}
          {!detailedMode && (
            <button
              type="button"
              onClick={() => setDetailedMode(true)}
              className="w-full p-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all font-medium"
            >
              📝 Add Details (time, notes, etc.)
            </button>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/')}
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
              {isSubmitting ? 'Saving...' : editId ? 'Update Diaper' : 'Save Diaper'}
            </button>
          </div>
        </form>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirm Dialog */}
      {showConfirm && (
        <ConfirmDialog
          title="Unsaved Changes"
          message="You have unsaved changes. Are you sure you want to leave?"
          confirmText="Leave"
          cancelText="Stay"
          onConfirm={() => navigate('/')}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
