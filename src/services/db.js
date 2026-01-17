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

// Version 4: Add pumping tracking
db.version(4).stores({
  child: '++id, name, dateOfBirth',
  feeds: '++id, childId, timestamp, type, duration, amount, unit, notes',
  diapers: '++id, childId, timestamp, type, wetness, consistency, color, quantity, notes',
  sleep: '++id, childId, startTime, endTime, type, notes',
  weight: '++id, childId, timestamp, weight, unit, notes',
  medicines: '++id, childId, timestamp, name, dose, unit, frequency, maxDailyDoses, notes',
  pumping: '++id, childId, timestamp, side, duration, amount, unit, storageLocation, notes'
});

// Version 5: Add tummy time tracking
db.version(5).stores({
  child: '++id, name, dateOfBirth',
  feeds: '++id, childId, timestamp, type, duration, amount, unit, notes',
  diapers: '++id, childId, timestamp, type, wetness, consistency, color, quantity, notes',
  sleep: '++id, childId, startTime, endTime, type, notes',
  weight: '++id, childId, timestamp, weight, unit, notes',
  medicines: '++id, childId, timestamp, name, dose, unit, frequency, maxDailyDoses, notes',
  pumping: '++id, childId, timestamp, side, duration, amount, unit, storageLocation, notes',
  tummyTime: '++id, childId, startTime, endTime, duration, notes'
});

// Version 6: Add milestones tracking
db.version(6).stores({
  child: '++id, name, dateOfBirth',
  feeds: '++id, childId, timestamp, type, duration, amount, unit, notes',
  diapers: '++id, childId, timestamp, type, wetness, consistency, color, quantity, notes',
  sleep: '++id, childId, startTime, endTime, type, notes',
  weight: '++id, childId, timestamp, weight, unit, notes',
  medicines: '++id, childId, timestamp, name, dose, unit, frequency, maxDailyDoses, notes',
  pumping: '++id, childId, timestamp, side, duration, amount, unit, storageLocation, notes',
  tummyTime: '++id, childId, startTime, endTime, duration, notes',
  milestones: '++id, childId, title, date, ageInDays, category, photo, notes'
});

