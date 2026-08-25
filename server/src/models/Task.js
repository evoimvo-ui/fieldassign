import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  location: { type: String, default: '' },
  timeStart: { type: String, default: '' },  // "12:00"
  timeEnd: { type: String, default: '' },    // "13:00"
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },

  status: {
    type: String,
    enum: ['pending', 'accepted', 'inprogress', 'completed', 'rejected'],
    default: 'pending',
  },

  // GPS check-in points
  gpsAccepted: { lat: Number, lng: Number, timestamp: Date },
  gpsArrival: { lat: Number, lng: Number, timestamp: Date },
  gpsCompleted: { lat: Number, lng: Number, timestamp: Date },

  // Recurring (za buduće nadogradnje)
  isRecurring: { type: Boolean, default: false },
  recurringPattern: { type: String, default: null }, // 'daily', 'weekly'

  completedAt: { type: Date, default: null },
  scheduledDate: { type: Date, default: Date.now },

  sourceTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', default: null },

}, { timestamps: true });

taskSchema.index({ organization: 1, status: 1 });
taskSchema.index({ assignedTo: 1, scheduledDate: 1 });

taskSchema.index(
  { sourceTemplate: 1, scheduledDate: 1 },
  { unique: true, partialFilterExpression: { sourceTemplate: { $type: 'objectId' } } }
);

export default mongoose.model('Task', taskSchema);
