import express from 'express';
import Task from '../models/Task.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import { requireAdmin } from '../middleware/auth.js';
import { generateMissingTasks } from '../services/templateService.js';
import { notifyTaskAssigned, notifyAdminsStatusChange } from '../services/notifications.js';

const router = express.Router();

// GET /api/tasks — lista zadataka (admin vidi sve, worker samo svoje)
router.get('/', async (req, res) => {
  try {
    try {
      await generateMissingTasks(req.organizationId);
    } catch (_) { }
    const { status, date } = req.query;
    const filter = { organization: req.organizationId };

    if (req.user.role === 'worker') {
      filter.assignedTo = req.user._id;
    }
    if (status) filter.status = status;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.scheduledDate = { $gte: start, $lte: end };
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .populate('client', 'name location')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, organization: req.organizationId })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .populate('client', 'name location');

    if (!task) return res.status(404).json({ message: 'Zadatak nije pronađen' });

    // Worker može vidjeti samo svoje zadatke
    if (req.user.role === 'worker' && task.assignedTo._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Nedovoljna prava pristupa' });
    }

    const activities = await Activity.find({ task: task._id }).sort({ timestamp: 1 });
    res.json({ task, activities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

// POST /api/tasks — kreiraj zadatak (samo admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, description, location, assignedTo, priority, timeStart, timeEnd, scheduledDate, client } = req.body;

    if (!title || !assignedTo) {
      return res.status(400).json({ message: 'Naziv i dodijeljeni radnik su obavezni' });
    }

    const task = await Task.create({
      organization: req.organizationId,
      createdBy: req.user._id,
      title, description, location, assignedTo, priority,
      timeStart, timeEnd, client,
      scheduledDate: scheduledDate || new Date(),
    });

    await task.populate('assignedTo', 'name email');
    await task.populate('client', 'name location');

    notifyTaskAssigned(task).catch(() => {});

    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

// PATCH /api/tasks/:id/status — promjena statusa (worker mijenja vlastite)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, gps, reason } = req.body;
    const allowed = ['pending', 'accepted', 'inprogress', 'completed', 'rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Nevažeći status' });
    }

    const task = await Task.findOne({ _id: req.params.id, organization: req.organizationId });
    if (!task) return res.status(404).json({ message: 'Zadatak nije pronađen' });

    if (req.user.role === 'worker' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Nedovoljna prava pristupa' });
    }

    // Spremi GPS check-in u zavisnosti od statusa
    if (gps) {
      const gpsData = { ...gps, timestamp: new Date() };
      if (status === 'accepted') task.gpsAccepted = gpsData;
      if (status === 'inprogress') task.gpsArrival = gpsData;
      if (status === 'completed') task.gpsCompleted = gpsData;
    }

    task.status = status;
    if (status === 'completed') task.completedAt = new Date();
    await task.save();

    // Auto-kreiraj sistemsku aktivnost (tekst ostavljamo prazan, frontend prevede po `type`)
    await Activity.create({
      task: task._id,
      organization: req.organizationId,
      user: req.user._id,
      type: ['accepted', 'inprogress', 'completed', 'rejected'].includes(status) ? status : 'custom',
      text: '',
      gps: gps ? { ...gps, timestamp: new Date() } : undefined,
    });

    notifyAdminsStatusChange(task, status).catch(() => {});

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

// PUT /api/tasks/:id — uredi zadatak (samo admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const oldTask = await Task.findOne({ _id: req.params.id, organization: req.organizationId });
    if (!oldTask) return res.status(404).json({ message: 'Zadatak nije pronađen' });

    const oldAssignedTo = oldTask.assignedTo?.toString();

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, organization: req.organizationId },
      req.body,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email').populate('client', 'name location');

    const newAssignedTo = task.assignedTo?._id?.toString() || task.assignedTo?.toString();
    if (newAssignedTo && newAssignedTo !== oldAssignedTo) {
      notifyTaskAssigned(task).catch(() => {});
    }

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

// DELETE /api/tasks/:id (samo admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, organization: req.organizationId });
    if (!task) return res.status(404).json({ message: 'Zadatak nije pronađen' });
    await Activity.deleteMany({ task: task._id });
    res.json({ message: 'Zadatak obrisan' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

export default router;
