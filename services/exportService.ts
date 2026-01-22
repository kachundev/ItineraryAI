import { Itinerary, DayPlan, Activity } from '../types';

export type ExportFormat = 'json' | 'markdown' | 'txt';

/**
 * Export itinerary to JSON format
 */
export const exportToJSON = (itinerary: Itinerary): void => {
    const dataStr = JSON.stringify(itinerary, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    downloadFile(blob, `${sanitizeFilename(itinerary.title)}.json`);
};

/**
 * Export itinerary to Markdown format
 */
export const exportToMarkdown = (itinerary: Itinerary): void => {
    const markdown = generateMarkdown(itinerary);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    downloadFile(blob, `${sanitizeFilename(itinerary.title)}.md`);
};

/**
 * Export itinerary to plain text format
 */
export const exportToText = (itinerary: Itinerary): void => {
    const text = generatePlainText(itinerary);
    const blob = new Blob([text], { type: 'text/plain' });
    downloadFile(blob, `${sanitizeFilename(itinerary.title)}.txt`);
};

/**
 * Generate Markdown content from itinerary
 */
const generateMarkdown = (itinerary: Itinerary): string => {
    let md = `# ${itinerary.title}\n\n`;
    md += `**📍 Location:** ${itinerary.location}\n`;
    md += `**📅 Dates:** ${itinerary.startDate} - ${itinerary.endDate}\n`;
    if (itinerary.budget) md += `**💰 Budget:** ${itinerary.budget}\n`;
    if (itinerary.description) md += `\n${itinerary.description}\n`;
    md += '\n---\n\n';

    itinerary.days.forEach((day: DayPlan) => {
        md += `## Day ${day.day}: ${day.title}\n`;
        if (day.date) md += `*${day.date}*\n`;
        md += '\n';

        day.activities.forEach((activity: Activity) => {
            md += `### ${activity.time} - ${activity.title}\n`;
            md += `**Type:** ${activity.type}\n`;
            if (activity.location) md += `**Location:** ${activity.location}\n`;
            if (activity.duration) md += `**Duration:** ${activity.duration} min\n`;
            if (activity.cost) md += `**Cost:** ${activity.cost}\n`;
            md += `\n${activity.description}\n`;

            if (activity.tips) {
                md += `\n> 💡 **Tips:** ${activity.tips}\n`;
            }
            if (activity.transport) {
                md += `\n> 🚌 **Transport:** ${activity.transport}\n`;
            }

            // Restaurant options
            if (activity.restaurantOptions && activity.restaurantOptions.length > 0) {
                md += '\n**Restaurant Recommendations:**\n';
                activity.restaurantOptions.forEach((r, i) => {
                    md += `${i + 1}. **${r.name}** (${r.cuisine}) - ⭐ ${r.rating} - ${r.priceLevel}\n`;
                    md += `   > ${r.description}\n`;
                });
            }
            md += '\n';
        });
        md += '\n---\n\n';
    });

    return md;
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
                text += `\n  💡 Tips: ${activity.tips}\n`;
            }
            if (activity.transport) {
                text += `\n  🚌 Transport: ${activity.transport}\n`;
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
        case 'json':
            exportToJSON(itinerary);
            break;
        case 'markdown':
            exportToMarkdown(itinerary);
            break;
        case 'txt':
            exportToText(itinerary);
            break;
        default:
            exportToMarkdown(itinerary);
    }
};
