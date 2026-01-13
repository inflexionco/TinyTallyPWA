import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Scale } from 'lucide-react';
import { weightService } from '../services/db';

export default function LogWeight({ child }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    timestamp: new Date().toISOString().slice(0, 16),
    weight: '',
    unit: 'kg',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      alert('Please enter a valid weight');
      return;
    }

    setIsSubmitting(true);

    try {
      await weightService.addWeight({
        childId: child.id,
        timestamp: new Date(formData.timestamp),
        weight: parseFloat(formData.weight),
        unit: formData.unit,
        notes: formData.notes
      });

      navigate('/');
    } catch (error) {
      console.error('Error logging weight:', error);
      alert('Failed to log weight. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white safe-top">
        <div className="container-safe pt-4 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 bg-white/20 rounded-full active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <Scale className="w-6 h-6" />
              <h1 className="text-xl font-bold">Log Weight</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="container-safe py-6">
        <form onSubmit={handleSubmit} className="card space-y-6">
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
              {isSubmitting ? 'Saving...' : 'Save Weight'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
