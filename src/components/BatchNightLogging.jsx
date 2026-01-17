import { useState } from 'react';
import { Moon, X } from 'lucide-react';
import { feedService, diaperService, sleepService } from '../services/db';
import Toast from './Toast';

export default function BatchNightLogging({ child, onComplete, onDismiss }) {
  const [nightData, setNightData] = useState({
    feeds: 0,
    diapers: 0,
    sleepQuality: 'good', // good, moderate, rough, terrible
    startTime: '22:00', // 10 PM
    endTime: '07:00'    // 7 AM
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const parseTime = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();

    // If end time is earlier than start time, it's the next day
    if (timeString === nightData.endTime && hours < 12) {
      date.setDate(date.getDate()); // Today morning
    } else {
      date.setDate(date.getDate() - 1); // Yesterday night
    }

    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const handleQuickSave = async () => {
    setIsSubmitting(true);

    try {
      const start = parseTime(nightData.startTime);
      const end = parseTime(nightData.endTime);
      const durationMs = end - start;

      // Distribute feeds evenly
      if (nightData.feeds > 0) {
        const feedInterval = durationMs / (nightData.feeds + 1);
        for (let i = 1; i <= nightData.feeds; i++) {
          const timestamp = new Date(start.getTime() + (feedInterval * i));
          await feedService.addFeed({
            childId: child.id,
            timestamp,
            type: 'breastfeeding-left', // Default, alternate could be implemented
            duration: 15, // Estimate
            notes: 'Night feed (estimated)'
          });
        }
      }

      // Distribute diapers evenly
      if (nightData.diapers > 0) {
        const diaperInterval = durationMs / (nightData.diapers + 1);
        for (let i = 1; i <= nightData.diapers; i++) {
          const timestamp = new Date(start.getTime() + (diaperInterval * i));
          await diaperService.addDiaper({
            childId: child.id,
            timestamp,
            type: 'wet',
            wetness: 'medium',
            notes: 'Night change (estimated)'
          });
        }
      }

      // Log overall sleep with quality note
      await sleepService.addSleep({
        childId: child.id,
        startTime: start,
        endTime: end,
        type: 'night',
        notes: `Sleep quality: ${nightData.sleepQuality}`
      });

      setToast({ message: 'Night activities logged successfully!', type: 'success' });

      // Wait a bit to show success message, then complete
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      console.error('Error saving night log:', error);
      setToast({ message: 'Failed to save. Please try again.', type: 'error' });
      setIsSubmitting(false);
    }
  };

  const sleepQualityOptions = [
    { value: 'good', label: '😊 Good', emoji: '💤', description: 'Slept well' },
    { value: 'moderate', label: '😐 Moderate', emoji: '😴', description: '2-3 wake-ups' },
    { value: 'rough', label: '😫 Rough', emoji: '😫', description: '4-5 wake-ups' },
    { value: 'terrible', label: '😭 Terrible', emoji: '😭', description: 'Very rough night' }
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onDismiss}></div>

      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-t-3xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Moon className="w-6 h-6" />
              <h2 className="text-xl font-bold">Log Last Night</h2>
            </div>
            <button
              onClick={onDismiss}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-indigo-100">Quick catch-up for overnight activities</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Time Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">From</label>
                <input
                  type="time"
                  value={nightData.startTime}
                  onChange={(e) => setNightData({ ...nightData, startTime: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">To</label>
                <input
                  type="time"
                  value={nightData.endTime}
                  onChange={(e) => setNightData({ ...nightData, endTime: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* Night Feeds */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Night Feeds
            </label>
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4, 5].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setNightData({ ...nightData, feeds: count })}
                  className={`flex-1 p-3 rounded-xl border-2 font-semibold transition-all ${
                    nightData.feeds === count
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Diaper Changes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Diaper Changes
            </label>
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setNightData({ ...nightData, diapers: count })}
                  className={`flex-1 p-3 rounded-xl border-2 font-semibold transition-all ${
                    nightData.diapers === count
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-green-300'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Sleep Quality */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Sleep Quality
            </label>
            <div className="grid grid-cols-2 gap-3">
              {sleepQualityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setNightData({ ...nightData, sleepQuality: option.value })}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    nightData.sleepQuality === option.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{option.emoji}</span>
                    <span className="font-semibold text-gray-900">{option.label}</span>
                  </div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-2">ℹ️ How this works:</p>
              <ul className="space-y-1 text-xs">
                <li>• Feeds and diapers will be distributed evenly across the night</li>
                <li>• All entries will be marked as "estimated"</li>
                <li>• You can edit individual entries later if needed</li>
                <li>• Sleep duration will be logged from start to end time</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 sticky bottom-0 bg-white pt-4 pb-2">
            <button
              type="button"
              onClick={onDismiss}
              className="btn-secondary flex-1"
              disabled={isSubmitting}
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleQuickSave}
              className="btn-primary flex-1"
              disabled={isSubmitting || (nightData.feeds === 0 && nightData.diapers === 0)}
            >
              {isSubmitting ? 'Saving...' : '💾 Save Night Log'}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
