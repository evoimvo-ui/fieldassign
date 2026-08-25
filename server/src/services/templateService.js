import Template from '../models/Template.js';
import Task from '../models/Task.js';

const MAX_LOOKBACK_DAYS = 14;

const startOfDay = (d) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

const lastDayOfMonth = (year, month) => new Date(year, month + 1, 0).getDate();

export const dateMatchesTemplate = (date, template) => {
  const d = startOfDay(date);
  const start = startOfDay(template.startDate);

  if (d < start) return false;

  if (template.endDate) {
    const end = startOfDay(template.endDate);
    if (d > end) return false;
  }

  const type = template.recurrence?.type;

  if (type === 'daily') {
    return true;
  }

  if (type === 'weekly') {
    const dayOfWeek = d.getDay();
    const weekdays = template.recurrence?.weekdays || [];
    return weekdays.includes(dayOfWeek);
  }

  if (type === 'monthly') {
    const targetDay = template.recurrence?.dayOfMonth;
    if (!targetDay) return false;
    const actualDay = d.getDate();
    const year = d.getFullYear();
    const month = d.getMonth();
    const lastDay = lastDayOfMonth(year, month);
    const effectiveDay = targetDay > lastDay ? lastDay : targetDay;
    return actualDay === effectiveDay;
  }

  return false;
};

export const generateMissingTasks = async (organizationId) => {
  if (!organizationId) return { created: 0, errors: 0 };

  const today = startOfDay(new Date());
  const lookbackStart = new Date(today);
  lookbackStart.setDate(lookbackStart.getDate() - (MAX_LOOKBACK_DAYS - 1));

  const templates = await Template.find({
    organization: organizationId,
    status: 'active',
    $or: [
      { endDate: null },
      { endDate: { $gte: lookbackStart } },
    ],
  });

  if (templates.length === 0) return { created: 0, errors: 0 };

  let createdCount = 0;
  let errorCount = 0;

  for (const template of templates) {
    try {
      const rangeStartRaw = startOfDay(
        template.lastGeneratedDate && template.lastGeneratedDate > lookbackStart
          ? template.lastGeneratedDate
          : lookbackStart
      );

      const templateStart = startOfDay(template.startDate);
      const rangeStart = rangeStartRaw > templateStart ? rangeStartRaw : templateStart;

      const rangeEndRaw = today;
      const rangeEnd = template.endDate
        ? (startOfDay(template.endDate) < rangeEndRaw ? startOfDay(template.endDate) : rangeEndRaw)
        : rangeEndRaw;

      if (rangeStart > rangeEnd) continue;

      const current = new Date(rangeStart);
      while (current <= rangeEnd) {
        try {
          if (dateMatchesTemplate(current, template)) {
            const scheduledFor = startOfDay(current);

            const exists = await Task.findOne({
              sourceTemplate: template._id,
              scheduledDate: scheduledFor,
              organization: organizationId,
            });

            if (!exists) {
              await Task.create({
                organization: template.organization,
                createdBy: template.createdBy,
                assignedTo: template.assignedTo,
                title: template.title,
                description: template.description || '',
                location: template.location || '',
                timeStart: template.timeStart || '',
                timeEnd: template.timeEnd || '',
                priority: template.priority || 'medium',
                status: 'pending',
                scheduledDate: scheduledFor,
                sourceTemplate: template._id,
              });
              createdCount++;
            }
          }
        } catch (err) {
          console.error('Greška u generisanju taska za dan:', current, err);
          errorCount++;
        }
        current.setDate(current.getDate() + 1);
      }

      try {
        const maxDate = template.endDate
          ? (startOfDay(template.endDate) < today ? startOfDay(template.endDate) : today)
          : today;
        if (!template.lastGeneratedDate || maxDate > startOfDay(template.lastGeneratedDate)) {
          template.lastGeneratedDate = maxDate;
          await template.save();
        }
      } catch (_) { }

    } catch (err) {
      console.error('Greška u generisanju za template:', template._id, err);
      errorCount++;
    }
  }

  return { created: createdCount, errors: errorCount };
};

export default { dateMatchesTemplate, generateMissingTasks };
