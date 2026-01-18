import jsPDF from 'jspdf';
import { formatDate, formatTime } from '../utils/dateUtils';
import { getPreferences, formatAgeWithPreference } from '../utils/preferences';
import {
  feedService,
  diaperService,
  sleepService,
  weightService,
  medicineService,
  pumpingService,
  tummyTimeService,
  statsService,
  insightsService,
  milestoneService
} from './db';

export const pdfReportService = {
  async generatePediatricianReport(child, startDate, endDate, options = {}) {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Helper to add new page if needed
    const checkPageBreak = (neededSpace = 20) => {
      if (yPos + neededSpace > pageHeight - margin) {
        pdf.addPage();
        yPos = margin;
        return true;
      }
      return false;
    };

    // Header
    pdf.setFontSize(20);
    pdf.setFont(undefined, 'bold');
    pdf.text('TinyTally Pediatrician Report', margin, yPos);
    yPos += 10;

    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(100);
    pdf.text(`Generated on ${formatDate(new Date())}`, margin, yPos);
    yPos += 15;

    // Child Information
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0);
    pdf.text('Child Information', margin, yPos);
    yPos += 8;

    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Name: ${child.name}`, margin + 5, yPos);
    yPos += 6;
    pdf.text(`Date of Birth: ${formatDate(child.dateOfBirth)}`, margin + 5, yPos);
    yPos += 6;
    pdf.text(`Age: ${formatAgeWithPreference(child.dateOfBirth, getPreferences().ageFormat)}`, margin + 5, yPos);
    yPos += 10;

    // Report Period
    pdf.text(`Report Period: ${formatDate(startDate)} - ${formatDate(endDate)}`, margin + 5, yPos);
    yPos += 15;

    // Load all data
    const [feeds, diapers, sleeps, weights, medicines, pumpings, tummyTimes, stats, insights, milestones] = await Promise.all([
      feedService.getFeeds(child.id, startDate, endDate),
      diaperService.getDiapers(child.id, startDate, endDate),
      sleepService.getSleep(child.id, startDate, endDate),
      weightService.getWeights(child.id, startDate, endDate),
      medicineService.getMedicines(child.id, startDate, endDate),
      pumpingService.getPumping(child.id, startDate, endDate),
      tummyTimeService.getTummyTime(child.id, startDate, endDate),
      statsService.getDailyStats(child.id, startDate, endDate),
      insightsService.generateInsights(child.id, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))),
      milestoneService.getMilestones(child.id)
    ]);

    // Summary Statistics
    checkPageBreak(60);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('Summary Statistics', margin, yPos);
    yPos += 8;

    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');

    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    if (options.includeFeeding !== false) {
      pdf.text(`Total Feeds: ${feeds.length} (${(feeds.length / days).toFixed(1)} per day)`, margin + 5, yPos);
      yPos += 6;

      if (insights.feeding) {
        pdf.text(`  Avg Interval: ${insights.feeding.avgIntervalHours}h`, margin + 5, yPos);
        yPos += 6;
      }
    }

    if (options.includeDiapers !== false) {
      const wetCount = diapers.filter(d => d.type === 'wet' || d.type === 'both').length;
      const dirtyCount = diapers.filter(d => d.type === 'dirty' || d.type === 'both').length;
      pdf.text(`Total Diapers: ${diapers.length} (Wet: ${wetCount}, Dirty: ${dirtyCount})`, margin + 5, yPos);
      yPos += 6;
      pdf.text(`  Per Day: ${(wetCount / days).toFixed(1)} wet, ${(dirtyCount / days).toFixed(1)} dirty`, margin + 5, yPos);
      yPos += 6;
    }

    if (options.includeSleep !== false && insights.sleep) {
      pdf.text(`Sleep: ${insights.sleep.totalHoursPerDay}h per day (avg)`, margin + 5, yPos);
      yPos += 6;
      pdf.text(`  Longest Stretch: ${insights.sleep.longestStretchHours}h`, margin + 5, yPos);
      yPos += 6;
    }

    if (weights.length > 0 && options.includeWeight !== false) {
      const latestWeight = weights[0];
      pdf.text(`Latest Weight: ${latestWeight.weight} ${latestWeight.unit}`, margin + 5, yPos);
      yPos += 6;

      if (weights.length > 1) {
        const previousWeight = weights[weights.length - 1];
        const gain = latestWeight.weight - previousWeight.weight;
        pdf.text(`  Weight Gain: ${gain > 0 ? '+' : ''}${gain.toFixed(1)} ${latestWeight.unit}`, margin + 5, yPos);
        yPos += 6;
      }
    }

    yPos += 10;

    // Health Alerts
    if (insights.alerts && insights.alerts.length > 0 && options.includeAlerts !== false) {
      checkPageBreak(50);
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text('Health Insights & Alerts', margin, yPos);
      yPos += 8;

      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');

      insights.alerts.forEach(alert => {
        checkPageBreak(20);
        pdf.setFont(undefined, 'bold');
        pdf.text(`${alert.icon} ${alert.title}`, margin + 5, yPos);
        yPos += 5;
        pdf.setFont(undefined, 'normal');

        const messageLines = pdf.splitTextToSize(alert.message, pageWidth - margin * 2 - 10);
        messageLines.forEach(line => {
          checkPageBreak();
          pdf.text(line, margin + 8, yPos);
          yPos += 4;
        });

        const suggestionLines = pdf.splitTextToSize(`• ${alert.suggestion}`, pageWidth - margin * 2 - 10);
        suggestionLines.forEach(line => {
          checkPageBreak();
          pdf.text(line, margin + 8, yPos);
          yPos += 4;
        });
        yPos += 3;
      });

      yPos += 10;
    }

    // Medicines
    if (medicines.length > 0 && options.includeMedicines !== false) {
      checkPageBreak(50);
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text('Medications', margin, yPos);
      yPos += 8;

      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');

      // Group by medicine name
      const medicineGroups = {};
      medicines.forEach(m => {
        if (!medicineGroups[m.name]) {
          medicineGroups[m.name] = [];
        }
        medicineGroups[m.name].push(m);
      });

      Object.entries(medicineGroups).forEach(([name, records]) => {
        checkPageBreak(15);
        pdf.setFont(undefined, 'bold');
        pdf.text(`${name} (${records[0].dose} ${records[0].unit})`, margin + 5, yPos);
        yPos += 5;
        pdf.setFont(undefined, 'normal');
        pdf.text(`  Administered: ${records.length} times`, margin + 8, yPos);
        yPos += 5;
        pdf.text(`  Frequency: ${records[0].frequency}`, margin + 8, yPos);
        yPos += 7;
      });

      yPos += 10;
    }

    // Milestones
    if (milestones.length > 0 && options.includeMilestones !== false) {
      checkPageBreak(50);
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text('Milestones Achieved', margin, yPos);
      yPos += 8;

      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');

      // Filter milestones within date range
      const periodMilestones = milestones.filter(m =>
        new Date(m.date) >= startDate && new Date(m.date) <= endDate
      );

      if (periodMilestones.length > 0) {
        periodMilestones.forEach(milestone => {
          checkPageBreak(12);
          const ageInDays = milestone.ageInDays;
          let ageLabel = '';
          if (ageInDays < 7) {
            ageLabel = `${ageInDays} days old`;
          } else if (ageInDays < 30) {
            ageLabel = `${Math.floor(ageInDays / 7)} weeks old`;
          } else {
            ageLabel = `${Math.floor(ageInDays / 30)} months old`;
          }

          pdf.text(`• ${milestone.title} - ${formatDate(milestone.date)} (${ageLabel})`, margin + 5, yPos);
          yPos += 5;

          if (milestone.notes) {
            pdf.setFont(undefined, 'italic');
            const notesLines = pdf.splitTextToSize(`  "${milestone.notes}"`, pageWidth - margin * 2 - 10);
            notesLines.forEach(line => {
              checkPageBreak();
              pdf.text(line, margin + 8, yPos);
              yPos += 4;
            });
            pdf.setFont(undefined, 'normal');
            yPos += 2;
          }
        });
      } else {
        pdf.text('No milestones recorded during this period', margin + 5, yPos);
        yPos += 6;
      }

      yPos += 10;
    }

    // Detailed Feeding Log
    if (feeds.length > 0 && options.includeDetailedFeeding) {
      checkPageBreak(50);
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text('Detailed Feeding Log', margin, yPos);
      yPos += 8;

      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');

      feeds.slice(0, 50).forEach(feed => { // Limit to 50 most recent
        checkPageBreak(8);
        let feedText = `${formatDate(feed.timestamp)} ${formatTime(feed.timestamp)} - `;

        if (feed.type.includes('breastfeeding')) {
          const side = feed.type.split('-')[1];
          feedText += `Breastfeeding (${side})`;
          if (feed.duration) feedText += ` ${feed.duration} min`;
        } else {
          feedText += feed.type.charAt(0).toUpperCase() + feed.type.slice(1);
          if (feed.amount) feedText += ` ${feed.amount} ${feed.unit}`;
        }

        pdf.text(feedText, margin + 5, yPos);
        yPos += 5;
      });

      yPos += 10;
    }

    // Footer
    const totalPages = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(
        `Page ${i} of ${totalPages} - TinyTally Baby Tracker`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    return pdf;
  },

  async downloadReport(child, startDate, endDate, options = {}) {
    const pdf = await this.generatePediatricianReport(child, startDate, endDate, options);
    const filename = `TinyTally-${child.name}-${formatDate(startDate)}-to-${formatDate(endDate)}.pdf`;
    pdf.save(filename);
  }
};
