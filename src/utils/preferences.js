// User preferences management

const PREFERENCES_KEY = 'userPreferences';

const DEFAULT_DASHBOARD_SECTIONS = [
  { id: 'insights', label: 'Health Insights & Patterns', enabled: true, order: 0 },
  { id: 'feedingSuggestion', label: 'Feeding Suggestion', enabled: true, order: 1 },
  { id: 'feedingPattern', label: 'Feeding Pattern', enabled: true, order: 2 },
  { id: 'quickActions', label: 'Quick Actions', enabled: true, order: 3 },
  { id: 'detailedForms', label: 'Detailed Forms', enabled: true, order: 4 },
  { id: 'lastActivity', label: 'Last Activity Summary', enabled: true, order: 5 },
  { id: 'todaysActivity', label: 'Today\'s Activity', enabled: true, order: 6 }
];

const DEFAULT_PREFERENCES = {
  ageFormat: 'auto', // 'auto', 'days', 'weeks', 'months'
  volumeUnit: 'oz',  // 'oz', 'ml'
  dashboardSections: DEFAULT_DASHBOARD_SECTIONS
};

export const getPreferences = () => {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      const preferences = JSON.parse(stored);

      // Validate dashboard sections - reset if corrupted
      if (preferences.dashboardSections) {
        const hasQuickActions = preferences.dashboardSections.some(s => s.id === 'quickActions');
        const hasDetailedForms = preferences.dashboardSections.some(s => s.id === 'detailedForms');
        const hasLogActivity = preferences.dashboardSections.some(s => s.id === 'logActivity');

        // If we find logActivity (from reverted changes) or missing expected sections, reset
        if (hasLogActivity || !hasQuickActions || !hasDetailedForms) {
          console.log('Corrupted dashboard preferences detected, resetting to defaults');
          preferences.dashboardSections = DEFAULT_DASHBOARD_SECTIONS;
          savePreferences(preferences);
        }
      }

      return { ...DEFAULT_PREFERENCES, ...preferences };
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
  return DEFAULT_PREFERENCES;
};

export const savePreferences = (preferences) => {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
};

export const updatePreference = (key, value) => {
  const preferences = getPreferences();
  preferences[key] = value;
  savePreferences(preferences);
  return preferences;
};

// Age formatting with preferences
export const formatAgeWithPreference = (dateOfBirth, preference = 'auto') => {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  const diffTime = Math.abs(now - birth);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  // Auto mode: intelligent selection based on age
  if (preference === 'auto') {
    if (diffDays < 30) {
      // Under 1 month: show days and weeks
      const weeks = Math.floor(diffDays / 7);
      const remainingDays = diffDays % 7;
      if (diffDays < 7) {
        return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
      }
      if (remainingDays === 0) {
        return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
      }
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}, ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}`;
    } else if (diffDays < 365) {
      // 1 month to 1 year: show months and weeks
      const months = Math.floor(diffDays / 30);
      const remainingDays = diffDays % 30;
      const remainingWeeks = Math.floor(remainingDays / 7);

      if (remainingWeeks === 0) {
        return `${months} ${months === 1 ? 'month' : 'months'}`;
      }
      return `${months} ${months === 1 ? 'month' : 'months'}, ${remainingWeeks} ${remainingWeeks === 1 ? 'week' : 'weeks'}`;
    } else {
      // Over 1 year: show years and months
      const years = Math.floor(diffDays / 365);
      const remainingDays = diffDays % 365;
      const remainingMonths = Math.floor(remainingDays / 30);

      if (remainingMonths === 0) {
        return `${years} ${years === 1 ? 'year' : 'years'}`;
      }
      return `${years} ${years === 1 ? 'year' : 'years'}, ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
    }
  }

  // Manual preference modes
  if (preference === 'days') {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
  }

  if (preference === 'weeks') {
    const weeks = Math.floor(diffDays / 7);
    const remainingDays = diffDays % 7;
    if (remainingDays === 0) {
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
    }
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}, ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}`;
  }

  if (preference === 'months') {
    const months = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;
    const remainingWeeks = Math.floor(remainingDays / 7);

    if (months === 0) {
      // Less than a month, show weeks
      const weeks = Math.floor(diffDays / 7);
      const days = diffDays % 7;
      if (days === 0) {
        return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
      }
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}, ${days} ${days === 1 ? 'day' : 'days'}`;
    }

    if (remainingWeeks === 0) {
      return `${months} ${months === 1 ? 'month' : 'months'}`;
    }
    return `${months} ${months === 1 ? 'month' : 'months'}, ${remainingWeeks} ${remainingWeeks === 1 ? 'week' : 'weeks'}`;
  }

  // Fallback to auto
  return formatAgeWithPreference(dateOfBirth, 'auto');
};

// Volume conversion
const OZ_TO_ML = 29.5735;
const ML_TO_OZ = 1 / OZ_TO_ML;

export const convertVolume = (value, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return value;

  if (fromUnit === 'oz' && toUnit === 'ml') {
    return Math.round(value * OZ_TO_ML * 10) / 10; // Round to 1 decimal
  }

  if (fromUnit === 'ml' && toUnit === 'oz') {
    return Math.round(value * ML_TO_OZ * 10) / 10; // Round to 1 decimal
  }

  return value;
};

export const formatVolumeWithPreference = (value, originalUnit, preferredUnit) => {
  const converted = convertVolume(value, originalUnit, preferredUnit);
  return `${converted} ${preferredUnit}`;
};

// Dashboard section management
export const getDashboardSections = () => {
  const prefs = getPreferences();
  return prefs.dashboardSections || DEFAULT_DASHBOARD_SECTIONS;
};

export const updateDashboardSections = (sections) => {
  const preferences = getPreferences();
  preferences.dashboardSections = sections;
  savePreferences(preferences);
  return preferences;
};

export const toggleDashboardSection = (sectionId) => {
  const sections = getDashboardSections();
  const updatedSections = sections.map(section =>
    section.id === sectionId
      ? { ...section, enabled: !section.enabled }
      : section
  );
  return updateDashboardSections(updatedSections);
};

export const moveDashboardSection = (sectionId, direction) => {
  const sections = [...getDashboardSections()];
  const index = sections.findIndex(s => s.id === sectionId);

  if (index === -1) return sections;

  const newIndex = direction === 'up' ? index - 1 : index + 1;

  if (newIndex < 0 || newIndex >= sections.length) return sections;

  // Swap the sections
  [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];

  // Update order values
  sections.forEach((section, idx) => {
    section.order = idx;
  });

  return updateDashboardSections(sections);
};

export const resetDashboardSections = () => {
  return updateDashboardSections([...DEFAULT_DASHBOARD_SECTIONS]);
};
