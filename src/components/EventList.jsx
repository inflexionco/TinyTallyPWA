import { Baby, Droplet, Moon, Scale, Pill, Trash2, Edit2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatTime, formatDuration, calculateDuration } from '../utils/dateUtils';
import { feedService, diaperService, sleepService, weightService, medicineService } from '../services/db';
import { useState } from 'react';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';

export default function EventList({ events, onRefresh }) {
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState(null);
  const [repeatingId, setRepeatingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const getStoolColorClasses = (color) => {
    const colorMap = {
      yellow: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      green: 'bg-green-100 text-green-800 border border-green-200',
      brown: 'bg-amber-700 text-amber-50 border border-amber-800',
      black: 'bg-gray-800 text-gray-100 border border-gray-900',
      red: 'bg-red-100 text-red-800 border border-red-200'
    };
    return colorMap[color] || 'bg-gray-100 text-gray-700 border border-gray-200';
  };

  const handleDelete = async (event) => {
    setConfirmDialog({
      title: 'Delete Entry?',
      message: 'Are you sure you want to delete this entry? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        setDeletingId(event.id);

        try {
          if (event.eventType === 'feed') {
            await feedService.deleteFeed(event.id);
          } else if (event.eventType === 'diaper') {
            await diaperService.deleteDiaper(event.id);
          } else if (event.eventType === 'sleep') {
            await sleepService.deleteSleep(event.id);
          } else if (event.eventType === 'weight') {
            await weightService.deleteWeight(event.id);
          } else if (event.eventType === 'medicine') {
            await medicineService.deleteMedicine(event.id);
          }

          setToast({ message: 'Entry deleted successfully', type: 'success' });
          onRefresh();
        } catch (error) {
          console.error('Error deleting event:', error);
          setToast({ message: 'Failed to delete. Please try again.', type: 'error' });
        } finally {
          setDeletingId(null);
        }
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const handleRepeat = async (event) => {
    setRepeatingId(event.id);

    try {
      let newId;
      let eventDescription = '';

      // Create a copy of the event with current timestamp
      if (event.eventType === 'feed') {
        const feedData = {
          childId: event.childId,
          timestamp: new Date(),
          type: event.type,
          duration: event.duration,
          amount: event.amount,
          unit: event.unit,
          notes: event.notes || ''
        };
        newId = await feedService.addFeed(feedData);

        const typeLabels = {
          'breastfeeding-left': 'Breast (Left)',
          'breastfeeding-right': 'Breast (Right)',
          'formula': 'Formula',
          'pumped': 'Pumped Milk'
        };
        const detail = event.duration
          ? formatDuration(event.duration)
          : `${event.amount} ${event.unit}`;
        eventDescription = `${typeLabels[event.type]} - ${detail}`;
      } else if (event.eventType === 'diaper') {
        const diaperData = {
          childId: event.childId,
          timestamp: new Date(),
          type: event.type,
          wetness: event.wetness,
          consistency: event.consistency,
          color: event.color,
          quantity: event.quantity,
          notes: event.notes || ''
        };
        newId = await diaperService.addDiaper(diaperData);

        const typeLabel = event.type === 'both' ? 'Wet & Dirty' : event.type;
        eventDescription = `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} Diaper`;
      } else if (event.eventType === 'sleep') {
        // For sleep, only repeat if it's a completed sleep (has endTime)
        if (!event.endTime) {
          setToast({ message: 'Cannot repeat active sleep session', type: 'info' });
          setRepeatingId(null);
          return;
        }

        const duration = calculateDuration(event.startTime, event.endTime);
        const sleepData = {
          childId: event.childId,
          startTime: new Date(),
          endTime: new Date(Date.now() + duration * 60 * 1000), // Add duration in milliseconds
          type: event.type,
          notes: event.notes || ''
        };
        newId = await sleepService.addSleep(sleepData);

        const typeLabel = event.type === 'nap' ? 'Nap' : 'Night Sleep';
        eventDescription = `${typeLabel} - ${formatDuration(duration)}`;
      } else if (event.eventType === 'weight') {
        const weightData = {
          childId: event.childId,
          timestamp: new Date(),
          weight: event.weight,
          unit: event.unit,
          notes: event.notes || ''
        };
        newId = await weightService.addWeight(weightData);

        eventDescription = `Weight - ${event.weight} ${event.unit}`;
      } else if (event.eventType === 'medicine') {
        const medicineData = {
          childId: event.childId,
          timestamp: new Date(),
          name: event.name,
          dose: event.dose,
          unit: event.unit,
          frequency: event.frequency,
          notes: event.notes || ''
        };
        newId = await medicineService.addMedicine(medicineData);

        eventDescription = `${event.name} - ${event.dose} ${event.unit}`;
      }

      setToast({
        message: `Repeated: ${eventDescription} (now)`,
        type: 'success',
        action: {
          label: 'Undo',
          onClick: async () => {
            // Delete the newly created entry
            if (event.eventType === 'feed') {
              await feedService.deleteFeed(newId);
            } else if (event.eventType === 'diaper') {
              await diaperService.deleteDiaper(newId);
            } else if (event.eventType === 'sleep') {
              await sleepService.deleteSleep(newId);
            } else if (event.eventType === 'weight') {
              await weightService.deleteWeight(newId);
            } else if (event.eventType === 'medicine') {
              await medicineService.deleteMedicine(newId);
            }
            await onRefresh();
            setToast({ message: 'Repeat cancelled', type: 'info' });
          }
        }
      });

      await onRefresh();
    } catch (error) {
      console.error('Error repeating event:', error);
      setToast({ message: 'Failed to repeat entry. Please try again.', type: 'error' });
    } finally {
      setRepeatingId(null);
    }
  };

  const renderFeedEvent = (event) => {
    const typeLabels = {
      'breastfeeding-left': 'Breast (Left)',
      'breastfeeding-right': 'Breast (Right)',
      'formula': 'Formula',
      'pumped': 'Pumped Milk'
    };

    return (
      <div className="event-card border-blue-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Baby className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900">{typeLabels[event.type]}</span>
                <span className="badge badge-feed">
                  {event.duration
                    ? formatDuration(event.duration)
                    : `${event.amount} ${event.unit}`}
                </span>
              </div>
              {event.notes && (
                <p className="text-sm text-gray-600 mt-1 break-words">{event.notes}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">{formatTime(event.timestamp)}</p>
            </div>
          </div>
          <div className="flex gap-1 items-center">
            <button
              onClick={() => handleRepeat(event)}
              disabled={repeatingId === event.id}
              className="p-2 text-gray-400 hover:text-green-500 active:scale-95 transition-all flex-shrink-0"
              title="Repeat (log again now)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(`/log-feed?id=${event.id}`)}
              className="p-2 text-gray-400 hover:text-blue-500 active:scale-95 transition-all flex-shrink-0"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(event)}
              disabled={deletingId === event.id}
              className="p-2 text-gray-400 hover:text-red-500 active:scale-95 transition-all flex-shrink-0"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDiaperEvent = (event) => {
    const typeLabel = event.type === 'both' ? 'Wet & Dirty' : event.type;

    return (
      <div className="event-card border-green-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Droplet className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900 capitalize">{typeLabel} Diaper</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {event.wetness && (
                  <span className="badge badge-diaper capitalize">{event.wetness}</span>
                )}
                {event.consistency && (
                  <span className="badge badge-diaper capitalize">{event.consistency}</span>
                )}
                {event.color && (
                  <span className={`badge capitalize ${getStoolColorClasses(event.color)}`}>{event.color}</span>
                )}
                {event.quantity && (
                  <span className="badge badge-diaper capitalize">{event.quantity}</span>
                )}
              </div>
              {event.notes && (
                <p className="text-sm text-gray-600 mt-1 break-words">{event.notes}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">{formatTime(event.timestamp)}</p>
            </div>
          </div>
          <div className="flex gap-1 items-center">
            <button
              onClick={() => handleRepeat(event)}
              disabled={repeatingId === event.id}
              className="p-2 text-gray-400 hover:text-green-500 active:scale-95 transition-all flex-shrink-0"
              title="Repeat (log again now)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(`/log-diaper?id=${event.id}`)}
              className="p-2 text-gray-400 hover:text-blue-500 active:scale-95 transition-all flex-shrink-0"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(event)}
              disabled={deletingId === event.id}
              className="p-2 text-gray-400 hover:text-red-500 active:scale-95 transition-all flex-shrink-0"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSleepEvent = (event) => {
    const duration = event.endTime
      ? calculateDuration(event.startTime, event.endTime)
      : null;

    const typeLabel = event.type === 'nap' ? 'Nap' : 'Night Sleep';

    return (
      <div className="event-card border-purple-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Moon className="w-5 h-5 text-purple-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900">{typeLabel}</span>
                {event.endTime ? (
                  <span className="badge badge-sleep">{formatDuration(duration)}</span>
                ) : (
                  <span className="badge bg-yellow-100 text-yellow-700">In Progress</span>
                )}
              </div>
              {event.notes && (
                <p className="text-sm text-gray-600 mt-1 break-words">{event.notes}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {formatTime(event.startTime)}
                {event.endTime && ` - ${formatTime(event.endTime)}`}
              </p>
            </div>
          </div>
          <div className="flex gap-1 items-center">
            {event.endTime && (
              <button
                onClick={() => handleRepeat(event)}
                disabled={repeatingId === event.id}
                className="p-2 text-gray-400 hover:text-green-500 active:scale-95 transition-all flex-shrink-0"
                title="Repeat (log again now)"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => navigate(`/log-sleep?id=${event.id}`)}
              className="p-2 text-gray-400 hover:text-blue-500 active:scale-95 transition-all flex-shrink-0"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(event)}
              disabled={deletingId === event.id}
              className="p-2 text-gray-400 hover:text-red-500 active:scale-95 transition-all flex-shrink-0"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderWeightEvent = (event) => {
    return (
      <div className="event-card border-orange-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Scale className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900">Weight Recorded</span>
                <span className="badge bg-orange-100 text-orange-700">
                  {event.weight} {event.unit}
                </span>
              </div>
              {event.notes && (
                <p className="text-sm text-gray-600 mt-1 break-words">{event.notes}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">{formatTime(event.timestamp)}</p>
            </div>
          </div>
          <div className="flex gap-1 items-center">
            <button
              onClick={() => handleRepeat(event)}
              disabled={repeatingId === event.id}
              className="p-2 text-gray-400 hover:text-green-500 active:scale-95 transition-all flex-shrink-0"
              title="Repeat (log again now)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(`/log-weight?id=${event.id}`)}
              className="p-2 text-gray-400 hover:text-blue-500 active:scale-95 transition-all flex-shrink-0"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(event)}
              disabled={deletingId === event.id}
              className="p-2 text-gray-400 hover:text-red-500 active:scale-95 transition-all flex-shrink-0"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderMedicineEvent = (event) => {
    return (
      <div className="event-card border-red-400 bg-red-50/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Pill className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900">{event.name}</span>
                <span className="badge bg-red-100 text-red-700 border border-red-200">
                  {event.dose} {event.unit}
                </span>
              </div>
              {event.notes && (
                <p className="text-sm text-gray-600 mt-1 break-words">{event.notes}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">{formatTime(event.timestamp)}</p>
            </div>
          </div>
          <div className="flex gap-1 items-center">
            <button
              onClick={() => handleRepeat(event)}
              disabled={repeatingId === event.id}
              className="p-2 text-gray-400 hover:text-green-500 active:scale-95 transition-all flex-shrink-0"
              title="Repeat (log again now)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(`/log-medicine?id=${event.id}`)}
              className="p-2 text-gray-400 hover:text-blue-500 active:scale-95 transition-all flex-shrink-0"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(event)}
              disabled={deletingId === event.id}
              className="p-2 text-gray-400 hover:text-red-500 active:scale-95 transition-all flex-shrink-0"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-3">
        {events.map((event) => {
          if (event.eventType === 'feed') {
            return <div key={`feed-${event.id}`}>{renderFeedEvent(event)}</div>;
          } else if (event.eventType === 'diaper') {
            return <div key={`diaper-${event.id}`}>{renderDiaperEvent(event)}</div>;
          } else if (event.eventType === 'sleep') {
            return <div key={`sleep-${event.id}`}>{renderSleepEvent(event)}</div>;
          } else if (event.eventType === 'weight') {
            return <div key={`weight-${event.id}`}>{renderWeightEvent(event)}</div>;
          } else if (event.eventType === 'medicine') {
            return <div key={`medicine-${event.id}`}>{renderMedicineEvent(event)}</div>;
          }
          return null;
        })}
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={5000}
          action={toast.action}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </>
  );
}
