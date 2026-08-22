import express from 'express';
import Activity from '../models/Activity.js';
import Task from '../models/Task.js';

const router = express.Router();

// GET /api/activities?taskId=xxx
router.get('/', async (req, res) => {
  try {
    const { taskId, date } = req.query;
    const filter = { organization: req.organizationId };

    if (req.user.role === 'worker') filter.user = req.user._id;
    if (taskId) filter.task = taskId;
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      filter.timestamp = { $gte: start, $lte: end };
    }

    const activities = await Activity.find(filter)
      .populate('user', 'name')
      .populate('task', 'title')
      .sort({ timestamp: 1 });

    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

// POST /api/activities — dodaj aktivnost na zadatak
router.post('/', async (req, res) => {
  try {
    const { taskId, text, note, gps } = req.body;

    if (!taskId || !text) {
      return res.status(400).json({ message: 'taskId i text su obavezni' });
    }

    const task = await Task.findOne({ _id: taskId, organization: req.organizationId });
    if (!task) return res.status(404).json({ message: 'Zadatak nije pronađen' });

    if (req.user.role === 'worker' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Nedovoljna prava pristupa' });
    }

    if (task.status !== 'inprogress') {
      return res.status(400).json({ message: 'Možeš dodavati aktivnosti samo na zadatke koji su u toku' });
    }

    const activity = await Activity.create({
      task: taskId,
      organization: req.organizationId,
      user: req.user._id,
      text,
      note: note || '',
      gps: gps ? { ...gps, timestamp: new Date() } : undefined,
    });

    await activity.populate('user', 'name');
    res.status(201).json(activity);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

// DELETE /api/activities/:id
router.delete('/:id', async (req, res) => {
  try {
    const activity = await Activity.findOneAndDelete({
      _id: req.params.id,
      organization: req.organizationId,
      user: req.user._id,
    });
    if (!activity) return res.status(404).json({ message: 'Aktivnost nije pronađena' });
    res.json({ message: 'Aktivnost obrisana' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

export default router;
