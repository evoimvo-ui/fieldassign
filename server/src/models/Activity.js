import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  text: { type: String, required: true, trim: true, default: '' },
  type: {
    type: String,
    enum: ['accepted', 'inprogress', 'completed', 'rejected', 'custom'],
    default: 'custom',
  },
  note: { type: String, default: '' },

  // Evidence (fajlovi se čuvaju na cloud storage — URL-ovi ovdje)
  evidence: [{
    type: { type: String, enum: ['photo', 'video', 'note'], default: 'note' },
    url: { type: String },
    caption: { type: String, default: '' },
  }],

  // GPS u trenutku aktivnosti
  gps: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    timestamp: { type: Date, default: null },
  },

  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

activitySchema.index({ task: 1, timestamp: 1 });
activitySchema.index({ organization: 1, timestamp: -1 });

export default mongoose.model('Activity', activitySchema);
