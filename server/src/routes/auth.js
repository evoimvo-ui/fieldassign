import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import { authenticate } from '../middleware/auth.js';
import { registerSchema, changePasswordSchema } from '../validators/authValidators.js';

const router = express.Router();

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /api/auth/register — registracija organizacije + admin korisnika
router.post('/register', async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error.issues[0].message });
    }

    const { orgName, name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email već postoji' });
    }

    // Kreiraj organizaciju
    const slug = orgName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const organization = await Organization.create({ name: orgName, slug });

    // Kreiraj admin korisnika
    const user = await User.create({
      organization: organization._id,
      name,
      email,
      password,
      role: 'admin',
    });

    const token = generateToken(user._id);
    res.status(201).json({ token, user, organization });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email i lozinka su obavezni' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Pogrešan email ili lozinka' });
    }

    if (!user.active) {
      return res.status(403).json({ message: 'Vaš nalog je deaktiviran' });
    }

    user.lastSeen = new Date();
    await user.save();

    const token = generateToken(user._id);
    const organization = await Organization.findById(user.organization);

    res.json({ token, user, organization });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Korisnik nije pronađen' });

    const organization = await Organization.findById(user.organization);
    res.json({ user, organization });
  } catch {
    res.status(401).json({ message: 'Nevažeći token' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error.issues[0].message });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Trenutna lozinka nije ispravna' });
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: 'Lozinka uspješno promijenjena' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Interna greška servera' });
  }
});

export default router;
