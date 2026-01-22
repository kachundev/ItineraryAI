import { Itinerary, DayPlan, Activity } from '../types';

export type ExportFormat = 'txt' | 'pdf';

/**
 * Export itinerary to plain text format
 */
export const exportToText = (itinerary: Itinerary): void => {
    const text = generatePlainText(itinerary);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    downloadFile(blob, `${sanitizeFilename(itinerary.title)}.txt`);
};

/**
 * Export itinerary to PDF format using browser print
 */
export const exportToPDF = (itinerary: Itinerary): void => {
    const html = generatePDFHTML(itinerary);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to export PDF');
        return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };
};

/**
 * Generate PDF-friendly HTML content
 */
const generatePDFHTML = (itinerary: Itinerary): string => {
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${itinerary.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 28px; margin-bottom: 8px; color: #1a1a1a; }
    h2 { font-size: 20px; margin: 24px 0 12px; color: #333; border-bottom: 2px solid #f97316; padding-bottom: 4px; }
    h3 { font-size: 16px; margin: 16px 0 8px; color: #444; }
    .meta { color: #666; font-size: 14px; margin-bottom: 4px; }
    .description { color: #555; margin: 16px 0; font-style: italic; }
    .activity { 
      margin: 12px 0; 
      padding: 12px; 
      background: #f9f9f9; 
      border-radius: 8px;
      border-left: 3px solid #f97316;
      page-break-inside: avoid;
    }
    .activity-header { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
    .time { 
      background: #f97316; 
      color: white; 
      padding: 2px 8px; 
      border-radius: 4px; 
      font-size: 12px;
      font-weight: bold;
    }
    .type { 
      background: #e5e5e5; 
      padding: 2px 8px; 
      border-radius: 4px; 
      font-size: 11px;
      text-transform: uppercase;
    }
    .activity-title { font-weight: bold; color: #1a1a1a; }
    .activity-desc { font-size: 14px; color: #555; margin: 8px 0; }
    .info { font-size: 12px; color: #666; }
    .tips { 
      background: #fff3cd; 
      padding: 8px; 
      border-radius: 4px; 
      margin-top: 8px; 
      font-size: 13px;
    }
    .transport { 
      background: #d1ecf1; 
      padding: 8px; 
      border-radius: 4px; 
      margin-top: 8px; 
      font-size: 13px;
    }
    .restaurant { 
      background: #d4edda; 
      padding: 8px; 
      border-radius: 4px; 
      margin-top: 6px; 
      font-size: 13px;
    }
    .day-section { page-break-inside: avoid; margin-bottom: 24px; }
    @media print {
      body { padding: 20px; }
      .activity { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${itinerary.title}</h1>
  <div class="meta">📍 ${itinerary.location}</div>
  <div class="meta">📅 ${itinerary.startDate} - ${itinerary.endDate}</div>
  ${itinerary.budget ? `<div class="meta">💰 Budget: ${itinerary.budget}</div>` : ''}
  ${itinerary.description ? `<div class="description">${itinerary.description}</div>` : ''}
`;

    itinerary.days.forEach((day: DayPlan) => {
        html += `
  <div class="day-section">
    <h2>Day ${day.day}: ${day.title}</h2>
    ${day.date ? `<div class="meta">${day.date}</div>` : ''}
`;

        day.activities.forEach((activity: Activity) => {
            html += `
    <div class="activity">
      <div class="activity-header">
        <span class="time">${activity.time}</span>
        <span class="type">${activity.type}</span>
      </div>
      <div class="activity-title">${activity.title}</div>
      <div class="activity-desc">${activity.description}</div>
      ${activity.location ? `<div class="info">📍 ${activity.location}</div>` : ''}
      ${activity.duration ? `<div class="info">⏱️ ${activity.duration} min</div>` : ''}
      ${activity.cost ? `<div class="info">💰 ${activity.cost}</div>` : ''}
      ${activity.tips ? `<div class="tips">💡 ${activity.tips}</div>` : ''}
      ${activity.transport ? `<div class="transport">🚌 ${activity.transport}</div>` : ''}
`;

            if (activity.restaurantOptions && activity.restaurantOptions.length > 0) {
                activity.restaurantOptions.forEach((r, i) => {
                    html += `<div class="restaurant">🍽️ ${i + 1}. ${r.name} (${r.cuisine}) - ⭐${r.rating} - ${r.priceLevel}</div>`;
                });
            }

            html += `</div>`;
        });

        html += `</div>`;
    });

    html += `
</body>
</html>`;

    return html;
};

/**
 * Generate plain text content from itinerary
 */
const generatePlainText = (itinerary: Itinerary): string => {
    let text = `${itinerary.title}\n${'='.repeat(itinerary.title.length)}\n\n`;
    text += `Location: ${itinerary.location}\n`;
    text += `Dates: ${itinerary.startDate} - ${itinerary.endDate}\n`;
    if (itinerary.budget) text += `Budget: ${itinerary.budget}\n`;
    if (itinerary.description) text += `\n${itinerary.description}\n`;
    text += '\n' + '-'.repeat(50) + '\n\n';

    itinerary.days.forEach((day: DayPlan) => {
        text += `DAY ${day.day}: ${day.title}\n`;
        if (day.date) text += `(${day.date})\n`;
        text += '\n';

        day.activities.forEach((activity: Activity) => {
            text += `[${activity.time}] ${activity.title}\n`;
            text += `  Type: ${activity.type}\n`;
            if (activity.location) text += `  Location: ${activity.location}\n`;
            if (activity.duration) text += `  Duration: ${activity.duration} min\n`;
            if (activity.cost) text += `  Cost: ${activity.cost}\n`;
            text += `\n  ${activity.description}\n`;

            if (activity.tips) {
                text += `\n  Tips: ${activity.tips}\n`;
            }
            if (activity.transport) {
                text += `\n  Transport: ${activity.transport}\n`;
            }

            if (activity.restaurantOptions && activity.restaurantOptions.length > 0) {
                text += '\n  Restaurant Recommendations:\n';
                activity.restaurantOptions.forEach((r, i) => {
                    text += `    ${i + 1}. ${r.name} (${r.cuisine}) - Rating: ${r.rating} - ${r.priceLevel}\n`;
                    text += `       ${r.description}\n`;
                });
            }
            text += '\n';
        });
        text += '\n' + '-'.repeat(50) + '\n\n';
    });

    return text;
};

/**
 * Sanitize filename by removing invalid characters
 */
const sanitizeFilename = (name: string): string => {
    return name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);
};

/**
 * Download file helper
 */
const downloadFile = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Export itinerary in the specified format
 */
export const exportItinerary = (itinerary: Itinerary, format: ExportFormat): void => {
    switch (format) {
        case 'pdf':
            exportToPDF(itinerary);
            break;
        case 'txt':
            exportToText(itinerary);
            break;
        default:
            exportToPDF(itinerary);
    }
};
