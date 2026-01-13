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
      feeds,
      diapers,
      sleeps,
      weights
    };
  }
};

export default db;
