import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, Moon } from 'lucide-react';
import { sleepService } from '../services/db';
import { INPUT_LIMITS, sanitizeTextInput, isFutureDate, isValidTimeRange } from '../utils/inputValidation';
import Toast from './Toast';

export default function LogSleep({ child }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const [activeSleep, setActiveSleep] = useState(null);
  const [formData, setFormData] = useState({
    type: 'nap',
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date().toISOString().slice(0, 16),
    notes: ''
  });
  const [startTimeMode, setStartTimeMode] = useState('now'); // 'now' | 'recent' | 'custom'
  const [endTimeMode, setEndTimeMode] = useState('now'); // 'now' | 'recent' | 'custom'
  const [startRecentMinutes, setStartRecentMinutes] = useState(0);
  const [endRecentMinutes, setEndRecentMinutes] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (editId) {
      loadSleepData();
    } else {
      loadActiveSleep();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child, editId]);

  const loadSleepData = async () => {
    try {
      const sleep = await sleepService.getSleepById(parseInt(editId));
      if (sleep) {
        setFormData({
          type: sleep.type,
          startTime: new Date(sleep.startTime).toISOString().slice(0, 16),
          endTime: sleep.endTime ? new Date(sleep.endTime).toISOString().slice(0, 16) : '',
          notes: sleep.notes || ''
        });
        // When editing, show custom time mode
        setStartTimeMode('custom');
        setEndTimeMode('custom');
      }
    } catch (error) {
      console.error('Error loading sleep:', error);
      setToast({ message: 'Failed to load sleep data. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadActiveSleep = async () => {
    try {
      const active = await sleepService.getActiveSleep(child.id);
      setActiveSleep(active);
    } catch (error) {
      console.error('Error loading active sleep:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSleep = async () => {
    setIsSubmitting(true);

    try {
      await sleepService.addSleep({
        childId: child.id,
        startTime: new Date(),
        type: formData.type,
        notes: sanitizeTextInput(formData.notes)
      });

      await loadActiveSleep();
      setFormData({ ...formData, notes: '' });
    } catch (error) {
      console.error('Error starting sleep:', error);
      setToast({ message: 'Failed to start sleep tracking. Please try again.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndSleep = async () => {
    setIsSubmitting(true);

    try {
      await sleepService.endSleep(activeSleep.id, new Date());
      navigate('/');
    } catch (error) {
      console.error('Error ending sleep:', error);
      setToast({ message: 'Failed to end sleep tracking. Please try again.', type: 'error' });
      setIsSubmitting(false);
    }
  };

  const getStartTimestamp = () => {
    if (startTimeMode === 'now') {
      return new Date();
    } else if (startTimeMode === 'recent') {
      const time = new Date();
      time.setMinutes(time.getMinutes() - startRecentMinutes);
      return time;
    } else {
      return new Date(formData.startTime);
    }
  };

  const getEndTimestamp = () => {
    if (endTimeMode === 'now') {
      return new Date();
    } else if (endTimeMode === 'recent') {
      const time = new Date();
      time.setMinutes(time.getMinutes() - endRecentMinutes);
      return time;
    } else {
      return new Date(formData.endTime);
    }
  };

  const handleSubmitPastSleep = async (e) => {
    e.preventDefault();

    const startTime = getStartTimestamp();
    const endTime = getEndTimestamp();

    // Validate start time is not in the future
    if (startTime > new Date()) {
      setToast({ message: 'Sleep start time cannot be in the future', type: 'error' });
      return;
    }

    // Validate end time is not in the future
    if (endTime > new Date()) {
      setToast({ message: 'Sleep end time cannot be in the future', type: 'error' });
      return;
    }

    // Validate end time is after start time
    if (endTime <= startTime) {
      setToast({ message: 'Sleep end time must be after start time', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const sleepData = {
        childId: child.id,
        startTime: startTime,
        endTime: endTime,
        type: formData.type,
        notes: sanitizeTextInput(formData.notes)
      };

      if (editId) {
        await sleepService.updateSleep(parseInt(editId), sleepData);
      } else {
        await sleepService.addSleep(sleepData);
      }

      navigate('/');
    } catch (error) {
      console.error('Error saving sleep:', error);
      setToast({ message: 'Failed to save sleep. Please try again.', type: 'error' });
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white safe-top">
        <div className="container-safe pt-4 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 bg-white/20 rounded-full active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <Moon className="w-6 h-6" />
              <h1 className="text-xl font-bold">{editId ? 'Edit Sleep' : 'Log Sleep'}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container-safe py-6 space-y-6">
        {/* Active Sleep Tracker */}
        {!editId && activeSleep ? (
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Moon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Sleep in Progress</h2>
                <p className="text-sm text-gray-600 capitalize">
                  {activeSleep.type} - Started {new Date(activeSleep.startTime).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <button
              onClick={handleEndSleep}
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting ? 'Ending Sleep...' : 'End Sleep'}
            </button>
          </div>
        ) : !editId ? (
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Start Sleep Tracking</h2>

            {/* Sleep Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Sleep Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'nap' })}
                  className={`p-4 rounded-xl border-2 font-medium transition-all ${
                    formData.type === 'nap'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  Nap
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'night' })}
                  className={`p-4 rounded-xl border-2 font-medium transition-all ${
                    formData.type === 'night'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  Night Sleep
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label htmlFor="notes-start" className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                id="notes-start"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input-field resize-none"
                rows="2"
                maxLength={INPUT_LIMITS.NOTES_MAX_LENGTH}
                placeholder="Add any notes..."
              />
            </div>

            <button
              onClick={handleStartSleep}
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting ? 'Starting...' : 'Start Sleep Tracking'}
            </button>
          </div>
        ) : null}

        {/* Log Past Sleep */}
        {(!activeSleep || editId) && (
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editId ? 'Edit Sleep' : 'Log Past Sleep'}</h2>

            <form onSubmit={handleSubmitPastSleep} className="space-y-4">
              {/* Sleep Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Sleep Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'nap' })}
                    className={`p-4 rounded-xl border-2 font-medium transition-all ${
                      formData.type === 'nap'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    Nap
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'night' })}
                    className={`p-4 rounded-xl border-2 font-medium transition-all ${
                      formData.type === 'night'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    Night Sleep
                  </button>
                </div>
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  When did sleep start?
                </label>

                {startTimeMode === 'now' && (
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-500" />
                        <span className="font-medium text-gray-900">Just now</span>
                        <span className="text-purple-600">✓</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStartTimeMode('recent')}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                      >
                        Adjust time...
                      </button>
                    </div>
                  </div>
                )}

                {startTimeMode === 'recent' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setStartRecentMinutes(0);
                          setStartTimeMode('now');
                        }}
                        className="p-3 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all text-sm font-medium"
                      >
                        Just now
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStartRecentMinutes(15);
                          setStartTimeMode('recent');
                        }}
                        className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          startRecentMinutes === 15 && startTimeMode === 'recent'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-400 hover:bg-purple-50'
                        }`}
                      >
                        15 min ago
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStartRecentMinutes(30);
                          setStartTimeMode('recent');
                        }}
                        className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          startRecentMinutes === 30 && startTimeMode === 'recent'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-400 hover:bg-purple-50'
                        }`}
                      >
                        30 min ago
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStartRecentMinutes(60);
                          setStartTimeMode('recent');
                        }}
                        className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          startRecentMinutes === 60 && startTimeMode === 'recent'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-400 hover:bg-purple-50'
                        }`}
                      >
                        1 hour ago
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStartRecentMinutes(120);
                          setStartTimeMode('recent');
                        }}
                        className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          startRecentMinutes === 120 && startTimeMode === 'recent'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-400 hover:bg-purple-50'
                        }`}
                      >
                        2 hours ago
                      </button>
                      <button
                        type="button"
                        onClick={() => setStartTimeMode('custom')}
                        className="p-3 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all text-sm font-medium"
                      >
                        Custom time...
                      </button>
                    </div>
                  </div>
                )}

                {startTimeMode === 'custom' && (
                  <div className="space-y-3">
                    <input
                      type="datetime-local"
                      id="startTime"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="input-field"
                      max={new Date().toISOString().slice(0, 16)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setStartTimeMode('now')}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      ← Back to quick options
                    </button>
                  </div>
                )}
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  When did sleep end?
                </label>

                {endTimeMode === 'now' && (
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-500" />
                        <span className="font-medium text-gray-900">Just now</span>
                        <span className="text-purple-600">✓</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEndTimeMode('recent')}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                      >
                        Adjust time...
                      </button>
                    </div>
                  </div>
                )}

                {endTimeMode === 'recent' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEndRecentMinutes(0);
                          setEndTimeMode('now');
                        }}
                        className="p-3 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all text-sm font-medium"
                      >
                        Just now
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEndRecentMinutes(5);
                          setEndTimeMode('recent');
                        }}
                        className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          endRecentMinutes === 5 && endTimeMode === 'recent'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-400 hover:bg-purple-50'
                        }`}
                      >
                        5 min ago
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEndRecentMinutes(15);
                          setEndTimeMode('recent');
                        }}
                        className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          endRecentMinutes === 15 && endTimeMode === 'recent'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-400 hover:bg-purple-50'
                        }`}
                      >
                        15 min ago
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEndRecentMinutes(30);
                          setEndTimeMode('recent');
                        }}
                        className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          endRecentMinutes === 30 && endTimeMode === 'recent'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-400 hover:bg-purple-50'
                        }`}
                      >
                        30 min ago
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEndRecentMinutes(60);
                          setEndTimeMode('recent');
                        }}
                        className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          endRecentMinutes === 60 && endTimeMode === 'recent'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-purple-400 hover:bg-purple-50'
                        }`}
                      >
                        1 hour ago
                      </button>
                      <button
                        type="button"
                        onClick={() => setEndTimeMode('custom')}
                        className="p-3 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all text-sm font-medium"
                      >
                        Custom time...
                      </button>
                    </div>
                  </div>
                )}

                {endTimeMode === 'custom' && (
                  <div className="space-y-3">
                    <input
                      type="datetime-local"
                      id="endTime"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="input-field"
                      max={new Date().toISOString().slice(0, 16)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setEndTimeMode('now')}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      ← Back to quick options
                    </button>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes-past" className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes-past"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field resize-none"
                  rows="2"
                  maxLength={INPUT_LIMITS.NOTES_MAX_LENGTH}
                  placeholder="Add any notes..."
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
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
                  {isSubmitting ? 'Saving...' : editId ? 'Update Sleep' : 'Save Sleep'}
                </button>
              </div>
            </form>
          </div>
        )}
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
