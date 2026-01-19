import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, Baby, Star } from 'lucide-react';
import { feedService } from '../services/db';
import {
  INPUT_LIMITS,
  sanitizeTextInput,
  parsePositiveInt,
  parsePositiveFloat
} from '../utils/inputValidation';
import Toast from './Toast';

export default function LogFeed({ child }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const [breastSuggestion, setBreastSuggestion] = useState(null);
  const [formData, setFormData] = useState({
    type: 'breastfeeding-left',
    timestamp: new Date().toISOString().slice(0, 16),
    duration: '',
    amount: '',
    unit: 'oz',
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
    const initializeForm = async () => {
      if (editId) {
        await loadFeedData();
      } else {
        // Load breast suggestion for new entries
        const suggestion = await feedService.getLastBreastfeedingSide(child.id);
        if (suggestion) {
          setBreastSuggestion(suggestion);
          // Pre-select the suggested breast
          setFormData(prev => ({
            ...prev,
            type: `breastfeeding-${suggestion.suggestedSide}`
          }));
        }
      }
    };

    initializeForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // Handle quick-log from voice shortcuts or app shortcuts
  useEffect(() => {
    const quickMode = searchParams.get('quick');
    if (quickMode === 'start' && !editId) {
      // Auto-start timer for feeding
      startTimer();
      setToast({ message: 'Feeding timer started!', type: 'success' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loadFeedData = async () => {
    try {
      const feed = await feedService.getFeed(parseInt(editId));
      if (feed) {
        setFormData({
          type: feed.type,
          timestamp: new Date(feed.timestamp).toISOString().slice(0, 16),
          duration: feed.duration?.toString() || '',
          amount: feed.amount?.toString() || '',
          unit: feed.unit || 'oz',
          notes: feed.notes || ''
        });
        // When editing, show custom time mode and detailed mode
        setTimeMode('custom');
        setDetailedMode(true);
      }
    } catch (error) {
      setToast({ message: 'Failed to load feed data. Please try again.', type: 'error' });
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
      setToast({ message: 'Feed time cannot be in the future', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const feedData = {
        childId: child.id,
        timestamp: timestamp,
        type: formData.type,
        notes: sanitizeTextInput(formData.notes)
      };

      // Add duration or amount based on feed type
      if (formData.type.startsWith('breastfeeding')) {
        feedData.duration = parsePositiveInt(formData.duration, INPUT_LIMITS.DURATION_MAX);
      } else {
        feedData.amount = parsePositiveFloat(formData.amount, INPUT_LIMITS.AMOUNT_MAX);
        feedData.unit = formData.unit;
      }

      if (editId) {
        await feedService.updateFeed(parseInt(editId), feedData);
      } else {
        await feedService.addFeed(feedData);
      }
      navigate('/');
    } catch (error) {
      setToast({ message: 'Failed to save feed. Please try again.', type: 'error' });
      setIsSubmitting(false);
    }
  };

  const isBreastfeeding = formData.type.startsWith('breastfeeding');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading feed data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white safe-top">
        <div className="container-safe pt-4 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 bg-white/20 rounded-full active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <Baby className="w-6 h-6" />
              <h1 className="text-xl font-bold">{editId ? 'Edit Feed' : 'Log Feed'}</h1>
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

          {/* Feed Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Feed Type
            </label>
            {breastSuggestion && (
              <div className="mb-3 p-3 bg-pink-50 border-2 border-pink-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-pink-700">
                  <Star className="w-4 h-4 fill-pink-500 text-pink-500" />
                  <span className="font-semibold">
                    Try <span className="capitalize">{breastSuggestion.suggestedSide}</span> breast next
                  </span>
                </div>
                <div className="text-xs text-pink-600 mt-1 ml-6">
                  Last: {breastSuggestion.side} breast
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'breastfeeding-left' })}
                className={`p-4 rounded-xl border-2 font-medium transition-all relative ${
                  formData.type === 'breastfeeding-left'
                    ? breastSuggestion?.suggestedSide === 'left'
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-blue-500 bg-blue-50 text-blue-700'
                    : breastSuggestion?.suggestedSide === 'left'
                      ? 'border-pink-300 bg-pink-50/50 text-gray-700'
                      : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  {breastSuggestion?.suggestedSide === 'left' && (
                    <Star className="w-4 h-4 fill-pink-500 text-pink-500" />
                  )}
                  <span>Breast (Left)</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'breastfeeding-right' })}
                className={`p-4 rounded-xl border-2 font-medium transition-all relative ${
                  formData.type === 'breastfeeding-right'
                    ? breastSuggestion?.suggestedSide === 'right'
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-blue-500 bg-blue-50 text-blue-700'
                    : breastSuggestion?.suggestedSide === 'right'
                      ? 'border-pink-300 bg-pink-50/50 text-gray-700'
                      : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  {breastSuggestion?.suggestedSide === 'right' && (
                    <Star className="w-4 h-4 fill-pink-500 text-pink-500" />
                  )}
                  <span>Breast (Right)</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'formula' })}
                className={`p-4 rounded-xl border-2 font-medium transition-all ${
                  formData.type === 'formula'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                Formula
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'pumped' })}
                className={`p-4 rounded-xl border-2 font-medium transition-all ${
                  formData.type === 'pumped'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                Pumped Milk
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
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span className="font-medium text-gray-900">Just now</span>
                    <span className="text-green-600">✓</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTimeMode('recent')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
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
                    className="p-3 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-sm font-medium"
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
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
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
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
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
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
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
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    1 hour ago
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeMode('custom')}
                    className="p-3 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-sm font-medium"
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

          {/* Duration (for breastfeeding) - Only in detailed mode */}
          {detailedMode && isBreastfeeding && (
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
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-4">
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

          {/* Amount (for formula/pumped) - Only in detailed mode */}
          {detailedMode && !isBreastfeeding && (
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount
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
              className="w-full p-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium"
            >
              📝 Add Details (time, duration/amount, notes)
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
              {isSubmitting ? 'Saving...' : editId ? 'Update Feed' : 'Save Feed'}
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
