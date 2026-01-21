import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, Scale } from 'lucide-react';
import { weightService } from '../services/db';
import { INPUT_LIMITS, sanitizeTextInput, parsePositiveFloat, isFutureDate } from '../utils/inputValidation';
import Toast from './Toast';

export default function LogWeight({ child }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const [formData, setFormData] = useState({
    timestamp: new Date().toISOString().slice(0, 16),
    weight: '',
    unit: 'kg',
    notes: ''
  });
  const [timeMode, setTimeMode] = useState('now'); // 'now' | 'recent' | 'custom'
  const [recentMinutes, setRecentMinutes] = useState(0);
  const [detailedMode, setDetailedMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (editId) {
      loadWeightData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const loadWeightData = async () => {
    try {
      const weight = await weightService.getWeight(parseInt(editId));
      if (weight) {
        setFormData({
          timestamp: new Date(weight.timestamp).toISOString().slice(0, 16),
          weight: weight.weight.toString(),
          unit: weight.unit,
          notes: weight.notes || ''
        });
        // When editing, show custom time mode and detailed mode
        setTimeMode('custom');
        setDetailedMode(true);
      }
    } catch (error) {
      console.error('Error loading weight:', error);
      setToast({ message: 'Failed to load weight data. Please try again.', type: 'error' });
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
      setToast({ message: 'Weight recording time cannot be in the future', type: 'error' });
      return;
    }

    const weight = parsePositiveFloat(formData.weight, INPUT_LIMITS.WEIGHT_MAX);
    if (weight <= 0) {
      setToast({ message: 'Please enter a valid weight', type: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      const weightData = {
        childId: child.id,
        timestamp: timestamp,
        weight: weight,
        unit: formData.unit,
        notes: sanitizeTextInput(formData.notes)
      };

      if (editId) {
        await weightService.updateWeight(parseInt(editId), weightData);
      } else {
        await weightService.addWeight(weightData);
      }

      navigate('/');
    } catch (error) {
      console.error('Error saving weight:', error);
      setToast({ message: 'Failed to save weight. Please try again.', type: 'error' });
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading weight data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white safe-top">
        <div className="container-safe pt-6 pb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 bg-white/20 rounded-full active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <Scale className="w-6 h-6" />
              <h1 className="text-xl font-bold">{editId ? 'Edit Weight' : 'Log Weight'}</h1>
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

          {/* Weight */}
          <div>
            <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-2">
              Weight
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                id="weight"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="input-field flex-1"
                placeholder="Enter weight"
                min="0"
                max={INPUT_LIMITS.WEIGHT_MAX}
                step="0.01"
                required
              />
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="select-field w-24"
              >
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
                <option value="g">g</option>
              </select>
            </div>

            {/* Helpful conversion info */}
            {formData.weight && (
              <div className="mt-2 text-sm text-gray-600">
                {formData.unit === 'kg' && (
                  <span>≈ {(parseFloat(formData.weight) * 2.20462).toFixed(2)} lbs</span>
                )}
                {formData.unit === 'lbs' && (
                  <span>≈ {(parseFloat(formData.weight) / 2.20462).toFixed(2)} kg</span>
                )}
                {formData.unit === 'g' && (
                  <span>≈ {(parseFloat(formData.weight) / 1000).toFixed(2)} kg</span>
                )}
              </div>
            )}
          </div>

          {/* Timestamp - Only in detailed mode */}
          {detailedMode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              When was this weight recorded?
            </label>

            {timeMode === 'now' && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    <span className="font-medium text-gray-900">Just now</span>
                    <span className="text-orange-600">✓</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTimeMode('recent')}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
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
                    className="p-3 rounded-xl border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all text-sm font-medium"
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
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-orange-400 hover:bg-orange-50'
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
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-orange-400 hover:bg-orange-50'
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
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-orange-400 hover:bg-orange-50'
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
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-orange-400 hover:bg-orange-50'
                    }`}
                  >
                    1 hour ago
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeMode('custom')}
                    className="p-3 rounded-xl border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all text-sm font-medium"
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
              className="w-full p-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all font-medium"
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
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editId ? 'Update Weight' : 'Save Weight'}
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
