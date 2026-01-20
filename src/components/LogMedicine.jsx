import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, Pill, AlertTriangle } from 'lucide-react';
import { medicineService, COMMON_MEDICINES } from '../services/db';
import { INPUT_LIMITS, sanitizeTextInput } from '../utils/inputValidation';
import Toast from './Toast';

export default function LogMedicine({ child }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const [formData, setFormData] = useState({
    name: '',
    dose: '',
    unit: 'ml',
    frequency: 'as-needed',
    timestamp: new Date().toISOString().slice(0, 16),
    notes: ''
  });
  const [timeMode, setTimeMode] = useState('now'); // 'now' | 'recent' | 'custom'
  const [recentMinutes, setRecentMinutes] = useState(0);
  const [detailedMode, setDetailedMode] = useState(false);
  const [isCustomMedicine, setIsCustomMedicine] = useState(true);
  const [safetyWarnings, setSafetyWarnings] = useState(null);
  const [nextDoseTime, setNextDoseTime] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (editId) {
      loadMedicineData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // Check safety when medicine name or dose changes
  useEffect(() => {
    if (formData.name && !editId) {
      checkMedicineSafety();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.name]);

  const loadMedicineData = async () => {
    try {
      const medicine = await medicineService.getMedicine(parseInt(editId));
      if (medicine) {
        setFormData({
          name: medicine.name,
          dose: medicine.dose.toString(),
          unit: medicine.unit,
          frequency: medicine.frequency,
          timestamp: new Date(medicine.timestamp).toISOString().slice(0, 16),
          notes: medicine.notes || ''
        });
        // When editing, show custom time mode and detailed mode
        setTimeMode('custom');
        setDetailedMode(true);
      }
    } catch (error) {
      console.error('Error loading medicine:', error);
      setToast({ message: 'Failed to load medicine data. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const checkMedicineSafety = async () => {
    try {
      const warnings = await medicineService.checkSafetyWarnings(child.id, formData.name);
      setSafetyWarnings(warnings);

      const nextTime = await medicineService.getNextDoseTime(child.id, formData.name);
      setNextDoseTime(nextTime);
    } catch (error) {
      console.error('Error checking medicine safety:', error);
    }
  };

  const handleMedicineSelect = (medicine) => {
    setFormData({
      ...formData,
      name: medicine.name,
      dose: medicine.defaultDose.toString(),
      unit: medicine.unit,
      frequency: medicine.frequency
    });
    setIsCustomMedicine(false);
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

    // Safety check: Block if high severity warnings
    if (safetyWarnings && safetyWarnings.some(w => w.severity === 'high')) {
      setToast({ message: 'Cannot proceed: Safety limits exceeded', type: 'error' });
      return;
    }

    const timestamp = getTimestamp();

    // Validate timestamp is not in the future
    if (timestamp > new Date()) {
      setToast({ message: 'Medicine time cannot be in the future', type: 'error' });
      return;
    }

    if (!formData.name || !formData.dose) {
      setToast({ message: 'Please enter medicine name and dose', type: 'error' });
      return;
    }

    const dose = parseFloat(formData.dose);
    if (isNaN(dose) || dose <= 0) {
      setToast({ message: 'Please enter a valid dose', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const medicineData = {
        childId: child.id,
        timestamp: timestamp,
        name: formData.name,
        dose: dose,
        unit: formData.unit,
        frequency: formData.frequency,
        notes: sanitizeTextInput(formData.notes)
      };

      if (editId) {
        await medicineService.updateMedicine(parseInt(editId), medicineData);
      } else {
        await medicineService.addMedicine(medicineData);
      }

      navigate('/');
    } catch (error) {
      console.error('Error saving medicine:', error);
      setToast({ message: 'Failed to save medicine. Please try again.', type: 'error' });
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading medicine data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white safe-top">
        <div className="container-safe pt-4 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 bg-white/20 rounded-full active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <Pill className="w-6 h-6" />
              <h1 className="text-xl font-bold">{editId ? 'Edit Medicine' : 'Log Medicine'}</h1>
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

          {/* Medicine Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Medicine Name
            </label>

            {!isCustomMedicine ? (
              <>
                <div className="grid grid-cols-1 gap-2 mb-3">
                  {COMMON_MEDICINES.map((medicine) => (
                    <button
                      key={medicine.name}
                      type="button"
                      onClick={() => handleMedicineSelect(medicine)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        formData.name === medicine.name
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 bg-white hover:border-red-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{medicine.name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {medicine.defaultDose} {medicine.unit} · {medicine.frequency} · Max {medicine.maxDailyDoses}/day
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomMedicine(true)}
                  className="w-full p-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-all text-sm font-medium"
                >
                  + Custom Medicine
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="Enter medicine name"
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMedicine(false);
                    setFormData({ ...formData, name: '' });
                  }}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Choose from common medicines →
                </button>
              </div>
            )}
          </div>

          {/* Safety Warnings */}
          {safetyWarnings && safetyWarnings.length > 0 && (
            <div className="space-y-2">
              {safetyWarnings.map((warning, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border-2 flex items-start gap-3 ${
                    warning.severity === 'high'
                      ? 'bg-red-50 border-red-300'
                      : 'bg-yellow-50 border-yellow-300'
                  }`}
                >
                  <AlertTriangle
                    className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      warning.severity === 'high' ? 'text-red-600' : 'text-yellow-600'
                    }`}
                  />
                  <div>
                    <div className={`font-semibold ${
                      warning.severity === 'high' ? 'text-red-900' : 'text-yellow-900'
                    }`}>
                      {warning.severity === 'high' ? 'DANGER' : 'WARNING'}
                    </div>
                    <div className={`text-sm ${
                      warning.severity === 'high' ? 'text-red-700' : 'text-yellow-700'
                    }`}>
                      {warning.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Next Dose Info */}
          {nextDoseTime && !safetyWarnings && (
            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
              <div className="flex items-center gap-2 text-green-700">
                <Clock className="w-5 h-5" />
                <div>
                  <div className="font-semibold">Safe to give now</div>
                  <div className="text-sm">
                    Last dose: {new Date(nextDoseTime).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dose */}
          <div>
            <label htmlFor="dose" className="block text-sm font-medium text-gray-700 mb-2">
              Dose
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                id="dose"
                value={formData.dose}
                onChange={(e) => setFormData({ ...formData, dose: e.target.value })}
                className="input-field flex-1"
                placeholder="Enter dose"
                min="0"
                step="0.01"
                required
              />
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="select-field w-24"
              >
                <option value="ml">ml</option>
                <option value="mg">mg</option>
                <option value="drops">drops</option>
                <option value="tsp">tsp</option>
              </select>
            </div>
          </div>

          {/* Timestamp - Only in detailed mode */}
          {detailedMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                When was this given?
              </label>

              {timeMode === 'now' && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-red-500" />
                      <span className="font-medium text-gray-900">Just now</span>
                      <span className="text-red-600">✓</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTimeMode('recent')}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
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
                      className="p-3 rounded-xl border-2 border-gray-200 hover:border-red-400 hover:bg-red-50 transition-all text-sm font-medium"
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
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-red-400 hover:bg-red-50'
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
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-red-400 hover:bg-red-50'
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
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-red-400 hover:bg-red-50'
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
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-red-400 hover:bg-red-50'
                      }`}
                    >
                      1 hour ago
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeMode('custom')}
                      className="p-3 rounded-xl border-2 border-gray-200 hover:border-red-400 hover:bg-red-50 transition-all text-sm font-medium"
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
              className="w-full p-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-all font-medium"
            >
              📝 Add Details (time, notes)
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
              disabled={isSubmitting || (safetyWarnings && safetyWarnings.some(w => w.severity === 'high'))}
            >
              {isSubmitting ? 'Saving...' : editId ? 'Update Medicine' : 'Save Medicine'}
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
    </div>
  );
}
