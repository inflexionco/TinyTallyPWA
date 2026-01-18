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

    // Standardized font sizes
    const FONT = {
      TITLE: 18,
      HEADING: 14,
      SUBHEADING: 12,
      BODY: 10,
      SMALL: 9
    };

    // Helper to add new page if needed
    const checkPageBreak = (neededSpace = 20) => {
      if (yPos + neededSpace > pageHeight - margin) {
        pdf.addPage();
        yPos = margin;
        return true;
      }
      return false;
    };

    // Helper to draw a horizontal line
    const drawLine = () => {
      pdf.setDrawColor(200);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;
    };

    // Header
    pdf.setFontSize(FONT.TITLE);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0);
    pdf.text('TinyTally Pediatrician Report', margin, yPos);
    yPos += 8;

    pdf.setFontSize(FONT.SMALL);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(100);
    pdf.text(`Generated: ${formatDate(new Date())}`, margin, yPos);
    yPos += 8;

    drawLine();
    yPos += 5;

    // Child Information Section
    pdf.setFontSize(FONT.HEADING);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0);
    pdf.text('CHILD INFORMATION', margin, yPos);
    yPos += 7;

    pdf.setFontSize(FONT.BODY);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Name: ${child.name}`, margin + 5, yPos);
    yPos += 6;
    pdf.text(`Date of Birth: ${formatDate(child.dateOfBirth)}`, margin + 5, yPos);
    yPos += 6;
    pdf.text(`Age: ${formatAgeWithPreference(child.dateOfBirth, getPreferences().ageFormat)}`, margin + 5, yPos);
    yPos += 6;
    pdf.text(`Report Period: ${formatDate(startDate)} - ${formatDate(endDate)}`, margin + 5, yPos);
    yPos += 10;

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

    // Summary Statistics Section
    checkPageBreak(60);
    drawLine();
    yPos += 3;

    pdf.setFontSize(FONT.HEADING);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0);
    pdf.text('SUMMARY STATISTICS', margin, yPos);
    yPos += 8;

    pdf.setFontSize(FONT.BODY);
    pdf.setFont(undefined, 'normal');

    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    if (options.includeFeeding !== false) {
      pdf.setFont(undefined, 'bold');
      pdf.text('Feeding:', margin + 5, yPos);
      pdf.setFont(undefined, 'normal');
      yPos += 6;
      pdf.text(`Total Feeds: ${feeds.length} (${(feeds.length / days).toFixed(1)} per day)`, margin + 10, yPos);
      yPos += 5;

      if (insights.feeding) {
        pdf.text(`Average Interval: ${insights.feeding.avgIntervalHours} hours`, margin + 10, yPos);
        yPos += 5;
      }
      yPos += 3;
    }

    if (options.includeDiapers !== false) {
      const wetCount = diapers.filter(d => d.type === 'wet' || d.type === 'both').length;
      const dirtyCount = diapers.filter(d => d.type === 'dirty' || d.type === 'both').length;

      pdf.setFont(undefined, 'bold');
      pdf.text('Diapers:', margin + 5, yPos);
      pdf.setFont(undefined, 'normal');
      yPos += 6;
      pdf.text(`Total Changes: ${diapers.length} (Wet: ${wetCount}, Dirty: ${dirtyCount})`, margin + 10, yPos);
      yPos += 5;
      pdf.text(`Per Day Average: ${(wetCount / days).toFixed(1)} wet, ${(dirtyCount / days).toFixed(1)} dirty`, margin + 10, yPos);
      yPos += 5;
      yPos += 3;
    }

    if (options.includeSleep !== false && insights.sleep) {
      pdf.setFont(undefined, 'bold');
      pdf.text('Sleep:', margin + 5, yPos);
      pdf.setFont(undefined, 'normal');
      yPos += 6;
      pdf.text(`Average Per Day: ${insights.sleep.totalHoursPerDay} hours`, margin + 10, yPos);
      yPos += 5;
      pdf.text(`Longest Stretch: ${insights.sleep.longestStretchHours} hours`, margin + 10, yPos);
      yPos += 5;
      yPos += 3;
    }

    if (weights.length > 0 && options.includeWeight !== false) {
      const latestWeight = weights[0];

      pdf.setFont(undefined, 'bold');
      pdf.text('Weight:', margin + 5, yPos);
      pdf.setFont(undefined, 'normal');
      yPos += 6;
      pdf.text(`Latest: ${latestWeight.weight} ${latestWeight.unit}`, margin + 10, yPos);
      yPos += 5;

      if (weights.length > 1) {
        const previousWeight = weights[weights.length - 1];
        const gain = latestWeight.weight - previousWeight.weight;
        pdf.text(`Weight Gain: ${gain > 0 ? '+' : ''}${gain.toFixed(1)} ${latestWeight.unit}`, margin + 10, yPos);
        yPos += 5;
      }
      yPos += 3;
    }

    yPos += 5;

    // Health Alerts Section
    if (insights.alerts && insights.alerts.length > 0 && options.includeAlerts !== false) {
      checkPageBreak(50);
      drawLine();
      yPos += 3;

      pdf.setFontSize(FONT.HEADING);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0);
      pdf.text('HEALTH INSIGHTS & ALERTS', margin, yPos);
      yPos += 8;

      pdf.setFontSize(FONT.BODY);

      insights.alerts.forEach((alert, index) => {
        checkPageBreak(25);

        // Get severity indicator
        const severityLabel = {
          'high': '[!]',
          'medium': '[*]',
          'low': '[i]',
          'info': '[+]'
        }[alert.severity] || '[*]';

        pdf.setFont(undefined, 'bold');
        pdf.text(`${severityLabel} ${alert.title}`, margin + 5, yPos);
        yPos += 6;

        pdf.setFont(undefined, 'normal');
        const messageLines = pdf.splitTextToSize(alert.message, pageWidth - margin * 2 - 15);
        messageLines.forEach(line => {
          checkPageBreak();
          pdf.text(line, margin + 10, yPos);
          yPos += 5;
        });

        pdf.setFont(undefined, 'italic');
        const suggestionLines = pdf.splitTextToSize(`Suggestion: ${alert.suggestion}`, pageWidth - margin * 2 - 15);
        suggestionLines.forEach(line => {
          checkPageBreak();
          pdf.text(line, margin + 10, yPos);
          yPos += 5;
        });
        pdf.setFont(undefined, 'normal');

        yPos += 4;
      });

      yPos += 5;
    }

    // Medicines Section
    if (medicines.length > 0 && options.includeMedicines !== false) {
      checkPageBreak(50);
      drawLine();
      yPos += 3;

      pdf.setFontSize(FONT.HEADING);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0);
      pdf.text('MEDICATIONS', margin, yPos);
      yPos += 8;

      pdf.setFontSize(FONT.BODY);
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
        checkPageBreak(18);
        pdf.setFont(undefined, 'bold');
        pdf.text(`${name}`, margin + 5, yPos);
        yPos += 6;

        pdf.setFont(undefined, 'normal');
        pdf.text(`Dose: ${records[0].dose} ${records[0].unit}`, margin + 10, yPos);
        yPos += 5;
        pdf.text(`Frequency: ${records[0].frequency}`, margin + 10, yPos);
        yPos += 5;
        pdf.text(`Administered: ${records.length} times during period`, margin + 10, yPos);
        yPos += 7;
      });

      yPos += 3;
    }

    // Milestones Section
    if (milestones.length > 0 && options.includeMilestones !== false) {
      checkPageBreak(50);
      drawLine();
      yPos += 3;

      pdf.setFontSize(FONT.HEADING);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0);
      pdf.text('MILESTONES ACHIEVED', margin, yPos);
      yPos += 8;

      pdf.setFontSize(FONT.BODY);
      pdf.setFont(undefined, 'normal');

      // Filter milestones within date range
      const periodMilestones = milestones.filter(m =>
        new Date(m.date) >= startDate && new Date(m.date) <= endDate
      );

      if (periodMilestones.length > 0) {
        periodMilestones.forEach(milestone => {
          checkPageBreak(15);
          const ageInDays = milestone.ageInDays;
          let ageLabel = '';
          if (ageInDays < 7) {
            ageLabel = `${ageInDays} days old`;
          } else if (ageInDays < 30) {
            ageLabel = `${Math.floor(ageInDays / 7)} weeks old`;
          } else {
            ageLabel = `${Math.floor(ageInDays / 30)} months old`;
          }

          pdf.setFont(undefined, 'bold');
          pdf.text(`${milestone.title}`, margin + 5, yPos);
          yPos += 5;

          pdf.setFont(undefined, 'normal');
          pdf.text(`Date: ${formatDate(milestone.date)} (${ageLabel})`, margin + 10, yPos);
          yPos += 5;

          if (milestone.notes) {
            pdf.setFont(undefined, 'italic');
            const notesLines = pdf.splitTextToSize(`Note: ${milestone.notes}`, pageWidth - margin * 2 - 15);
            notesLines.forEach(line => {
              checkPageBreak();
              pdf.text(line, margin + 10, yPos);
              yPos += 5;
            });
            pdf.setFont(undefined, 'normal');
          }

          yPos += 3;
        });
      } else {
        pdf.text('No milestones recorded during this period', margin + 5, yPos);
        yPos += 6;
      }

      yPos += 3;
    }

    // Detailed Feeding Log (Table Format)
    if (feeds.length > 0 && options.includeDetailedFeeding) {
      checkPageBreak(50);
      drawLine();
      yPos += 3;

      pdf.setFontSize(FONT.HEADING);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0);
      pdf.text('DETAILED FEEDING LOG', margin, yPos);
      yPos += 8;

      pdf.setFontSize(FONT.SMALL);
      pdf.setFont(undefined, 'normal');
      pdf.text(`(Showing up to 50 most recent feeds)`, margin, yPos);
      yPos += 8;

      // Table setup
      const tableStartY = yPos;
      const colWidths = {
        date: 32,
        time: 20,
        type: 45,
        details: 65
      };
      const rowHeight = 6;

      // Helper to draw table row
      const drawTableRow = (date, time, type, details, isHeader = false) => {
        const startY = yPos;

        pdf.setFontSize(FONT.SMALL);
        if (isHeader) {
          pdf.setFont(undefined, 'bold');
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin, yPos - 4, pageWidth - margin * 2, rowHeight, 'F');
        } else {
          pdf.setFont(undefined, 'normal');
        }

        // Draw cell borders
        pdf.setDrawColor(200);
        let xPos = margin;

        // Date column
        pdf.rect(xPos, startY - 4, colWidths.date, rowHeight);
        pdf.text(date, xPos + 2, startY);
        xPos += colWidths.date;

        // Time column
        pdf.rect(xPos, startY - 4, colWidths.time, rowHeight);
        pdf.text(time, xPos + 2, startY);
        xPos += colWidths.time;

        // Type column
        pdf.rect(xPos, startY - 4, colWidths.type, rowHeight);
        const typeText = pdf.splitTextToSize(type, colWidths.type - 4);
        pdf.text(typeText[0] || '', xPos + 2, startY);
        xPos += colWidths.type;

        // Details column
        pdf.rect(xPos, startY - 4, colWidths.details, rowHeight);
        const detailsText = pdf.splitTextToSize(details, colWidths.details - 4);
        pdf.text(detailsText[0] || '', xPos + 2, startY);

        yPos += rowHeight;
      };

      // Draw table header
      drawTableRow('Date', 'Time', 'Type', 'Details', true);

      // Draw table rows
      const recentFeeds = feeds.slice(0, 50);
      recentFeeds.forEach(feed => {
        checkPageBreak(rowHeight + 5);

        const date = formatDate(feed.timestamp);
        const time = formatTime(feed.timestamp);
        let type = '';
        let details = '';

        if (feed.type.includes('breastfeeding')) {
          const side = feed.type.split('-')[1];
          type = `Breast (${side.charAt(0).toUpperCase()})`;
          details = feed.duration ? `${feed.duration} min` : '-';
        } else {
          type = feed.type.charAt(0).toUpperCase() + feed.type.slice(1);
          details = feed.amount ? `${feed.amount} ${feed.unit}` : '-';
        }

        drawTableRow(date, time, type, details, false);
      });

      yPos += 5;
    }

    // Footer - Add to all pages
    const totalPages = pdf.internal.getNumberOfPages();
    pdf.setFontSize(FONT.SMALL);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(120);

    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);

      // Page number
      pdf.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      // App name
      pdf.text(
        'TinyTally Baby Tracker',
        pageWidth - margin,
        pageHeight - 10,
        { align: 'right' }
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
