import express from 'express';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import { requireAdmin } from '../middleware/auth.js';
import { generateTemporaryPassword } from '../utils/passwordGenerator.js';
import { sendWorkerCredentialsEmail } from '../services/emailService.js';

const router = express.Router();

// GET /api/users — svi radnici u organizaciji (samo admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ organization: req.organizationId }).sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

// POST /api/users — dodaj radnika (samo admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, email, role } = req.body;

    const org = await Organization.findById(req.organizationId);
    const currentCount = await User.countDocuments({ organization: req.organizationId, active: true });

    if (currentCount >= org.maxUsers) {
      return res.status(402).json({
        message: 'Dostignut limit korisnika za vaš plan',
        code: 'USER_LIMIT_REACHED',
      });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email već postoji' });

    const tempPassword = generateTemporaryPassword();

    const user = await User.create({
      organization: req.organizationId,
      name, 
      email, 
      password: tempPassword,
      role: role || 'worker',
      mustChangePassword: true,
      emailVerified: true
    });

    res.status(201).json({
      ...user.toObject(),
      generatedPassword: tempPassword
    });

    sendWorkerCredentialsEmail(
      user.toObject(),
      tempPassword,
      org ? org.toObject() : null,
      req.language || 'bs'
    ).catch(() => {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

// PATCH /api/users/:id/toggle — aktiviraj/deaktiviraj (samo admin)
router.patch('/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, organization: req.organizationId });
    if (!user) return res.status(404).json({ message: 'Korisnik nije pronađen' });

    user.active = !user.active;
    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

export default router;
