import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true, trim: true },
  location: { type: String, default: '' },
  contactPerson: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  notes: { type: String, default: '' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

clientSchema.index({ organization: 1, name: 1 });

export default mongoose.model('Client', clientSchema);
