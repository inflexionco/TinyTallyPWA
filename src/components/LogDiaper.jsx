import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, Droplet } from 'lucide-react';
import { diaperService } from '../services/db';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!editId);

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
      }
    } catch (error) {
      console.error('Error loading diaper:', error);
      alert('Failed to load diaper data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const diaperData = {
        childId: child.id,
        timestamp: new Date(formData.timestamp),
        type: formData.type,
        notes: formData.notes
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
      console.error('Error saving diaper:', error);
      alert('Failed to save diaper change. Please try again.');
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
                Wet
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
                Dirty
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
                Both
              </button>
            </div>
          </div>

          {/* Timestamp */}
          <div>
            <label htmlFor="timestamp" className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Date & Time
            </label>
            <input
              type="datetime-local"
              id="timestamp"
              value={formData.timestamp}
              onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
              className="input-field"
              required
            />
          </div>

          {/* Wetness (for wet diapers) */}
          {showWetFields && (
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

          {/* Stool Details (for dirty diapers) */}
          {showDirtyFields && (
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
                      {cons}
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
                      {col}
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
                      {qty}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

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
              placeholder="Add any additional notes..."
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
              {isSubmitting ? 'Saving...' : editId ? 'Update Diaper' : 'Save Diaper'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
