import Dexie from 'dexie';

// Initialize Dexie database
export const db = new Dexie('TinyTallyDB');

// Define database schema
db.version(1).stores({
  child: '++id, name, dateOfBirth',
  feeds: '++id, childId, timestamp, type, duration, amount, unit, notes',
  diapers: '++id, childId, timestamp, type, wetness, consistency, color, quantity, notes',
  sleep: '++id, childId, startTime, endTime, type, notes'
});

// Version 2: Add weight tracking
db.version(2).stores({
  child: '++id, name, dateOfBirth',
  feeds: '++id, childId, timestamp, type, duration, amount, unit, notes',
  diapers: '++id, childId, timestamp, type, wetness, consistency, color, quantity, notes',
  sleep: '++id, childId, startTime, endTime, type, notes',
  weight: '++id, childId, timestamp, weight, unit, notes'
});

// Version 3: Add medicine tracking
db.version(3).stores({
  child: '++id, name, dateOfBirth',
  feeds: '++id, childId, timestamp, type, duration, amount, unit, notes',
  diapers: '++id, childId, timestamp, type, wetness, consistency, color, quantity, notes',
  sleep: '++id, childId, startTime, endTime, type, notes',
  weight: '++id, childId, timestamp, weight, unit, notes',
  medicines: '++id, childId, timestamp, name, dose, unit, frequency, maxDailyDoses, notes'
});

// Child Profile Service
export const childService = {
  async getChild() {
    const children = await db.child.toArray();
    return children.length > 0 ? children[0] : null;
  },

  async createChild(childData) {
    return await db.child.add({
      name: childData.name,
      dateOfBirth: childData.dateOfBirth,
      createdAt: new Date()
    });
  },

  async updateChild(id, childData) {
    return await db.child.update(id, childData);
  }
};

