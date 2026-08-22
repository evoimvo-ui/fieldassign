import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  
  // Paddle subscription
  paddleCustomerId: { type: String, default: null },
  paddleSubscriptionId: { type: String, default: null },
  plan: { type: String, enum: ['trial', 'starter', 'professional', 'business'], default: 'trial' },
  planStatus: { type: String, enum: ['active', 'past_due', 'canceled', 'trialing'], default: 'trialing' },
  trialEndsAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  },
  planExpiresAt: { type: Date, default: null },
  
  // Limits per plan
  maxUsers: { type: Number, default: 999 },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Organization', organizationSchema);
