/**
 * Creates a BDUI experiment User account (role: user).
 *
 * Usage:
 *   cd fe-experiment/backend-for-ved
 *   node scripts/create-bdui-user.js
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/fea360';
const EMAIL = process.env.BDUI_USER_EMAIL || 'user@bdui.local';
const PASSWORD = process.env.BDUI_USER_PASSWORD || 'BduiUser2024!';

const accountSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    salt: { type: String },
    hash: { type: String },
    fullName: { type: String },
    roles: [{ type: String }],
    lang: { type: String, default: 'ru' },
    active: { type: Boolean, default: true },
    confirmed: { type: Boolean, default: true },
    blocked: { type: Boolean, default: false },
    phone: { type: String },
    requisites: { type: Array, default: [] },
    enablePostpay: { type: Boolean, default: false },
    isCorporateClient: { type: Boolean, default: false },
    verify: {
      count: { type: Number, default: 0 },
      lastDate: { type: Date },
    },
    createDate: { type: Date, default: Date.now },
    updateDate: { type: Date, default: Date.now },
  },
  { collection: 'accounts' },
);

accountSchema.methods.setPassword = function setPassword(password) {
  const saltBuffer = crypto.randomBytes(32);
  const salt = saltBuffer.toString('hex');
  const hashRaw = crypto.pbkdf2Sync(password, salt, 25000, 512, 'sha256');
  this.salt = salt;
  this.hash = hashRaw.toString('hex');
};

const Account = mongoose.model('BduiAccount', accountSchema, 'accounts');

async function main() {
  await mongoose.connect(MONGODB_URL);
  let account = await Account.findOne({ email: EMAIL });
  if (!account) {
    account = new Account({
      email: EMAIL,
      fullName: 'BDUI Experiment User',
      roles: ['user'],
      confirmed: true,
      active: true,
    });
  } else {
    account.roles = ['user'];
    account.confirmed = true;
    account.active = true;
    account.blocked = false;
  }
  account.setPassword(PASSWORD);
  await account.save();
  console.log(`BDUI user ready: ${EMAIL} / ${PASSWORD}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
