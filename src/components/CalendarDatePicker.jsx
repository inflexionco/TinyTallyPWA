import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { statsService } from '../services/db';

export default function CalendarDatePicker({ child, selectedDate, onSelectDate, onDismiss }) {
  const [viewMonth, setViewMonth] = useState(new Date(selectedDate));
  const [datesWithActivity, setDatesWithActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivityDates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMonth, child]);

  const loadActivityDates = async () => {
    setLoading(true);
    try {
      // Get first and last day of the month
      const year = viewMonth.getFullYear();
      const month = viewMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0, 23, 59, 59);

      const activeDates = await statsService.getDatesWithActivity(child.id, firstDay, lastDay);
      setDatesWithActivity(activeDates);
    } catch (error) {
      console.error('Error loading activity dates:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    const newDate = new Date(viewMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setViewMonth(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(viewMonth);
    newDate.setMonth(newDate.getMonth() + 1);

    // Don't go beyond current month
    if (newDate <= new Date()) {
      setViewMonth(newDate);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setViewMonth(today);
    onSelectDate(today);
  };

  const getDaysInMonth = () => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const isDateSelected = (day) => {
    if (!day) return false;
    const checkDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    return checkDate.toDateString() === selectedDate.toDateString();
  };

  const isToday = (day) => {
    if (!day) return false;
    const checkDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    return checkDate.toDateString() === new Date().toDateString();
  };

  const hasActivity = (day) => {
    if (!day) return false;
    const checkDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    return datesWithActivity.includes(checkDate.toDateString());
  };

  const isFutureDate = (day) => {
    if (!day) return false;
    const checkDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    return checkDate > new Date();
  };

  const handleDateClick = (day) => {
    if (!day || isFutureDate(day)) return;
    const newDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    onSelectDate(newDate);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const currentMonthYear = `${monthNames[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;
  const isCurrentMonth = viewMonth.getMonth() === new Date().getMonth() &&
                         viewMonth.getFullYear() === new Date().getFullYear();

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onDismiss}></div>

      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-t-3xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6" />
              <h2 className="text-xl font-bold">Select Date</h2>
            </div>
            <button
              onClick={onDismiss}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-full active:scale-95 transition-all"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>

            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{currentMonthYear}</div>
            </div>

            <button
              onClick={goToNextMonth}
              disabled={isCurrentMonth}
              className={`p-2 rounded-full transition-all ${
                isCurrentMonth
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:bg-gray-100 active:scale-95'
              }`}
            >
              <ChevronRight className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="mb-6">
            {/* Day Names */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {getDaysInMonth().map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="aspect-square"></div>;
                  }

                  const selected = isDateSelected(day);
                  const today = isToday(day);
                  const activity = hasActivity(day);
                  const future = isFutureDate(day);

                  return (
                    <button
                      key={day}
                      onClick={() => handleDateClick(day)}
                      disabled={future}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all relative ${
                        future
                          ? 'text-gray-300 cursor-not-allowed'
                          : selected
                          ? 'bg-blue-500 text-white font-bold shadow-lg scale-105'
                          : today
                          ? 'bg-blue-100 text-blue-700 font-semibold'
                          : activity
                          ? 'bg-green-50 text-gray-900 hover:bg-green-100'
                          : 'text-gray-700 hover:bg-gray-100'
                      } ${!future && 'active:scale-95'}`}
                    >
                      <span className="text-sm">{day}</span>
                      {activity && !selected && (
                        <span className="absolute bottom-1 w-1 h-1 bg-green-500 rounded-full"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="text-xs font-semibold text-gray-600 mb-2">Legend:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 rounded-lg"></div>
                <span className="text-gray-700">Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-100 rounded-lg"></div>
                <span className="text-gray-700">Today</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-50 border border-green-200 rounded-lg relative">
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full"></span>
                </div>
                <span className="text-gray-700">Has activity</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <button
              onClick={goToToday}
              className="btn-secondary flex-1"
            >
              Today
            </button>
            <button
              onClick={onDismiss}
              className="btn-primary flex-1"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
