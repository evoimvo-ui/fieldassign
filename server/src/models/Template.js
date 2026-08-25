import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  location: { type: String, default: '' },
  timeStart: { type: String, default: '' },
  timeEnd: { type: String, default: '' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },

  recurrence: {
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
    },
    weekdays: [{ type: Number }],
    dayOfMonth: { type: Number },
  },

  startDate: { type: Date, required: true },
  endDate: { type: Date, default: null },

  status: {
    type: String,
    enum: ['active', 'paused'],
    default: 'active',
  },

  lastGeneratedDate: { type: Date, default: null },

}, { timestamps: true });

templateSchema.index({ organization: 1, status: 1 });
templateSchema.index({ assignedTo: 1 });
templateSchema.index({ status: 1, endDate: 1 });

export default mongoose.model('Template', templateSchema);
