import express from 'express';
import Task from '../models/Task.js';
import Activity from '../models/Activity.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/reports/task/:taskId — generiši podatke za report
router.get('/task/:taskId', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.taskId, organization: req.organizationId })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name');

    if (!task) return res.status(404).json({ message: 'Zadatak nije pronađen' });

    const activities = await Activity.find({ task: task._id })
      .populate('user', 'name')
      .sort({ timestamp: 1 });

    // Strukturirani report
    const report = {
      generatedAt: new Date(),
      task: {
        title: task.title,
        description: task.description,
        location: task.location,
        priority: task.priority,
        status: task.status,
        scheduledDate: task.scheduledDate,
        timeStart: task.timeStart,
        timeEnd: task.timeEnd,
        completedAt: task.completedAt,
      },
      assignedTo: task.assignedTo,
      gpsCheckpoints: {
        accepted: task.gpsAccepted || null,
        arrival: task.gpsArrival || null,
        completed: task.gpsCompleted || null,
      },
      activities: activities.map(a => ({
        time: new Date(a.timestamp).toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' }),
        text: a.text,
        type: a.type,
        note: a.note,
        evidence: a.evidence,
        gps: a.gps,
        user: a.user?.name,
      })),
      summary: {
        totalActivities: activities.length,
        evidenceCount: activities.reduce((s, a) => s + (a.evidence?.length || 0), 0),
        duration: task.completedAt && task.createdAt
          ? Math.round((task.completedAt - task.createdAt) / 60000) + ' min'
          : null,
      },
    };

    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

// GET /api/reports/daily?date=2024-06-01 — dnevni izvještaj
router.get('/daily', async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);

    const filter = {
      organization: req.organizationId,
      scheduledDate: { $gte: start, $lte: end },
    };
    if (req.user.role === 'worker') filter.assignedTo = req.user._id;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name')
      .sort({ createdAt: 1 });

    res.json({
      date: date.toISOString().split('T')[0],
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      inprogress: tasks.filter(t => t.status === 'inprogress').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      tasks,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

// GET /api/reports/worker-stats?period=week|month|all — statistike po radniku (samo admin)
router.get('/worker-stats', requireAdmin, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const now = new Date();
    let startDate = null;
    if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
    }
    // period === 'all' → startDate ostaje null, bez filtera po datumu

    const match = { organization: req.organizationId };
    if (startDate) match.scheduledDate = { $gte: startDate };

    const stats = await Task.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$assignedTo',
          totalAssigned: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          durationSumMs: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$status', 'completed'] }, { $ne: ['$completedAt', null] }] },
                { $subtract: ['$completedAt', '$createdAt'] },
                0,
              ],
            },
          },
          durationCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$status', 'completed'] }, { $ne: ['$completedAt', null] }] },
                1, 0,
              ],
            },
          },
        },
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'worker' } },
      { $unwind: '$worker' },
      {
        $project: {
          _id: 0,
          workerId: '$_id',
          workerName: '$worker.name',
          totalAssigned: 1,
          completed: 1,
          rejected: 1,
          completionRate: {
            $cond: [
              { $eq: ['$totalAssigned', 0] }, 0,
              { $multiply: [{ $divide: ['$completed', '$totalAssigned'] }, 100] },
            ],
          },
          avgDurationMinutes: {
            $cond: [
              { $eq: ['$durationCount', 0] }, null,
              { $divide: [{ $divide: ['$durationSumMs', '$durationCount'] }, 60000] },
            ],
          },
        },
      },
      { $sort: { completionRate: -1 } },
    ]);

    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Greška pri dohvatanju statistike', error: err.message });
  }
});

export default router;
