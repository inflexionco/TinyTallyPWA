import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, Droplets } from 'lucide-react';
import { pumpingService } from '../services/db';
import {
  INPUT_LIMITS,
  sanitizeTextInput,
  parsePositiveInt,
  parsePositiveFloat
} from '../utils/inputValidation';
import Toast from './Toast';

export default function LogPumping({ child }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const [formData, setFormData] = useState({
    side: 'both',
    timestamp: new Date().toISOString().slice(0, 16),
    duration: '',
    amount: '',
    unit: 'oz',
    storageLocation: '',
    notes: ''
  });
  const [timeMode, setTimeMode] = useState('now'); // 'now' | 'recent' | 'custom'
  const [recentMinutes, setRecentMinutes] = useState(0);
  const [detailedMode, setDetailedMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTimerMode, setIsTimerMode] = useState(false);
  const [timerStartTime, setTimerStartTime] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [loading, setLoading] = useState(!!editId);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (editId) {
      loadPumpingData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const loadPumpingData = async () => {
    try {
      const pumping = await pumpingService.getPumpingById(parseInt(editId));
      if (pumping) {
        setFormData({
          side: pumping.side,
          timestamp: new Date(pumping.timestamp).toISOString().slice(0, 16),
          duration: pumping.duration?.toString() || '',
          amount: pumping.amount?.toString() || '',
          unit: pumping.unit || 'oz',
          storageLocation: pumping.storageLocation || '',
          notes: pumping.notes || ''
        });
        // When editing, show custom time mode and detailed mode
        setTimeMode('custom');
        setDetailedMode(true);
      }
    } catch (error) {
      setToast({ message: 'Failed to load pumping data. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval;
    if (isTimerMode && timerStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
        setTimerSeconds(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerMode, timerStartTime]);

  const startTimer = () => {
    setIsTimerMode(true);
    setTimerStartTime(Date.now());
    setTimerSeconds(0);
  };

  const stopTimer = () => {
    const minutes = Math.floor(timerSeconds / 60);
    setFormData({ ...formData, duration: minutes.toString() });
    setIsTimerMode(false);
    setTimerStartTime(null);
    setTimerSeconds(0);
  };

  const formatTimerDisplay = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      setToast({ message: 'Pumping time cannot be in the future', type: 'error' });
      return;
    }

    // Validate amount is provided
    if (!formData.amount) {
      setToast({ message: 'Please enter the amount pumped', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const pumpingData = {
        childId: child.id,
        timestamp: timestamp,
        side: formData.side,
        duration: parsePositiveInt(formData.duration, INPUT_LIMITS.DURATION_MAX),
        amount: parsePositiveFloat(formData.amount, INPUT_LIMITS.AMOUNT_MAX),
        unit: formData.unit,
        storageLocation: formData.storageLocation,
        notes: sanitizeTextInput(formData.notes)
      };

      if (editId) {
        await pumpingService.updatePumping(parseInt(editId), pumpingData);
      } else {
        await pumpingService.addPumping(pumpingData);
      }
      navigate('/');
    } catch (error) {
      setToast({ message: 'Failed to save pumping session. Please try again.', type: 'error' });
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pumping data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white safe-top">
        <div className="container-safe pt-4 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 bg-white/20 rounded-full active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <Droplets className="w-6 h-6" />
              <h1 className="text-xl font-bold">{editId ? 'Edit Pumping' : 'Log Pumping'}</h1>
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

          {/* Breast Side */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Breast Side
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, side: 'left' })}
                className={`p-4 rounded-xl border-2 font-medium transition-all ${
                  formData.side === 'left'
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                Left
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, side: 'right' })}
                className={`p-4 rounded-xl border-2 font-medium transition-all ${
                  formData.side === 'right'
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                Right
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, side: 'both' })}
                className={`p-4 rounded-xl border-2 font-medium transition-all ${
                  formData.side === 'both'
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                Both
              </button>
            </div>
          </div>

          {/* Amount (Required) */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                id="amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="input-field flex-1"
                placeholder="Enter amount"
                min="0"
                max={INPUT_LIMITS.AMOUNT_MAX}
                step="0.5"
                required
              />
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="select-field w-24"
              >
                <option value="oz">oz</option>
                <option value="ml">ml</option>
              </select>
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
                <div className="bg-cyan-50 border-2 border-cyan-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-cyan-500" />
                      <span className="font-medium text-gray-900">Just now</span>
                      <span className="text-green-600">✓</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTimeMode('recent')}
                      className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
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
                      className="p-3 rounded-xl border-2 border-gray-200 hover:border-cyan-400 hover:bg-cyan-50 transition-all text-sm font-medium"
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
                          ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                          : 'border-gray-200 hover:border-cyan-400 hover:bg-cyan-50'
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
                          ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                          : 'border-gray-200 hover:border-cyan-400 hover:bg-cyan-50'
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
                          ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                          : 'border-gray-200 hover:border-cyan-400 hover:bg-cyan-50'
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
                          ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                          : 'border-gray-200 hover:border-cyan-400 hover:bg-cyan-50'
                      }`}
                    >
                      1 hour ago
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeMode('custom')}
                      className="p-3 rounded-xl border-2 border-gray-200 hover:border-cyan-400 hover:bg-cyan-50 transition-all text-sm font-medium"
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

          {/* Duration - Only in detailed mode */}
          {detailedMode && (
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>

              {!isTimerMode ? (
                <>
                  <input
                    type="number"
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="input-field"
                    placeholder="Enter duration in minutes"
                    min="0"
                    max={INPUT_LIMITS.DURATION_MAX}
                    step="1"
                  />
                  <button
                    type="button"
                    onClick={startTimer}
                    className="btn-secondary w-full mt-3"
                  >
                    <Clock className="w-4 h-4 inline mr-2" />
                    Use Timer
                  </button>
                </>
              ) : (
                <div className="bg-cyan-50 border-2 border-cyan-200 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-cyan-600 mb-4">
                    {formatTimerDisplay(timerSeconds)}
                  </div>
                  <button
                    type="button"
                    onClick={stopTimer}
                    className="btn-primary"
                  >
                    Stop Timer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Storage Location - Only in detailed mode */}
          {detailedMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Storage Location (Optional)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['fridge', 'freezer', 'fed-immediately'].map((location) => (
                  <button
                    key={location}
                    type="button"
                    onClick={() => setFormData({ ...formData, storageLocation: location })}
                    className={`p-3 rounded-xl border-2 font-medium capitalize transition-all text-sm ${
                      formData.storageLocation === location
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    {location === 'fed-immediately' ? 'Fed Now' : location}
                  </button>
                ))}
              </div>
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
              className="w-full p-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 hover:border-cyan-400 hover:text-cyan-600 hover:bg-cyan-50 transition-all font-medium"
            >
              📝 Add Details (time, duration, storage, notes)
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
              disabled={isSubmitting || isTimerMode}
            >
              {isSubmitting ? 'Saving...' : editId ? 'Update Pumping' : 'Save Pumping'}
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