// Feed Tracking Service
export const feedService = {
  async addFeed(feedData) {
    return await db.feeds.add({
      childId: feedData.childId || 1,
      timestamp: feedData.timestamp || new Date(),
      type: feedData.type, // 'breastfeeding-left', 'breastfeeding-right', 'formula', 'pumped'
      duration: feedData.duration || null, // in minutes for breastfeeding
      amount: feedData.amount || null, // for formula/pumped
      unit: feedData.unit || 'oz', // 'oz' or 'ml'
      notes: feedData.notes || '',
      createdAt: new Date()
    });
  },

  async getFeeds(childId, startDate, endDate) {
    let query = db.feeds.where('childId').equals(childId || 1);

    if (startDate && endDate) {
      return await query
        .filter(feed => feed.timestamp >= startDate && feed.timestamp <= endDate)
        .reverse()
        .sortBy('timestamp');
    }

    return await query.reverse().sortBy('timestamp');
  },

  async getTodayFeeds(childId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.getFeeds(childId, today, tomorrow);
  },

  async getLastFeed(childId) {
    const feeds = await db.feeds
      .where('childId')
      .equals(childId || 1)
      .reverse()
      .sortBy('timestamp');

    return feeds.length > 0 ? feeds[0] : null;
  },

  async getFeed(id) {
    return await db.feeds.get(id);
  },

  async deleteFeed(id) {
    return await db.feeds.delete(id);
  },

  async updateFeed(id, feedData) {
    return await db.feeds.update(id, feedData);
  },

  async getLastBreastfeedingSide(childId) {
    const feeds = await db.feeds
      .where('childId')
      .equals(childId || 1)
      .filter(feed => feed.type === 'breastfeeding-left' || feed.type === 'breastfeeding-right')
      .reverse()
      .sortBy('timestamp');

    if (feeds.length > 0) {
      const lastFeed = feeds[0];
      const side = lastFeed.type === 'breastfeeding-left' ? 'left' : 'right';
      const suggestedSide = side === 'left' ? 'right' : 'left';

      return {
        side,
        timestamp: lastFeed.timestamp,
        suggestedSide,
        timeSince: Date.now() - new Date(lastFeed.timestamp).getTime() // milliseconds
      };
    }

    return null;
  },

  // Detect feeding patterns over the last N days
  async detectFeedingPattern(childId, days = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const feeds = await this.getFeeds(childId, startDate, endDate);

    if (feeds.length < 3) {
      // Not enough data to detect patterns
      return null;
    }

    // Extract feeding times (hour of day)
    const feedingHours = feeds.map(feed => new Date(feed.timestamp).getHours());

    // Count occurrences of each hour
    const hourCounts = {};
    feedingHours.forEach(hour => {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    // Identify typical feeding times (appears 30%+ of days)
    const threshold = days * 0.3;
    const typicalTimes = Object.entries(hourCounts)
      .filter(([, count]) => count >= threshold)
      .map(([hour]) => parseInt(hour))
      .sort((a, b) => a - b);

    // Calculate intervals between consecutive feeds
    const intervals = [];
    for (let i = 1; i < feeds.length; i++) {
      const diff = (new Date(feeds[i - 1].timestamp) - new Date(feeds[i].timestamp)) / (1000 * 60); // minutes
      if (diff > 0 && diff < 720) { // Only consider intervals less than 12 hours
        intervals.push(diff);
      }
    }

    // Calculate average interval
    const avgInterval = intervals.length > 0
      ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
      : null;

    // Calculate feeds per day
    const feedsPerDay = Math.round((feeds.length / days) * 10) / 10;

    // Get last feed
    const lastFeed = feeds.length > 0 ? feeds[0] : null;

    // Calculate next expected feed time
    let nextFeedExpected = null;
    if (lastFeed && avgInterval) {
      nextFeedExpected = new Date(new Date(lastFeed.timestamp).getTime() + avgInterval * 60 * 1000);
    }

    // Determine if a feed is overdue
    const now = new Date();
    const minutesSinceLastFeed = lastFeed
      ? (now - new Date(lastFeed.timestamp)) / (1000 * 60)
      : null;

    const isOverdue = avgInterval && minutesSinceLastFeed
      ? minutesSinceLastFeed > avgInterval * 1.2 // 20% buffer
      : false;

    return {
      typicalTimes,
      avgIntervalMinutes: avgInterval,
      avgIntervalHours: avgInterval ? Math.round((avgInterval / 60) * 10) / 10 : null,
      feedsPerDay,
      lastFeed,
      nextFeedExpected,
      isOverdue,
      minutesSinceLastFeed: minutesSinceLastFeed ? Math.round(minutesSinceLastFeed) : null,
      daysAnalyzed: days,
      totalFeeds: feeds.length
    };
  }
};

// Diaper Tracking Service
export const diaperService = {
  async addDiaper(diaperData) {
    return await db.diapers.add({
      childId: diaperData.childId || 1,
      timestamp: diaperData.timestamp || new Date(),
      type: diaperData.type, // 'wet', 'dirty', 'both'
      wetness: diaperData.wetness || null, // 'small', 'medium', 'large', 'soaked'
      consistency: diaperData.consistency || null, // 'liquid', 'soft', 'seedy', 'formed', 'hard'
      color: diaperData.color || null, // 'yellow', 'green', 'brown', 'black', 'red'
      quantity: diaperData.quantity || null, // 'small', 'medium', 'large'
      notes: diaperData.notes || '',
      createdAt: new Date()
    });
  },

  async getDiapers(childId, startDate, endDate) {
    let query = db.diapers.where('childId').equals(childId || 1);

    if (startDate && endDate) {
      return await query
        .filter(diaper => diaper.timestamp >= startDate && diaper.timestamp <= endDate)
        .reverse()
        .sortBy('timestamp');
    }

    return await query.reverse().sortBy('timestamp');
  },

  async getTodayDiapers(childId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.getDiapers(childId, today, tomorrow);
  },

  async getLastDiaper(childId) {
    const diapers = await db.diapers
      .where('childId')
      .equals(childId || 1)
      .reverse()
      .sortBy('timestamp');

    return diapers.length > 0 ? diapers[0] : null;
  },

  async getDiaper(id) {
    return await db.diapers.get(id);
  },

  async deleteDiaper(id) {
    return await db.diapers.delete(id);
  },

  async updateDiaper(id, diaperData) {
    return await db.diapers.update(id, diaperData);
  }
};

// Sleep Tracking Service
export const sleepService = {
  async addSleep(sleepData) {
    return await db.sleep.add({
      childId: sleepData.childId || 1,
      startTime: sleepData.startTime || new Date(),
      endTime: sleepData.endTime || null,
      type: sleepData.type || 'nap', // 'nap', 'night'
      notes: sleepData.notes || '',
      createdAt: new Date()
    });
  },

  async getSleep(childId, startDate, endDate) {
    let query = db.sleep.where('childId').equals(childId || 1);

    if (startDate && endDate) {
      return await query
        .filter(sleep => sleep.startTime >= startDate && sleep.startTime <= endDate)
        .reverse()
        .sortBy('startTime');
    }

    return await query.reverse().sortBy('startTime');
  },

  async getTodaySleep(childId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.getSleep(childId, today, tomorrow);
  },

  async getActiveSleep(childId) {
    const sleeps = await db.sleep
      .where('childId')
      .equals(childId || 1)
      .filter(sleep => !sleep.endTime)
      .reverse()
      .sortBy('startTime');

    return sleeps.length > 0 ? sleeps[0] : null;
  },

  async getLastSleep(childId) {
    const sleeps = await db.sleep
      .where('childId')
      .equals(childId || 1)
      .reverse()
      .sortBy('startTime');

    return sleeps.length > 0 ? sleeps[0] : null;
  },

  async getSleepById(id) {
    return await db.sleep.get(id);
  },

  async endSleep(id, endTime) {
    return await db.sleep.update(id, { endTime: endTime || new Date() });
  },

  async deleteSleep(id) {
    return await db.sleep.delete(id);
  },

  async updateSleep(id, sleepData) {
    return await db.sleep.update(id, sleepData);
  }
};

// Weight Tracking Service
export const weightService = {
  async addWeight(weightData) {
    return await db.weight.add({
      childId: weightData.childId || 1,
      timestamp: weightData.timestamp || new Date(),
      weight: weightData.weight, // numeric value
      unit: weightData.unit || 'kg', // 'kg' or 'lbs'
      notes: weightData.notes || '',
      createdAt: new Date()
    });
  },

  async getWeights(childId, startDate, endDate) {
    let query = db.weight.where('childId').equals(childId || 1);

    if (startDate && endDate) {
      return await query
        .filter(weight => weight.timestamp >= startDate && weight.timestamp <= endDate)
        .reverse()
        .sortBy('timestamp');
    }

    return await query.reverse().sortBy('timestamp');
  },

  async getTodayWeights(childId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.getWeights(childId, today, tomorrow);
  },

  async getLastWeight(childId) {
    const weights = await db.weight
      .where('childId')
      .equals(childId || 1)
      .reverse()
      .sortBy('timestamp');

    return weights.length > 0 ? weights[0] : null;
  },

  async getWeight(id) {
    return await db.weight.get(id);
  },

  async deleteWeight(id) {
    return await db.weight.delete(id);
  },

  async updateWeight(id, weightData) {
    return await db.weight.update(id, weightData);
  }
};

// Common Medicines Preset
export const COMMON_MEDICINES = [
  { name: 'Vitamin D', defaultDose: 0.5, unit: 'ml', frequency: 'daily', maxDailyDoses: 1, minHoursBetween: 24 },
  { name: 'Gas Drops (Simethicone)', defaultDose: 0.6, unit: 'ml', frequency: 'as-needed', maxDailyDoses: 12, minHoursBetween: 0.5 },
  { name: 'Tylenol (Infant)', defaultDose: 1.25, unit: 'ml', frequency: '4-hours', maxDailyDoses: 5, minHoursBetween: 4 },
  { name: 'Motrin (Infant)', defaultDose: 1.25, unit: 'ml', frequency: '6-hours', maxDailyDoses: 4, minHoursBetween: 6 },
  { name: 'Gripe Water', defaultDose: 5, unit: 'ml', frequency: 'as-needed', maxDailyDoses: 6, minHoursBetween: 0.5 },
  { name: 'Probiotic Drops', defaultDose: 5, unit: 'drops', frequency: 'daily', maxDailyDoses: 1, minHoursBetween: 24 },
];

// Medicine Tracking Service
export const medicineService = {
  async addMedicine(medicineData) {
    return await db.medicines.add({
      childId: medicineData.childId || 1,
      timestamp: medicineData.timestamp || new Date(),
      name: medicineData.name,
      dose: medicineData.dose,
      unit: medicineData.unit || 'ml',
      frequency: medicineData.frequency || 'as-needed',
      maxDailyDoses: medicineData.maxDailyDoses || null,
      notes: medicineData.notes || '',
      createdAt: new Date()
    });
  },

  async getMedicines(childId, startDate, endDate) {
    let query = db.medicines.where('childId').equals(childId || 1);

    if (startDate && endDate) {
      return await query
        .filter(medicine => medicine.timestamp >= startDate && medicine.timestamp <= endDate)
        .reverse()
        .sortBy('timestamp');
    }

    return await query.reverse().sortBy('timestamp');
  },

  async getTodayMedicines(childId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.getMedicines(childId, today, tomorrow);
  },

  async getRecentMedicines(childId, hours = 24) {
    const now = new Date();
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

    return await db.medicines
      .where('childId')
      .equals(childId || 1)
      .filter(medicine => medicine.timestamp >= startTime)
      .reverse()
      .sortBy('timestamp');
  },

  async getLastMedicine(childId, medicineName = null) {
    let query = db.medicines
      .where('childId')
      .equals(childId || 1);

    if (medicineName) {
      const medicines = await query
        .filter(medicine => medicine.name === medicineName)
        .reverse()
        .sortBy('timestamp');
      return medicines.length > 0 ? medicines[0] : null;
    }

    const medicines = await query.reverse().sortBy('timestamp');
    return medicines.length > 0 ? medicines[0] : null;
  },

  async getMedicine(id) {
    return await db.medicines.get(id);
  },

  async deleteMedicine(id) {
    return await db.medicines.delete(id);
  },

  async updateMedicine(id, medicineData) {
    return await db.medicines.update(id, medicineData);
  },

  // Safety check: Check if it's safe to give medicine based on timing
  async checkSafetyWarnings(childId, medicineName) {
    const medicineConfig = COMMON_MEDICINES.find(m => m.name === medicineName);
    if (!medicineConfig) return null;

    const todayMedicines = await this.getTodayMedicines(childId);
    const sameMedicineToday = todayMedicines.filter(m => m.name === medicineName);

    const warnings = [];

    // Check daily max doses
    if (medicineConfig.maxDailyDoses && sameMedicineToday.length >= medicineConfig.maxDailyDoses) {
      warnings.push({
        severity: 'high',
        message: `Daily limit reached: ${medicineConfig.maxDailyDoses} doses per day`
      });
    }

    // Check minimum time between doses
    if (medicineConfig.minHoursBetween && sameMedicineToday.length > 0) {
      const lastDose = sameMedicineToday[0];
      const hoursSinceLastDose = (Date.now() - new Date(lastDose.timestamp).getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastDose < medicineConfig.minHoursBetween) {
        const hoursRemaining = (medicineConfig.minHoursBetween - hoursSinceLastDose).toFixed(1);
        warnings.push({
          severity: hoursSinceLastDose < medicineConfig.minHoursBetween * 0.5 ? 'high' : 'medium',
          message: `Too soon: Wait ${hoursRemaining} more hours (${medicineConfig.minHoursBetween}h minimum between doses)`
        });
      }
    }

    return warnings.length > 0 ? warnings : null;
  },

  // Get next recommended dose time
  async getNextDoseTime(childId, medicineName) {
    const medicineConfig = COMMON_MEDICINES.find(m => m.name === medicineName);
    if (!medicineConfig || !medicineConfig.minHoursBetween) return null;

    const lastDose = await this.getLastMedicine(childId, medicineName);
    if (!lastDose) return new Date(); // Can give now if never given

    const nextDoseTime = new Date(lastDose.timestamp);
    nextDoseTime.setHours(nextDoseTime.getHours() + medicineConfig.minHoursBetween);

    return nextDoseTime;
  }
};

// Stats Service for Dashboard
export const statsService = {
  async getDailyStats(childId, date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const feeds = await feedService.getFeeds(childId, startDate, endDate);
    const diapers = await diaperService.getDiapers(childId, startDate, endDate);
    const sleeps = await sleepService.getSleep(childId, startDate, endDate);
    const weights = await weightService.getWeights(childId, startDate, endDate);
    const medicines = await medicineService.getMedicines(childId, startDate, endDate);

    // Calculate total sleep duration
    const totalSleepMinutes = sleeps.reduce((total, sleep) => {
      if (sleep.endTime) {
        const duration = (new Date(sleep.endTime) - new Date(sleep.startTime)) / 1000 / 60;
        return total + duration;
      }
      return total;
    }, 0);

    // Count diaper types
    const wetDiapers = diapers.filter(d => d.type === 'wet' || d.type === 'both').length;
    const dirtyDiapers = diapers.filter(d => d.type === 'dirty' || d.type === 'both').length;

    return {
      totalFeeds: feeds.length,
      totalDiapers: diapers.length,
      wetDiapers,
      dirtyDiapers,
      totalSleeps: sleeps.length,
      totalSleepHours: (totalSleepMinutes / 60).toFixed(1),
      totalWeights: weights.length,
      totalMedicines: medicines.length,
      feeds,
      diapers,
      sleeps,
      weights,
      medicines
    };
  },

  async getDatesWithActivity(childId, startDate, endDate) {
    const feeds = await feedService.getFeeds(childId, startDate, endDate);
    const diapers = await diaperService.getDiapers(childId, startDate, endDate);
    const sleeps = await sleepService.getSleep(childId, startDate, endDate);
    const weights = await weightService.getWeights(childId, startDate, endDate);
    const medicines = await medicineService.getMedicines(childId, startDate, endDate);

    // Collect all unique dates with activity
    const datesSet = new Set();

    feeds.forEach(f => {
      const dateStr = new Date(f.timestamp).toDateString();
      datesSet.add(dateStr);
    });

    diapers.forEach(d => {
      const dateStr = new Date(d.timestamp).toDateString();
      datesSet.add(dateStr);
    });

    sleeps.forEach(s => {
      const dateStr = new Date(s.startTime).toDateString();
      datesSet.add(dateStr);
    });

    weights.forEach(w => {
      const dateStr = new Date(w.timestamp).toDateString();
      datesSet.add(dateStr);
    });

    medicines.forEach(m => {
      const dateStr = new Date(m.timestamp).toDateString();
      datesSet.add(dateStr);
    });

    return Array.from(datesSet);
  }
};

export default db;
