import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, Moon } from 'lucide-react';
import { sleepService } from '../services/db';
import { INPUT_LIMITS, sanitizeTextInput, isFutureDate, isValidTimeRange } from '../utils/inputValidation';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

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
      }
    } catch (error) {
      console.error('Error loading sleep:', error);
      alert('Failed to load sleep data');
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
      alert('Failed to start sleep tracking. Please try again.');
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
      alert('Failed to end sleep tracking. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSubmitPastSleep = async (e) => {
    e.preventDefault();

    // Validate start time is not in the future
    if (isFutureDate(formData.startTime)) {
      alert('Sleep start time cannot be in the future');
      return;
    }

    // Validate end time is not in the future
    if (isFutureDate(formData.endTime)) {
      alert('Sleep end time cannot be in the future');
      return;
    }

    // Validate end time is after start time
    if (!isValidTimeRange(formData.startTime, formData.endTime)) {
      alert('Sleep end time must be after start time');
      return;
    }

    setIsSubmitting(true);

    try {
      const sleepData = {
        childId: child.id,
        startTime: new Date(formData.startTime),
        endTime: new Date(formData.endTime),
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
      alert('Failed to save sleep. Please try again.');
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
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  id="startTime"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="input-field"
                  max={new Date().toISOString().slice(0, 16)}
                  required
                />
              </div>

              {/* End Time */}
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  End Time
                </label>
                <input
                  type="datetime-local"
                  id="endTime"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="input-field"
                  max={new Date().toISOString().slice(0, 16)}
                  required
                />
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
    </div>
  );
}
