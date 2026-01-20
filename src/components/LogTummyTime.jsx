import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Timer } from 'lucide-react';
import { tummyTimeService } from '../services/db';
import { INPUT_LIMITS, sanitizeTextInput } from '../utils/inputValidation';
import Toast from './Toast';

// Helper function to get current local time in datetime-local format
const getCurrentLocalDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Helper function to convert Date to local datetime-local format
const toLocalDateTime = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function LogTummyTime({ child }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const [formData, setFormData] = useState({
    startTime: getCurrentLocalDateTime(),
    endTime: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (editId) {
      loadTummyTimeData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const loadTummyTimeData = async () => {
    try {
      const tummyTime = await tummyTimeService.getTummyTimeById(parseInt(editId));
      if (tummyTime) {
        setFormData({
          startTime: toLocalDateTime(tummyTime.startTime),
          endTime: tummyTime.endTime ? toLocalDateTime(tummyTime.endTime) : getCurrentLocalDateTime(),
          notes: tummyTime.notes || ''
        });
      }
    } catch (error) {
      setToast({ message: 'Failed to load tummy time data. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);

    // Validate times
    if (start > new Date()) {
      setToast({ message: 'Start time cannot be in the future', type: 'error' });
      return;
    }

    if (end > new Date()) {
      setToast({ message: 'End time cannot be in the future', type: 'error' });
      return;
    }

    if (end <= start) {
      setToast({ message: 'End time must be after start time', type: 'error' });
      return;
    }

    const duration = Math.round((end - start) / 1000 / 60); // minutes

    if (duration > 120) {
      setToast({ message: 'Tummy time sessions longer than 2 hours are unusual', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const tummyTimeData = {
        childId: child.id,
        startTime: start,
        endTime: end,
        duration,
        notes: sanitizeTextInput(formData.notes)
      };

      if (editId) {
        await tummyTimeService.updateTummyTime(parseInt(editId), tummyTimeData);
      } else {
        await tummyTimeService.addTummyTime(tummyTimeData);
      }
      navigate('/');
    } catch (error) {
      setToast({ message: 'Failed to save tummy time. Please try again.', type: 'error' });
      setIsSubmitting(false);
    }
  };

  const calculateDuration = () => {
    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);
    const diff = (end - start) / 1000 / 60; // minutes
    return diff > 0 ? Math.round(diff) : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tummy time data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white safe-top">
        <div className="container-safe pt-4 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 bg-white/20 rounded-full active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <Timer className="w-6 h-6" />
              <h1 className="text-xl font-bold">{editId ? 'Edit Tummy Time' : 'Log Tummy Time'}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="container-safe py-6">
        <form onSubmit={handleSubmit} className="card space-y-6">
          {/* Duration Preview */}
          {calculateDuration() > 0 && (
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 text-center">
              <div className="text-sm text-emerald-700 mb-1">Duration</div>
              <div className="text-3xl font-bold text-emerald-600">
                {calculateDuration()} min
              </div>
              {calculateDuration() >= 30 && (
                <div className="text-xs text-emerald-600 mt-2">
                  ✓ Great job! Met daily goal
                </div>
              )}
            </div>
          )}

          {/* Start Time */}
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              id="startTime"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="input-field"
              max={getCurrentLocalDateTime()}
              required
            />
          </div>

          {/* End Time */}
          <div>
            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
              End Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              id="endTime"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="input-field"
              min={formData.startTime || undefined}
              max={getCurrentLocalDateTime()}
              required
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-2">💡 Tummy Time Tips:</p>
              <ul className="space-y-1 text-xs">
                <li>• Recommended: 30-60 minutes total per day</li>
                <li>• Break into short sessions (3-5 minutes)</li>
                <li>• Always supervise during tummy time</li>
                <li>• Place on firm, safe surface</li>
              </ul>
            </div>
          </div>

          {/* Notes */}
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
              placeholder="How did baby do? Any milestones?"
            />
          </div>

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
              {isSubmitting ? 'Saving...' : editId ? 'Update Tummy Time' : 'Save Tummy Time'}
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
