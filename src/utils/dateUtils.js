import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

export const formatTime = (date) => {
  return format(new Date(date), 'h:mm a');
};

export const formatDate = (date) => {
  return format(new Date(date), 'MMM d, yyyy');
};

export const formatDateTime = (date) => {
  return format(new Date(date), 'MMM d, yyyy h:mm a');
};

export const formatTimeAgo = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const formatDuration = (minutes) => {
  if (!minutes) return '0m';

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

export const calculateDuration = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const durationMs = end - start;
  return Math.floor(durationMs / 1000 / 60); // Return minutes
};

export const getDateLabel = (date) => {
  const dateObj = new Date(date);
  if (isToday(dateObj)) return 'Today';
  if (isYesterday(dateObj)) return 'Yesterday';
  return formatDate(dateObj);
};

export const getAgeInWeeks = (dateOfBirth) => {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  const diffTime = Math.abs(today - birth);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diffDays / 7);
  const days = diffDays % 7;

  if (weeks === 0) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  }

  return `${weeks}w ${days}d`;
};

export const getTodayDateString = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
};
