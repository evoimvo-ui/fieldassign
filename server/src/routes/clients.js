import express from 'express';
import Client from '../models/Client.js';
import Task from '../models/Task.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/clients — svi klijenti organizacije (samo admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const clients = await Client.find({ organization: req.organizationId }).sort({ name: 1 });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: 'Greška pri dohvatanju klijenata', error: err.message });
  }
});

// POST /api/clients — kreiraj klijenta (samo admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, location, contactPerson, phone, email, notes } = req.body;
    if (!name) return res.status(400).json({ message: 'Naziv klijenta je obavezan' });

    const client = await Client.create({
      organization: req.organizationId,
      name, location, contactPerson, phone, email, notes,
    });
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ message: 'Greška pri kreiranju klijenta', error: err.message });
  }
});

// PUT /api/clients/:id — uredi klijenta (samo admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, organization: req.organizationId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!client) return res.status(404).json({ message: 'Klijent nije pronađen' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: 'Greška pri uređivanju klijenta', error: err.message });
  }
});

// PATCH /api/clients/:id/toggle — aktiviraj/deaktiviraj (samo admin)
// Namjerno NEMA hard-delete rute — zadaci referenciraju klijenta preko ObjectId-a,
// brisanje bi ostavilo "orphan" reference. Deaktivacija je sigurnija.
router.patch('/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, organization: req.organizationId });
    if (!client) return res.status(404).json({ message: 'Klijent nije pronađen' });
    client.active = !client.active;
    await client.save();
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: 'Greška', error: err.message });
  }
});

// GET /api/clients/:id/tasks — historija zadataka za klijenta (samo admin)
router.get('/:id/tasks', requireAdmin, async (req, res) => {
  try {
    const tasks = await Task.find({ client: req.params.id, organization: req.organizationId })
      .populate('assignedTo', 'name')
      .sort({ scheduledDate: -1 })
      .limit(50);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Greška', error: err.message });
  }
});

export default router;
