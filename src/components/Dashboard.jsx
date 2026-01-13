import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Baby, Droplet, Moon, History, Settings, RefreshCw } from 'lucide-react';
import { feedService, diaperService, sleepService, statsService } from '../services/db';
import { formatTime, formatTimeAgo, formatDuration, getAgeInWeeks } from '../utils/dateUtils';
import EventList from './EventList';

export default function Dashboard({ child }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [lastFeed, setLastFeed] = useState(null);
  const [lastDiaper, setLastDiaper] = useState(null);
  const [lastSleep, setLastSleep] = useState(null);
  const [activeSleep, setActiveSleep] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [child]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, lastFeedData, lastDiaperData, lastSleepData, activeSleepData] = await Promise.all([
        statsService.getDailyStats(child.id, new Date()),
        feedService.getLastFeed(child.id),
        diaperService.getLastDiaper(child.id),
        sleepService.getLastSleep(child.id),
        sleepService.getActiveSleep(child.id)
      ]);

      setStats(statsData);
      setLastFeed(lastFeedData);
      setLastDiaper(lastDiaperData);
      setLastSleep(lastSleepData);
      setActiveSleep(activeSleepData);

      // Combine all events and sort by time
      const allEvents = [
        ...statsData.feeds.map(f => ({ ...f, eventType: 'feed' })),
        ...statsData.diapers.map(d => ({ ...d, eventType: 'diaper' })),
        ...statsData.sleeps.map(s => ({ ...s, eventType: 'sleep' }))
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

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white safe-top">
        <div className="container-safe pt-4">
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
            <div className="grid grid-cols-3 gap-3 pb-4">
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
        {/* Quick Log Buttons */}
        <div className="grid grid-cols-3 gap-4 mb-6">
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
        </div>

        {/* Today's Events */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Today's Activity</h2>
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
    </div>
  );
}
