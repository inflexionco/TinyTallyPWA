import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { statsService } from '../services/db';
import { formatDate, getDateLabel } from '../utils/dateUtils';
import EventList from './EventList';
import CalendarDatePicker from './CalendarDatePicker';

export default function History({ child }) {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    loadHistoryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child, selectedDate]);

  const loadHistoryData = async () => {
    setLoading(true);
    try {
      const statsData = await statsService.getDailyStats(child.id, selectedDate);
      setStats(statsData);

      // Combine all events and sort by time
      const allEvents = [
        ...statsData.feeds.map(f => ({ ...f, eventType: 'feed' })),
        ...statsData.diapers.map(d => ({ ...d, eventType: 'diaper' })),
        ...statsData.sleeps.map(s => ({ ...s, eventType: 'sleep' })),
        ...statsData.weights.map(w => ({ ...w, eventType: 'weight' })),
        ...statsData.medicines.map(m => ({ ...m, eventType: 'medicine' })),
        ...statsData.pumpings.map(p => ({ ...p, eventType: 'pumping' })),
        ...statsData.tummyTimes.map(tt => ({ ...tt, eventType: 'tummyTime' }))
      ].sort((a, b) => {
        const timeA = a.timestamp || a.startTime;
        const timeB = b.timestamp || b.startTime;
        return new Date(timeB) - new Date(timeA);
      });

      setEvents(allEvents);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);

    // Don't go into the future
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handleCalendarDateSelect = (date) => {
    setSelectedDate(date);
    setShowCalendar(false);
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white safe-top">
        <div className="container-safe pt-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 bg-white/20 rounded-full active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">History</h1>
            <button
              onClick={() => setShowCalendar(true)}
              className="p-2 bg-white/20 rounded-full active:scale-95 transition-transform"
              title="Open calendar"
            >
              <Calendar className="w-5 h-5" />
            </button>
          </div>

          {/* Date Navigator */}
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousDay}
              className="p-2 bg-white/20 rounded-full active:scale-95 transition-transform"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="text-lg font-bold">{getDateLabel(selectedDate)}</div>
              <div className="text-sm text-blue-100">{formatDate(selectedDate)}</div>
            </div>

            <button
              onClick={goToNextDay}
              disabled={isToday}
              className={`p-2 rounded-full transition-transform ${
                isToday
                  ? 'opacity-30 cursor-not-allowed'
                  : 'bg-white/20 active:scale-95'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {!isToday && (
            <button
              onClick={goToToday}
              className="mt-3 px-4 py-2 bg-white/20 rounded-full text-sm font-medium active:scale-95 transition-transform mx-auto block"
            >
              Go to Today
            </button>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-white/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">{stats.totalFeeds}</div>
                <div className="text-xs text-blue-100">Feeds</div>
              </div>
              <div className="bg-white/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">{stats.totalDiapers}</div>
                <div className="text-xs text-blue-100">Diapers</div>
              </div>
              <div className="bg-white/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold">{stats.totalSleepHours}h</div>
                <div className="text-xs text-blue-100">Sleep</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Events List */}
      <div className="container-safe py-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : events.length > 0 ? (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Activity for {getDateLabel(selectedDate)}
            </h2>
            <EventList events={events} onRefresh={loadHistoryData} />
          </>
        ) : (
          <div className="card text-center py-12">
            <p className="text-gray-500 text-lg">No activities logged</p>
            <p className="text-sm text-gray-400 mt-2">
              No data recorded for this day
            </p>
          </div>
        )}
      </div>

      {/* Calendar Date Picker Modal */}
      {showCalendar && (
        <CalendarDatePicker
          child={child}
          selectedDate={selectedDate}
          onSelectDate={handleCalendarDateSelect}
          onDismiss={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
}
