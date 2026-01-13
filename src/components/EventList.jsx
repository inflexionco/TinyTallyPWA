import { Baby, Droplet, Moon, Trash2 } from 'lucide-react';
import { formatTime, formatDuration, calculateDuration } from '../utils/dateUtils';
import { feedService, diaperService, sleepService } from '../services/db';
import { useState } from 'react';

export default function EventList({ events, onRefresh }) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (event) => {
    if (!confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    setDeletingId(event.id);

    try {
      if (event.eventType === 'feed') {
        await feedService.deleteFeed(event.id);
      } else if (event.eventType === 'diaper') {
        await diaperService.deleteDiaper(event.id);
      } else if (event.eventType === 'sleep') {
        await sleepService.deleteSleep(event.id);
      }

      onRefresh();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete. Please try again.');
    } finally {
      setDeletingId(null);
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
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Baby className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
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
          <button
            onClick={() => handleDelete(event)}
            disabled={deletingId === event.id}
            className="p-2 text-gray-400 hover:text-red-500 active:scale-95 transition-all flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderDiaperEvent = (event) => {
    const typeLabel = event.type === 'both' ? 'Wet & Dirty' : event.type;

    return (
      <div className="event-card border-green-400">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Droplet className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
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
                  <span className="badge badge-diaper capitalize">{event.color}</span>
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
          <button
            onClick={() => handleDelete(event)}
            disabled={deletingId === event.id}
            className="p-2 text-gray-400 hover:text-red-500 active:scale-95 transition-all flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
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
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Moon className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900">{typeLabel}</span>
                {duration ? (
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
          <button
            onClick={() => handleDelete(event)}
            disabled={deletingId === event.id}
            className="p-2 text-gray-400 hover:text-red-500 active:scale-95 transition-all flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {events.map((event) => {
        if (event.eventType === 'feed') {
          return <div key={`feed-${event.id}`}>{renderFeedEvent(event)}</div>;
        } else if (event.eventType === 'diaper') {
          return <div key={`diaper-${event.id}`}>{renderDiaperEvent(event)}</div>;
        } else if (event.eventType === 'sleep') {
          return <div key={`sleep-${event.id}`}>{renderSleepEvent(event)}</div>;
        }
        return null;
      })}
    </div>
  );
}
