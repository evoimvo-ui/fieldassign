import express from 'express';
import Template from '../models/Template.js';
import Task from '../models/Task.js';
import { requireAdmin } from '../middleware/auth.js';
import { generateMissingTasks } from '../services/templateService.js';

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const templates = await Template.find({ organization: req.organizationId })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(templates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      title, description, location, assignedTo, priority,
      timeStart, timeEnd, recurrence, startDate, endDate,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Naziv je obavezan' });
    }
    if (!assignedTo) {
      return res.status(400).json({ message: 'Dodijeljeni radnik je obavezan' });
    }
    if (!recurrence?.type) {
      return res.status(400).json({ message: 'Tip ponavljanja je obavezan' });
    }
    const allowedTypes = ['daily', 'weekly', 'monthly'];
    if (!allowedTypes.includes(recurrence.type)) {
      return res.status(400).json({ message: 'Tip ponavljanja nije validan' });
    }
    if (recurrence.type === 'weekly') {
      if (!Array.isArray(recurrence.weekdays) || recurrence.weekdays.length === 0) {
        return res.status(400).json({ message: 'Odaberite barem jedan dan u sedmici' });
      }
      for (const d of recurrence.weekdays) {
        if (typeof d !== 'number' || d < 0 || d > 6) {
          return res.status(400).json({ message: 'Dani u sedmici nisu validni' });
        }
      }
    }
    if (recurrence.type === 'monthly') {
      const d = recurrence.dayOfMonth;
      if (typeof d !== 'number' || !Number.isInteger(d) || d < 1 || d > 31) {
        return res.status(400).json({ message: 'Dan u mjesecu mora biti 1–31' });
      }
    }
    if (!startDate) {
      return res.status(400).json({ message: 'Datum početka je obavezan' });
    }

    const recurrenceData = { type: recurrence.type };
    if (recurrence.type === 'weekly') recurrenceData.weekdays = recurrence.weekdays;
    if (recurrence.type === 'monthly') recurrenceData.dayOfMonth = recurrence.dayOfMonth;

    const template = await Template.create({
      organization: req.organizationId,
      createdBy: req.user._id,
      title: title.trim(),
      description: description || '',
      location: location || '',
      assignedTo,
      priority: priority || 'medium',
      timeStart: timeStart || '',
      timeEnd: timeEnd || '',
      recurrence: recurrenceData,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      status: 'active',
    });

    await template.populate('assignedTo', 'name email');
    await template.populate('createdBy', 'name');

    try {
      await generateMissingTasks(req.organizationId);
    } catch (_) { }

    res.status(201).json(template);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      organization: req.organizationId,
    })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name');

    if (!template) return res.status(404).json({ message: 'Šablon nije pronađen' });
    res.json(template);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const {
      title, description, location, assignedTo, priority,
      timeStart, timeEnd, recurrence, startDate, endDate, status,
    } = req.body;

    const template = await Template.findOne({
      _id: req.params.id,
      organization: req.organizationId,
    });
    if (!template) return res.status(404).json({ message: 'Šablon nije pronađen' });

    const updates = {};

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description || '';
    if (location !== undefined) updates.location = location || '';
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;
    if (priority !== undefined) updates.priority = priority;
    if (timeStart !== undefined) updates.timeStart = timeStart || '';
    if (timeEnd !== undefined) updates.timeEnd = timeEnd || '';
    if (startDate !== undefined) updates.startDate = new Date(startDate);
    if (endDate !== undefined) updates.endDate = endDate ? new Date(endDate) : null;
    if (status !== undefined && ['active', 'paused'].includes(status)) {
      updates.status = status;
    }

    if (recurrence !== undefined) {
      const t = recurrence.type;
      if (t && !['daily', 'weekly', 'monthly'].includes(t)) {
        return res.status(400).json({ message: 'Tip ponavljanja nije validan' });
      }
      if (t === 'weekly') {
        if (!Array.isArray(recurrence.weekdays) || recurrence.weekdays.length === 0) {
          return res.status(400).json({ message: 'Odaberite barem jedan dan u sedmici' });
        }
        for (const d of recurrence.weekdays) {
          if (typeof d !== 'number' || d < 0 || d > 6) {
            return res.status(400).json({ message: 'Dani u sedmici nisu validni' });
          }
        }
      }
      if (t === 'monthly') {
        const d = recurrence.dayOfMonth;
        if (typeof d !== 'number' || !Number.isInteger(d) || d < 1 || d > 31) {
          return res.status(400).json({ message: 'Dan u mjesecu mora biti 1–31' });
        }
      }
      const newRec = { type: t };
      if (t === 'weekly') newRec.weekdays = recurrence.weekdays;
      if (t === 'monthly') newRec.dayOfMonth = recurrence.dayOfMonth;
      updates.recurrence = newRec;
      updates.lastGeneratedDate = null;
    }

    const updated = await Template.findOneAndUpdate(
      { _id: req.params.id, organization: req.organizationId },
      updates,
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name');

    try {
      await generateMissingTasks(req.organizationId);
    } catch (_) { }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      organization: req.organizationId,
    });
    if (!template) return res.status(404).json({ message: 'Šablon nije pronađen' });

    template.status = 'paused';
    await template.save();
    res.json({ message: 'Šablon je pauziran (prestaje generisanje zadataka)' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

router.patch('/:id/toggle-pause', requireAdmin, async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      organization: req.organizationId,
    });
    if (!template) return res.status(404).json({ message: 'Šablon nije pronađen' });

    template.status = template.status === 'active' ? 'paused' : 'active';

    if (template.status === 'active') template.lastGeneratedDate = null;

    await template.save();

    if (template.status === 'active') {
      try { await generateMissingTasks(req.organizationId); } catch (_) {}
    }

    await template.populate('assignedTo', 'name email');
    res.json(template);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

export default router;
