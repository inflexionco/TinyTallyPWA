import { TrendingUp, TrendingDown, Minus, AlertTriangle, Info, CheckCircle } from 'lucide-react';

export default function Insights({ insights }) {
  if (!insights) return null;

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing':
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'decreasing':
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-orange-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrendLabel = (trend) => {
    switch (trend) {
      case 'increasing':
        return 'Increasing';
      case 'decreasing':
        return 'Decreasing';
      case 'improving':
        return 'Improving';
      case 'declining':
        return 'Declining';
      default:
        return 'Stable';
    }
  };

  const formatHours = (hours) => {
    if (!hours || hours.length === 0) return 'Not enough data';
    return hours.map(h => {
      if (h === 0) return '12 AM';
      if (h < 12) return `${h} AM`;
      if (h === 12) return '12 PM';
      return `${h - 12} PM`;
    }).join(', ');
  };

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'border-red-300 bg-red-50';
      case 'medium':
        return 'border-amber-300 bg-amber-50';
      case 'low':
        return 'border-blue-300 bg-blue-50';
      default:
        return 'border-green-300 bg-green-50';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Alerts Section - Show first if there are any */}
      {insights.alerts && insights.alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Health Insights
          </h3>
          {insights.alerts.map((alert, index) => (
            <div
              key={index}
              className={`rounded-xl border-2 p-4 ${getAlertColor(alert.severity)}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{alert.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getAlertIcon(alert.type)}
                    <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                  <p className="text-xs text-gray-600">{alert.suggestion}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feeding Patterns */}
      {insights.feeding && (
        <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            🍼 Feeding Pattern (Last 7 Days)
          </h3>

          <div className="space-y-3">
            {/* Average */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average frequency</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {insights.feeding.avgIntervalHours}h between feeds
                </span>
                {getTrendIcon(insights.feeding.trend)}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Feeds per day</span>
              <span className="font-semibold text-gray-900">
                {insights.feeding.feedsPerDay}
              </span>
            </div>

            {/* Typical Times */}
            {insights.feeding.typicalHours && insights.feeding.typicalHours.length > 0 && (
              <div>
                <div className="text-sm text-gray-600 mb-2">Typical feeding times</div>
                <div className="flex flex-wrap gap-2">
                  {insights.feeding.typicalHours.map(hour => (
                    <span
                      key={hour}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                    >
                      {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Trend */}
            <div className="flex items-center justify-between pt-2 border-t border-blue-200">
              <span className="text-xs text-gray-500">Trend</span>
              <div className="flex items-center gap-1">
                {getTrendIcon(insights.feeding.trend)}
                <span className="text-xs font-medium text-gray-600">
                  {getTrendLabel(insights.feeding.trend)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sleep Patterns */}
      {insights.sleep && (
        <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            💤 Sleep Pattern (Last 7 Days)
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total sleep per day</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {insights.sleep.totalHoursPerDay}h
                </span>
                {getTrendIcon(insights.sleep.trend)}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average session</span>
              <span className="font-semibold text-gray-900">
                {insights.sleep.avgSessionMinutes} min
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Longest stretch</span>
              <span className="font-semibold text-gray-900">
                {insights.sleep.longestStretchHours}h
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-200">
              <div className="text-center p-2 bg-white/60 rounded-lg">
                <div className="text-xs text-gray-500">Naps/day</div>
                <div className="font-semibold text-gray-900">{insights.sleep.napsPerDay}</div>
              </div>
              <div className="text-center p-2 bg-white/60 rounded-lg">
                <div className="text-xs text-gray-500">Night sleeps/day</div>
                <div className="font-semibold text-gray-900">{insights.sleep.nightSleepsPerDay}</div>
              </div>
            </div>

            {/* Trend */}
            <div className="flex items-center justify-between pt-2 border-t border-purple-200">
              <span className="text-xs text-gray-500">Trend</span>
              <div className="flex items-center gap-1">
                {getTrendIcon(insights.sleep.trend)}
                <span className="text-xs font-medium text-gray-600">
                  {getTrendLabel(insights.sleep.trend)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diaper Patterns */}
      {insights.diaper && (
        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            💧 Diaper Pattern (Last 7 Days)
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Wet diapers per day</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {insights.diaper.wetPerDay}
                </span>
                {insights.diaper.wetDiaperStatus === 'normal' ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Dirty diapers per day</span>
              <span className="font-semibold text-gray-900">
                {insights.diaper.dirtyPerDay}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-green-200">
              <span className="text-sm text-gray-600">Total per day</span>
              <span className="font-semibold text-gray-900">
                {insights.diaper.totalPerDay}
              </span>
            </div>

            {/* Status */}
            {insights.diaper.wetDiaperStatus === 'normal' ? (
              <div className="p-2 bg-green-100 rounded-lg text-center">
                <span className="text-xs font-medium text-green-700">✓ Healthy hydration</span>
              </div>
            ) : (
              <div className="p-2 bg-amber-100 rounded-lg text-center">
                <span className="text-xs font-medium text-amber-700">Monitor hydration levels</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
