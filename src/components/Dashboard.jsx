import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Baby, Droplet, Moon, Scale, Pill, Droplets, Timer, History, Settings, RefreshCw } from 'lucide-react';
import { feedService, diaperService, sleepService, weightService, medicineService, pumpingService, tummyTimeService, statsService } from '../services/db';
import { formatTime, formatTimeAgo, formatDuration, getAgeInWeeks } from '../utils/dateUtils';
import EventList from './EventList';
import Toast from './Toast';
import BatchNightLogging from './BatchNightLogging';

export default function Dashboard({ child }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [lastFeed, setLastFeed] = useState(null);
  const [lastDiaper, setLastDiaper] = useState(null);
  const [lastSleep, setLastSleep] = useState(null);
  const [lastWeight, setLastWeight] = useState(null);
  const [lastMedicine, setLastMedicine] = useState(null);
  const [activeSleep, setActiveSleep] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [lastQuickLogId, setLastQuickLogId] = useState(null);
  const [breastSuggestion, setBreastSuggestion] = useState(null);
  const [feedingPattern, setFeedingPattern] = useState(null);
  const [showBatchNightLog, setShowBatchNightLog] = useState(false);

  useEffect(() => {
    loadDashboardData();
    checkForOvernightGap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, lastFeedData, lastDiaperData, lastSleepData, lastWeightData, lastMedicineData, activeSleepData, breastSuggestionData, feedingPatternData] = await Promise.all([
        statsService.getDailyStats(child.id, new Date()),
        feedService.getLastFeed(child.id),
        diaperService.getLastDiaper(child.id),
        sleepService.getLastSleep(child.id),
        weightService.getLastWeight(child.id),
        medicineService.getLastMedicine(child.id),
        sleepService.getActiveSleep(child.id),
        feedService.getLastBreastfeedingSide(child.id),
        feedService.detectFeedingPattern(child.id, 7)
      ]);

      setStats(statsData);
      setLastFeed(lastFeedData);
      setLastDiaper(lastDiaperData);
      setLastSleep(lastSleepData);
      setLastWeight(lastWeightData);
      setLastMedicine(lastMedicineData);
      setActiveSleep(activeSleepData);
      setBreastSuggestion(breastSuggestionData);
      setFeedingPattern(feedingPatternData);

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
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFeedTypeLabel = (type) => {
    const labels = {
      'breastfeeding-left': 'Breast (L)',
      'breastfeeding-right': 'Breast (R)',
      'formula': 'Formula',
      'pumped': 'Pumped Milk'
    };
    return labels[type] || type;
  };

  const getSleepTypeLabel = (type) => {
    return type === 'nap' ? 'Nap' : 'Night Sleep';
  };

  const formatTimeSince = (milliseconds) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const checkForOvernightGap = async () => {
    const now = new Date();
    const currentHour = now.getHours();

    // Only show between 7 AM - 10 AM
    if (currentHour < 7 || currentHour > 10) return;

    // Check if batch log prompt already dismissed today
    const dismissedToday = localStorage.getItem('batchLogDismissed');
    if (dismissedToday === now.toDateString()) return;

    try {
      // Check for overnight gap (10 PM yesterday - 6 AM today)
      const yesterday10pm = new Date(now);
      yesterday10pm.setDate(yesterday10pm.getDate() - 1);
      yesterday10pm.setHours(22, 0, 0, 0);

      const today6am = new Date(now);
      today6am.setHours(6, 0, 0, 0);

      // Check feeds and diapers in that window
      const [overnightFeeds, overnightDiapers] = await Promise.all([
        feedService.getFeeds(child.id, yesterday10pm, today6am),
        diaperService.getDiapers(child.id, yesterday10pm, today6am)
      ]);

      // If less than 2 total entries overnight, suggest batch logging
      if (overnightFeeds.length + overnightDiapers.length < 2) {
        setShowBatchNightLog(true);
      }
    } catch (error) {
      console.error('Error checking overnight gap:', error);
    }
  };

  const handleBatchNightLogDismiss = () => {
    const now = new Date();
    localStorage.setItem('batchLogDismissed', now.toDateString());
    setShowBatchNightLog(false);
  };

  const handleBatchNightLogComplete = () => {
    setShowBatchNightLog(false);
    loadDashboardData(); // Refresh to show new entries
  };

  // Quick-log functions for one-tap logging
  const handleQuickLogDiaper = async (type) => {
    try {
      const diaperData = {
        childId: child.id,
        timestamp: new Date(),
        type: type,
        notes: 'Quick log'
      };

      // Add defaults for wet diapers
      if (type === 'wet' || type === 'both') {
        diaperData.wetness = 'medium';
      }

      // Add defaults for dirty diapers
      if (type === 'dirty' || type === 'both') {
        diaperData.consistency = 'soft';
        diaperData.color = 'yellow';
        diaperData.quantity = 'medium';
      }

      const id = await diaperService.addDiaper(diaperData);
      setLastQuickLogId({ type: 'diaper', id });

      const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
      setToast({
        message: `${typeLabel} diaper logged at ${formatTime(new Date())}`,
        type: 'success',
        action: {
          label: 'Undo',
          onClick: async () => {
            await diaperService.deleteDiaper(id);
            await loadDashboardData();
            setToast({ message: 'Diaper entry removed', type: 'info' });
          }
        }
      });

      await loadDashboardData();
    } catch (error) {
      setToast({ message: 'Failed to log diaper. Please try again.', type: 'error' });
    }
  };

  const handleQuickLogFeed = async (type) => {
    try {
      const feedData = {
        childId: child.id,
        timestamp: new Date(),
        type: type,
        notes: 'Quick log'
      };

      // Add default duration for breastfeeding, or amount for formula/pumped
      if (type.startsWith('breastfeeding')) {
        feedData.duration = 15; // 15 minutes default
      } else {
        feedData.amount = 4; // 4 oz default
        feedData.unit = 'oz';
      }

      const id = await feedService.addFeed(feedData);
      setLastQuickLogId({ type: 'feed', id });

      const typeLabel = getFeedTypeLabel(type);
      setToast({
        message: `${typeLabel} logged at ${formatTime(new Date())}`,
        type: 'success',
        action: {
          label: 'Undo',
          onClick: async () => {
            await feedService.deleteFeed(id);
            await loadDashboardData();
            setToast({ message: 'Feed entry removed', type: 'info' });
          }
        }
      });

      await loadDashboardData();
    } catch (error) {
      setToast({ message: 'Failed to log feed. Please try again.', type: 'error' });
    }
  };

  const handleQuickLogSleep = async (type) => {
    try {
      // Check if there's already an active sleep
      if (activeSleep) {
        setToast({ message: 'Sleep tracking already in progress', type: 'info' });
        return;
      }

      const sleepData = {
        childId: child.id,
        startTime: new Date(),
        endTime: null,
        type: type,
        notes: 'Quick log'
      };

      const id = await sleepService.addSleep(sleepData);
      setLastQuickLogId({ type: 'sleep', id });

      const typeLabel = type === 'nap' ? 'Nap' : 'Night sleep';
      setToast({
        message: `${typeLabel} tracking started`,
        type: 'success',
        action: {
          label: 'Undo',
          onClick: async () => {
            await sleepService.deleteSleep(id);
            await loadDashboardData();
            setToast({ message: 'Sleep tracking cancelled', type: 'info' });
          }
        }
      });

      await loadDashboardData();
    } catch (error) {
      setToast({ message: 'Failed to start sleep tracking. Please try again.', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white safe-top">
        <div className="container-safe pt-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Baby className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{child.name}</h1>
                <p className="text-sm text-blue-100">{getAgeInWeeks(child.dateOfBirth)} old</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadDashboardData}
                className="p-2 bg-white/20 rounded-full active:scale-95 transition-transform"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/history')}
                className="p-2 bg-white/20 rounded-full active:scale-95 transition-transform"
              >
                <History className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="p-2 bg-white/20 rounded-full active:scale-95 transition-transform"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Today's Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-3 pb-2">
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

      <div className="container-safe py-6">
        {/* Feeding Suggestion Widget */}
        {breastSuggestion && (
          <div className="card mb-6 bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200">
            <div className="flex items-center gap-2 mb-2">
              <Baby className="w-5 h-5 text-pink-500" />
              <h2 className="text-lg font-semibold text-gray-900">Feeding Suggestion</h2>
            </div>

            <div className="bg-white/60 rounded-lg p-3 mb-3">
              <div className="text-sm text-gray-600 mb-1">
                Last fed: <span className="font-semibold text-gray-900 capitalize">{breastSuggestion.side}</span> breast
              </div>
              <div className="text-xs text-gray-500">
                {formatTimeSince(breastSuggestion.timeSince)} ago
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-px bg-pink-200"></div>
              <div className="text-xs font-semibold text-pink-600 uppercase tracking-wide">
                Try Next
              </div>
              <div className="flex-1 h-px bg-pink-200"></div>
            </div>

            <button
              onClick={() => handleQuickLogFeed(`breastfeeding-${breastSuggestion.suggestedSide}`)}
              className="w-full flex items-center justify-center gap-2 p-4 bg-pink-500 hover:bg-pink-600 active:bg-pink-700 text-white rounded-xl transition-colors font-semibold shadow-md"
            >
              <Baby className="w-6 h-6" />
              <span className="capitalize">{breastSuggestion.suggestedSide}</span> Breast (Recommended)
            </button>

            <button
              onClick={() => navigate('/log-feed')}
              className="w-full mt-2 text-xs text-gray-600 hover:text-gray-800 py-2"
            >
              Or use detailed form →
            </button>
          </div>
        )}

        {/* Feeding Pattern Widget */}
        {feedingPattern && feedingPattern.totalFeeds >= 3 && (
          <div className="card mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Baby className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900">Feeding Pattern</h2>
              <span className="text-xs text-gray-500 ml-auto">Last {feedingPattern.daysAnalyzed} days</span>
            </div>

            <div className="space-y-3">
              {/* Average Interval */}
              {feedingPattern.avgIntervalHours && (
                <div className="bg-white/60 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">Average Interval</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {feedingPattern.avgIntervalHours < 1
                      ? `${feedingPattern.avgIntervalMinutes} min`
                      : `${feedingPattern.avgIntervalHours} hours`}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {feedingPattern.feedsPerDay} feeds per day
                  </div>
                </div>
              )}

              {/* Typical Feeding Times */}
              {feedingPattern.typicalTimes.length > 0 && (
                <div className="bg-white/60 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-2">Typical Feeding Times</div>
                  <div className="flex flex-wrap gap-2">
                    {feedingPattern.typicalTimes.map(hour => (
                      <span key={hour} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Feed Expected */}
              {feedingPattern.nextFeedExpected && (
                <div className={`rounded-lg p-3 ${
                  feedingPattern.isOverdue
                    ? 'bg-amber-100 border-2 border-amber-300'
                    : 'bg-white/60'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">
                        {feedingPattern.isOverdue ? '⚠️ Feed Overdue' : 'Next Feed Expected'}
                      </div>
                      <div className={`text-sm font-semibold ${
                        feedingPattern.isOverdue ? 'text-amber-700' : 'text-gray-900'
                      }`}>
                        {formatTime(feedingPattern.nextFeedExpected)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Last fed {feedingPattern.minutesSinceLastFeed} minutes ago
                      </div>
                    </div>
                    {feedingPattern.isOverdue && (
                      <button
                        onClick={() => navigate('/log-feed')}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold"
                      >
                        Log Feed
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions - One-Tap Logging */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Log (Just Now)</h2>

          {/* Diaper Quick Actions */}
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Diaper</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickLogDiaper('wet')}
                className="flex flex-col items-center justify-center p-3 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-xl transition-colors border-2 border-blue-200"
              >
                <Droplet className="w-6 h-6 text-blue-500 mb-1" />
                <span className="text-xs font-semibold text-gray-700">Wet</span>
              </button>
              <button
                onClick={() => handleQuickLogDiaper('dirty')}
                className="flex flex-col items-center justify-center p-3 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 rounded-xl transition-colors border-2 border-amber-200"
              >
                <Droplet className="w-6 h-6 text-amber-600 mb-1" />
                <span className="text-xs font-semibold text-gray-700">Dirty</span>
              </button>
              <button
                onClick={() => handleQuickLogDiaper('both')}
                className="flex flex-col items-center justify-center p-3 bg-green-50 hover:bg-green-100 active:bg-green-200 rounded-xl transition-colors border-2 border-green-200"
              >
                <Droplet className="w-6 h-6 text-green-500 mb-1" />
                <span className="text-xs font-semibold text-gray-700">Both</span>
              </button>
            </div>
          </div>

          {/* Feeding Quick Actions */}
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Feeding</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickLogFeed('breastfeeding-left')}
                className="flex flex-col items-center justify-center p-3 bg-pink-50 hover:bg-pink-100 active:bg-pink-200 rounded-xl transition-colors border-2 border-pink-200"
              >
                <Baby className="w-6 h-6 text-pink-500 mb-1" />
                <span className="text-xs font-semibold text-gray-700">Left</span>
              </button>
              <button
                onClick={() => handleQuickLogFeed('breastfeeding-right')}
                className="flex flex-col items-center justify-center p-3 bg-pink-50 hover:bg-pink-100 active:bg-pink-200 rounded-xl transition-colors border-2 border-pink-200"
              >
                <Baby className="w-6 h-6 text-pink-500 mb-1" />
                <span className="text-xs font-semibold text-gray-700">Right</span>
              </button>
              <button
                onClick={() => handleQuickLogFeed('formula')}
                className="flex flex-col items-center justify-center p-3 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-xl transition-colors border-2 border-blue-200"
              >
                <Baby className="w-6 h-6 text-blue-500 mb-1" />
                <span className="text-xs font-semibold text-gray-700">Bottle</span>
              </button>
            </div>
          </div>

          {/* Pumping Quick Action */}
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Pumping</div>
            <button
              onClick={() => navigate('/log-pumping')}
              className="w-full flex items-center justify-center gap-2 p-4 bg-cyan-50 hover:bg-cyan-100 active:bg-cyan-200 rounded-xl transition-colors border-2 border-cyan-200"
            >
              <Droplets className="w-6 h-6 text-cyan-500" />
              <span className="text-sm font-semibold text-gray-700">Log Pumping Session</span>
            </button>
          </div>

          {/* Tummy Time Quick Action */}
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Tummy Time</div>
            <button
              onClick={() => navigate('/log-tummy-time')}
              className="w-full flex items-center justify-center gap-2 p-4 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 rounded-xl transition-colors border-2 border-emerald-200"
            >
              <Timer className="w-6 h-6 text-emerald-500" />
              <span className="text-sm font-semibold text-gray-700">Log Tummy Time</span>
            </button>
          </div>

          {/* Sleep Quick Actions */}
          <div>
            <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Sleep</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleQuickLogSleep('nap')}
                className="flex flex-col items-center justify-center p-3 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 rounded-xl transition-colors border-2 border-purple-200"
              >
                <Moon className="w-6 h-6 text-purple-500 mb-1" />
                <span className="text-xs font-semibold text-gray-700">Start Nap</span>
              </button>
              <button
                onClick={() => handleQuickLogSleep('night')}
                className="flex flex-col items-center justify-center p-3 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 rounded-xl transition-colors border-2 border-indigo-200"
              >
                <Moon className="w-6 h-6 text-indigo-600 mb-1" />
                <span className="text-xs font-semibold text-gray-700">Start Sleep</span>
              </button>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Need more options? Use detailed forms below
            </p>
          </div>
        </div>

        {/* Detailed Log Buttons */}
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Detailed Forms</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => navigate('/log-feed')}
            className="btn-quick-log"
          >
            <Baby className="w-8 h-8 text-blue-500" />
            <span className="text-sm font-semibold text-gray-700">Feed</span>
          </button>

          <button
            onClick={() => navigate('/log-diaper')}
            className="btn-quick-log"
          >
            <Droplet className="w-8 h-8 text-green-500" />
            <span className="text-sm font-semibold text-gray-700">Diaper</span>
          </button>

          <button
            onClick={() => navigate('/log-sleep')}
            className="btn-quick-log"
          >
            <Moon className="w-8 h-8 text-purple-500" />
            <span className="text-sm font-semibold text-gray-700">Sleep</span>
          </button>

          <button
            onClick={() => navigate('/log-weight')}
            className="btn-quick-log"
          >
            <Scale className="w-8 h-8 text-orange-500" />
            <span className="text-sm font-semibold text-gray-700">Weight</span>
          </button>

          <button
            onClick={() => navigate('/log-medicine')}
            className="btn-quick-log border-2 border-red-200"
          >
            <Pill className="w-8 h-8 text-red-500" />
            <span className="text-sm font-semibold text-gray-700">Medicine</span>
          </button>

          <button
            onClick={() => navigate('/log-tummy-time')}
            className="btn-quick-log border-2 border-emerald-200"
          >
            <Timer className="w-8 h-8 text-emerald-500" />
            <span className="text-sm font-semibold text-gray-700">Tummy Time</span>
          </button>
        </div>

        {/* Last Activity Summary */}
        <div className="card mb-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Last Activity</h2>

          {lastFeed && (
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Baby className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="font-medium text-gray-900">
                    {getFeedTypeLabel(lastFeed.type)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {lastFeed.duration
                      ? formatDuration(lastFeed.duration)
                      : `${lastFeed.amount} ${lastFeed.unit}`}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {formatTime(lastFeed.timestamp)}
                </div>
                <div className="text-xs text-gray-500">
                  {formatTimeAgo(lastFeed.timestamp)}
                </div>
              </div>
            </div>
          )}

          {lastDiaper && (
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Droplet className="w-5 h-5 text-green-500" />
                <div>
                  <div className="font-medium text-gray-900 capitalize">
                    {lastDiaper.type} Diaper
                  </div>
                  <div className="text-sm text-gray-500">
                    {lastDiaper.wetness && `${lastDiaper.wetness}`}
                    {lastDiaper.consistency && ` ${lastDiaper.consistency}`}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {formatTime(lastDiaper.timestamp)}
                </div>
                <div className="text-xs text-gray-500">
                  {formatTimeAgo(lastDiaper.timestamp)}
                </div>
              </div>
            </div>
          )}

          {(lastSleep || activeSleep) && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-purple-500" />
                <div>
                  <div className="font-medium text-gray-900">
                    {getSleepTypeLabel((activeSleep || lastSleep).type)}
                    {activeSleep && (
                      <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        In Progress
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {activeSleep
                      ? `Started ${formatTimeAgo(activeSleep.startTime)}`
                      : lastSleep.endTime
                      ? formatDuration((new Date(lastSleep.endTime) - new Date(lastSleep.startTime)) / 1000 / 60)
                      : 'In progress'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {formatTime((activeSleep || lastSleep).startTime)}
                </div>
                <div className="text-xs text-gray-500">
                  {formatTimeAgo((activeSleep || lastSleep).startTime)}
                </div>
              </div>
            </div>
          )}

          {lastWeight && (
            <div className="flex items-center justify-between py-2 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-orange-500" />
                <div>
                  <div className="font-medium text-gray-900">
                    Weight Recorded
                  </div>
                  <div className="text-sm text-gray-500">
                    {lastWeight.weight} {lastWeight.unit}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {formatTime(lastWeight.timestamp)}
                </div>
                <div className="text-xs text-gray-500">
                  {formatTimeAgo(lastWeight.timestamp)}
                </div>
              </div>
            </div>
          )}

          {lastMedicine && (
            <div className="flex items-center justify-between py-2 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <Pill className="w-5 h-5 text-red-500" />
                <div>
                  <div className="font-medium text-gray-900">
                    {lastMedicine.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {lastMedicine.dose} {lastMedicine.unit}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {formatTime(lastMedicine.timestamp)}
                </div>
                <div className="text-xs text-gray-500">
                  {formatTimeAgo(lastMedicine.timestamp)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Today's Events */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Today&apos;s Activity</h2>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : events.length > 0 ? (
            <EventList events={events} onRefresh={loadDashboardData} />
          ) : (
            <div className="card text-center py-8">
              <p className="text-gray-500">No activities logged today</p>
              <p className="text-sm text-gray-400 mt-2">Tap a button above to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={5000}
          action={toast.action}
        />
      )}

      {/* Batch Night Logging Modal */}
      {showBatchNightLog && (
        <BatchNightLogging
          child={child}
          onComplete={handleBatchNightLogComplete}
          onDismiss={handleBatchNightLogDismiss}
        />
      )}
    </div>
  );
}