// Child Profile Service
export const childService = {
  async getChild() {
    const children = await db.child.toArray();
    return children.length > 0 ? children[0] : null;
  },

  async getAllChildren() {
    return await db.child.toArray();
  },

  async getChildById(id) {
    return await db.child.get(id);
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
  },

  async deleteChild(id) {
    // Delete all associated data
    await db.feeds.where('childId').equals(id).delete();
    await db.diapers.where('childId').equals(id).delete();
    await db.sleep.where('childId').equals(id).delete();
    await db.weight.where('childId').equals(id).delete();
    await db.medicines.where('childId').equals(id).delete();
    await db.pumping.where('childId').equals(id).delete();
    await db.tummyTime.where('childId').equals(id).delete();
    await db.milestones.where('childId').equals(id).delete();

    // Delete the child
    return await db.child.delete(id);
  },

  // Active child management (stored in localStorage)
  getActiveChildId() {
    return localStorage.getItem('activeChildId');
  },

  setActiveChildId(childId) {
    localStorage.setItem('activeChildId', childId);
  },

  clearActiveChildId() {
    localStorage.removeItem('activeChildId');
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

// Pumping Tracking Service
export const pumpingService = {
  async addPumping(pumpingData) {
    return await db.pumping.add({
      childId: pumpingData.childId || 1,
      timestamp: pumpingData.timestamp || new Date(),
      side: pumpingData.side, // 'left', 'right', 'both'
      duration: pumpingData.duration || null, // in minutes
      amount: pumpingData.amount, // numeric value
      unit: pumpingData.unit || 'oz', // 'oz' or 'ml'
      storageLocation: pumpingData.storageLocation || '', // 'fridge', 'freezer', 'fed-immediately'
      notes: pumpingData.notes || '',
      createdAt: new Date()
    });
  },

  async getPumping(childId, startDate, endDate) {
    let query = db.pumping.where('childId').equals(childId || 1);

    if (startDate && endDate) {
      return await query
        .filter(pumping => pumping.timestamp >= startDate && pumping.timestamp <= endDate)
        .reverse()
        .sortBy('timestamp');
    }

    return await query.reverse().sortBy('timestamp');
  },

  async getTodayPumping(childId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.getPumping(childId, today, tomorrow);
  },

  async getLastPumping(childId) {
    const pumpings = await db.pumping
      .where('childId')
      .equals(childId || 1)
      .reverse()
      .sortBy('timestamp');

    return pumpings.length > 0 ? pumpings[0] : null;
  },

  async getPumpingById(id) {
    return await db.pumping.get(id);
  },

  async deletePumping(id) {
    return await db.pumping.delete(id);
  },

  async updatePumping(id, pumpingData) {
    return await db.pumping.update(id, pumpingData);
  },

  // Get total pumped amount for a date range
  async getTotalPumpedAmount(childId, startDate, endDate) {
    const pumpings = await this.getPumping(childId, startDate, endDate);

    const totalOz = pumpings.reduce((total, pumping) => {
      let amount = pumping.amount || 0;
      // Convert ml to oz if needed (1 oz = 29.5735 ml)
      if (pumping.unit === 'ml') {
        amount = amount / 29.5735;
      }
      return total + amount;
    }, 0);

    return {
      totalOz: Math.round(totalOz * 10) / 10,
      totalMl: Math.round(totalOz * 29.5735),
      count: pumpings.length
    };
  }
};

// Tummy Time Tracking Service
export const tummyTimeService = {
  async addTummyTime(tummyTimeData) {
    return await db.tummyTime.add({
      childId: tummyTimeData.childId || 1,
      startTime: tummyTimeData.startTime || new Date(),
      endTime: tummyTimeData.endTime || null,
      duration: tummyTimeData.duration || null, // in minutes
      notes: tummyTimeData.notes || '',
      createdAt: new Date()
    });
  },

  async getTummyTime(childId, startDate, endDate) {
    let query = db.tummyTime.where('childId').equals(childId || 1);

    if (startDate && endDate) {
      return await query
        .filter(tummyTime => tummyTime.startTime >= startDate && tummyTime.startTime <= endDate)
        .reverse()
        .sortBy('startTime');
    }

    return await query.reverse().sortBy('startTime');
  },

  async getTodayTummyTime(childId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.getTummyTime(childId, today, tomorrow);
  },

  async getActiveTummyTime(childId) {
    const tummyTimes = await db.tummyTime
      .where('childId')
      .equals(childId || 1)
      .filter(tt => !tt.endTime)
      .reverse()
      .sortBy('startTime');

    return tummyTimes.length > 0 ? tummyTimes[0] : null;
  },

  async getLastTummyTime(childId) {
    const tummyTimes = await db.tummyTime
      .where('childId')
      .equals(childId || 1)
      .reverse()
      .sortBy('startTime');

    return tummyTimes.length > 0 ? tummyTimes[0] : null;
  },

  async getTummyTimeById(id) {
    return await db.tummyTime.get(id);
  },

  async endTummyTime(id, endTime) {
    const tt = await this.getTummyTimeById(id);
    if (!tt) return;

    const end = endTime || new Date();
    const duration = Math.round((end - new Date(tt.startTime)) / 1000 / 60); // minutes

    return await db.tummyTime.update(id, {
      endTime: end,
      duration: duration
    });
  },

  async deleteTummyTime(id) {
    return await db.tummyTime.delete(id);
  },

  async updateTummyTime(id, tummyTimeData) {
    return await db.tummyTime.update(id, tummyTimeData);
  },

  // Get total tummy time for a date range
  async getTotalTummyTime(childId, startDate, endDate) {
    const tummyTimes = await this.getTummyTime(childId, startDate, endDate);

    const totalMinutes = tummyTimes.reduce((total, tt) => {
      if (tt.endTime) {
        const duration = (new Date(tt.endTime) - new Date(tt.startTime)) / 1000 / 60;
        return total + duration;
      }
      return total;
    }, 0);

    return {
      totalMinutes: Math.round(totalMinutes),
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      count: tummyTimes.filter(tt => tt.endTime).length,
      dailyGoal: 30, // Recommended 30-60 minutes
      goalProgress: Math.min(Math.round((totalMinutes / 30) * 100), 100)
    };
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
    const pumpings = await pumpingService.getPumping(childId, startDate, endDate);
    const tummyTimes = await tummyTimeService.getTummyTime(childId, startDate, endDate);

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

    // Calculate total pumped
    const totalPumped = await pumpingService.getTotalPumpedAmount(childId, startDate, endDate);

    // Calculate total tummy time
    const totalTummyTime = await tummyTimeService.getTotalTummyTime(childId, startDate, endDate);

    return {
      totalFeeds: feeds.length,
      totalDiapers: diapers.length,
      wetDiapers,
      dirtyDiapers,
      totalSleeps: sleeps.length,
      totalSleepHours: (totalSleepMinutes / 60).toFixed(1),
      totalWeights: weights.length,
      totalMedicines: medicines.length,
      totalPumpings: pumpings.length,
      totalPumpedOz: totalPumped.totalOz,
      totalTummyTimeMinutes: totalTummyTime.totalMinutes,
      tummyTimeGoalProgress: totalTummyTime.goalProgress,
      feeds,
      diapers,
      sleeps,
      weights,
      medicines,
      pumpings,
      tummyTimes
    };
  },

  async getDatesWithActivity(childId, startDate, endDate) {
    const feeds = await feedService.getFeeds(childId, startDate, endDate);
    const diapers = await diaperService.getDiapers(childId, startDate, endDate);
    const sleeps = await sleepService.getSleep(childId, startDate, endDate);
    const weights = await weightService.getWeights(childId, startDate, endDate);
    const medicines = await medicineService.getMedicines(childId, startDate, endDate);
    const pumpings = await pumpingService.getPumping(childId, startDate, endDate);
    const tummyTimes = await tummyTimeService.getTummyTime(childId, startDate, endDate);

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

    pumpings.forEach(p => {
      const dateStr = new Date(p.timestamp).toDateString();
      datesSet.add(dateStr);
    });

    tummyTimes.forEach(tt => {
      const dateStr = new Date(tt.startTime).toDateString();
      datesSet.add(dateStr);
    });

    return Array.from(datesSet);
  }
};

// Milestones Tracking Service
export const milestoneService = {
  async addMilestone(milestoneData) {
    return await db.milestones.add({
      childId: milestoneData.childId || 1,
      title: milestoneData.title,
      date: milestoneData.date || new Date(),
      ageInDays: milestoneData.ageInDays,
      category: milestoneData.category || 'other', // 'physical', 'social', 'cognitive', 'other'
      photo: milestoneData.photo || null, // Base64 string
      notes: milestoneData.notes || '',
      createdAt: new Date()
    });
  },

  async getMilestones(childId) {
    return await db.milestones
      .where('childId')
      .equals(childId || 1)
      .reverse()
      .sortBy('date');
  },

  async getMilestoneById(id) {
    return await db.milestones.get(id);
  },

  async updateMilestone(id, milestoneData) {
    return await db.milestones.update(id, milestoneData);
  },

  async deleteMilestone(id) {
    return await db.milestones.delete(id);
  }
};

// Common milestones preset
export const COMMON_MILESTONES = [
  { title: 'First smile', category: 'social', typical: '6-8 weeks' },
  { title: 'Follows objects with eyes', category: 'cognitive', typical: '2-3 months' },
  { title: 'Holds head up', category: 'physical', typical: '3-4 months' },
  { title: 'Rolled over', category: 'physical', typical: '4-6 months' },
  { title: 'First laugh', category: 'social', typical: '3-4 months' },
  { title: 'Sits without support', category: 'physical', typical: '6-8 months' },
  { title: 'First tooth', category: 'physical', typical: '6-10 months' },
  { title: 'Says mama/dada', category: 'cognitive', typical: '10-12 months' },
  { title: 'Stands alone', category: 'physical', typical: '10-14 months' },
  { title: 'First steps', category: 'physical', typical: '12-15 months' },
  { title: 'Waves bye-bye', category: 'social', typical: '9-12 months' },
  { title: 'Claps hands', category: 'physical', typical: '9-12 months' }
];

// Insights & Pattern Analysis Service
export const insightsService = {
  async generateInsights(childId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();

    const [feeds, diapers, sleeps] = await Promise.all([
      feedService.getFeeds(childId, startDate, endDate),
      diaperService.getDiapers(childId, startDate, endDate),
      sleepService.getSleep(childId, startDate, endDate)
    ]);

    const insights = {
      feeding: this.analyzeFeedingPattern(feeds, days),
      sleep: this.analyzeSleepPattern(sleeps, days),
      diaper: this.analyzeDiaperPattern(diapers, days),
      alerts: await this.generateAlerts(childId, feeds, diapers, sleeps)
    };

    return insights;
  },

  analyzeFeedingPattern(feeds, days) {
    if (feeds.length === 0) return null;

    const feedsPerDay = (feeds.length / days).toFixed(1);

    // Calculate average interval
    const intervals = [];
    for (let i = 1; i < feeds.length; i++) {
      const diff = (new Date(feeds[i - 1].timestamp) - new Date(feeds[i].timestamp)) / (1000 * 60);
      intervals.push(diff);
    }
    const avgInterval = intervals.length > 0
      ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
      : 0;

    // Find most common feeding times (hour of day)
    const hourCounts = {};
    feeds.forEach(feed => {
      const hour = new Date(feed.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const typicalHours = Object.entries(hourCounts)
      .filter(([, count]) => count >= days * 0.3) // Appears in 30%+ of days
      .map(([hour]) => parseInt(hour))
      .sort((a, b) => a - b)
      .slice(0, 5); // Top 5 hours

    // Trend analysis
    const firstHalfFeeds = feeds.slice(Math.floor(feeds.length / 2)).length;
    const secondHalfFeeds = feeds.slice(0, Math.floor(feeds.length / 2)).length;
    let trend = 'stable';
    if (firstHalfFeeds > secondHalfFeeds * 1.2) trend = 'increasing';
    else if (firstHalfFeeds < secondHalfFeeds * 0.8) trend = 'decreasing';

    return {
      feedsPerDay: parseFloat(feedsPerDay),
      avgIntervalMinutes: avgInterval,
      avgIntervalHours: (avgInterval / 60).toFixed(1),
      typicalHours,
      trend,
      totalFeeds: feeds.length
    };
  },

  analyzeSleepPattern(sleeps, days) {
    const completedSleeps = sleeps.filter(s => s.endTime);

    if (completedSleeps.length === 0) return null;

    // Calculate total sleep time
    const totalMinutes = completedSleeps.reduce((total, sleep) => {
      const duration = (new Date(sleep.endTime) - new Date(sleep.startTime)) / (1000 * 60);
      return total + duration;
    }, 0);

    const avgSleepPerDay = totalMinutes / days / 60; // hours
    const avgSleepDuration = totalMinutes / completedSleeps.length; // minutes per session

    // Find longest stretch
    const durations = completedSleeps.map(s =>
      (new Date(s.endTime) - new Date(s.startTime)) / (1000 * 60)
    );
    const longestStretch = Math.max(...durations);

    // Separate naps and night sleep
    const naps = completedSleeps.filter(s => s.type === 'nap');
    const nightSleeps = completedSleeps.filter(s => s.type === 'night');

    // Trend
    const firstHalf = completedSleeps.slice(Math.floor(completedSleeps.length / 2));
    const secondHalf = completedSleeps.slice(0, Math.floor(completedSleeps.length / 2));
    const firstHalfAvg = firstHalf.reduce((sum, s) =>
      sum + (new Date(s.endTime) - new Date(s.startTime)) / (1000 * 60), 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, s) =>
      sum + (new Date(s.endTime) - new Date(s.startTime)) / (1000 * 60), 0) / secondHalf.length;

    let trend = 'stable';
    if (firstHalfAvg > secondHalfAvg * 1.2) trend = 'improving';
    else if (firstHalfAvg < secondHalfAvg * 0.8) trend = 'declining';

    return {
      totalHoursPerDay: avgSleepPerDay.toFixed(1),
      avgSessionMinutes: Math.round(avgSleepDuration),
      longestStretchMinutes: Math.round(longestStretch),
      longestStretchHours: (longestStretch / 60).toFixed(1),
      napsPerDay: (naps.length / days).toFixed(1),
      nightSleepsPerDay: (nightSleeps.length / days).toFixed(1),
      trend,
      totalSessions: completedSleeps.length
    };
  },

  analyzeDiaperPattern(diapers, days) {
    if (diapers.length === 0) return null;

    const wetDiapers = diapers.filter(d => d.type === 'wet' || d.type === 'both');
    const dirtyDiapers = diapers.filter(d => d.type === 'dirty' || d.type === 'both');

    const wetPerDay = (wetDiapers.length / days).toFixed(1);
    const dirtyPerDay = (dirtyDiapers.length / days).toFixed(1);

    // Check if wet diaper count is normal (6+ per day for newborns)
    const wetDiaperStatus = wetPerDay >= 6 ? 'normal' : 'low';

    return {
      wetPerDay: parseFloat(wetPerDay),
      dirtyPerDay: parseFloat(dirtyPerDay),
      totalPerDay: ((diapers.length / days).toFixed(1)),
      wetDiaperStatus,
      totalDiapers: diapers.length
    };
  },

  async generateAlerts(childId, feeds, diapers, sleeps) {
    const alerts = [];

    // Check wet diaper count (last 24 hours)
    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);
    const recentWetDiapers = diapers.filter(d =>
      (d.type === 'wet' || d.type === 'both') &&
      new Date(d.timestamp) >= last24h
    );

    if (recentWetDiapers.length < 6 && diapers.length > 0) {
      alerts.push({
        type: 'warning',
        icon: '💧',
        title: 'Low Wet Diaper Count',
        message: `Only ${recentWetDiapers.length} wet diapers in last 24 hours`,
        suggestion: 'Newborns should have 6+ wet diapers per day. Ensure baby is well-hydrated.',
        severity: 'medium'
      });
    }

    // Check feeding frequency (last 24 hours)
    const recentFeeds = feeds.filter(f => new Date(f.timestamp) >= last24h);
    if (recentFeeds.length < 6 && feeds.length > 0) {
      const now = new Date().getHours();
      if (now > 18) { // After 6 PM
        alerts.push({
          type: 'info',
          icon: '🍼',
          title: 'Feeding Frequency',
          message: `${recentFeeds.length} feeds in last 24 hours`,
          suggestion: 'Newborns typically need 8-12 feeds per day.',
          severity: 'low'
        });
      }
    }

    // Check for concerning stool colors in recent diapers
    const concerningDiapers = diapers
      .filter(d => d.color === 'black' || d.color === 'red')
      .slice(0, 3); // Last 3 concerning ones

    if (concerningDiapers.length > 0) {
      alerts.push({
        type: 'alert',
        icon: '⚠️',
        title: 'Unusual Stool Color',
        message: `${concerningDiapers.length} concerning stool color(s) detected`,
        suggestion: 'Contact your pediatrician about black or red stools (unless in first 2 days).',
        severity: 'high'
      });
    }

    // Positive feedback for good patterns
    if (recentWetDiapers.length >= 6 && recentFeeds.length >= 8) {
      alerts.push({
        type: 'success',
        icon: '✅',
        title: 'Healthy Patterns',
        message: 'Baby is feeding and hydrating well',
        suggestion: 'Great job! Keep up the routine.',
        severity: 'none'
      });
    }

    return alerts;
  }
};

export default db;
