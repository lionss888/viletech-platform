/**
 * Seeds BDUI lifecycle accounts (5 ВИ roles) + RF organization for User.
 *
 * Usage:
 *   cd fe-experiment/backend-for-ved
 *   node scripts/seed-bdui-lifecycle.js
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/fea360';
const PASSWORD = process.env.BDUI_LIFECYCLE_PASSWORD || 'BduiLifecycle2024!';

const ACCOUNTS = [
  { email: 'user@bdui.local', fullName: 'BDUI User', roles: ['user'], password: process.env.BDUI_USER_PASSWORD || 'BduiUser2024!' },
  { email: 'ico@bdui.local', fullName: 'BDUI Internal CO', roles: ['internal_compliance_officer'] },
  { email: 'eco@bdui.local', fullName: 'BDUI External CO', roles: ['compliance_officer'] },
  { email: 'manager@bdui.local', fullName: 'BDUI Manager', roles: ['manager'] },
  { email: 'provider@bdui.local', fullName: 'BDUI Provider', roles: ['provider'] },
];

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

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    inn: { type: String },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    signerName: { type: String, required: true },
    signerPosition: { type: String, required: true },
    type: { type: String, required: true, default: 'user' },
    businessForm: { type: String, required: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    subaccounts: { type: Array, default: [] },
    status: { type: String, required: true, default: 'not_approved' },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createDate: { type: Date, default: Date.now },
    updateDate: { type: Date, default: Date.now },
  },
  { collection: 'organizations' },
);

const Account = mongoose.model('BduiLifecycleAccount', accountSchema, 'accounts');
const Organization = mongoose.model('BduiLifecycleOrganization', organizationSchema, 'organizations');

async function upsertAccount(spec) {
  const password = spec.password || PASSWORD;
  let account = await Account.findOne({ email: spec.email });
  if (!account) {
    account = new Account({
      email: spec.email,
      fullName: spec.fullName,
      roles: spec.roles,
      confirmed: true,
      active: true,
      phone: '+79990000000',
    });
  } else {
    account.fullName = spec.fullName;
    account.roles = spec.roles;
    account.confirmed = true;
    account.active = true;
    account.blocked = false;
  }
  account.setPassword(password);
  await account.save();
  return { account, password };
}

async function upsertOrganization(userAccountId) {
  const inn = '7707083893';
  let organization = await Organization.findOne({ inn, account: userAccountId });
  if (!organization) {
    organization = new Organization({
      name: 'ООО BDUI Тест',
      inn,
      email: 'org@bdui.local',
      phone: '+74951234567',
      signerName: 'Иванов Иван Иванович',
      signerPosition: 'general_director',
      type: 'user',
      businessForm: 'ООО',
      account: userAccountId,
      status: 'not_approved',
      isActive: true,
    });
  } else {
    organization.status = 'not_approved';
    organization.isActive = true;
    organization.isDeleted = false;
  }
  await organization.save();
  return organization;
}

async function main() {
  await mongoose.connect(MONGODB_URL);
  console.log('Connected:', MONGODB_URL);
  const results = [];
  for (const spec of ACCOUNTS) {
    const { account, password } = await upsertAccount(spec);
    results.push({ email: account.email, roles: account.roles, password });
  }
  const user = await Account.findOne({ email: 'user@bdui.local' });
  const organization = await upsertOrganization(user._id);
  console.log('\nBDUI lifecycle seed ready:\n');
  for (const row of results) {
    console.log(`  ${row.email} / ${row.password}  roles=${row.roles.join(',')}`);
  }
  console.log(`\n  Organization: ${organization.name} inn=${organization.inn} status=${organization.status} id=${organization._id}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
