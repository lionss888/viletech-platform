/**
 * Seeds BDUI lifecycle accounts (5 ВИ roles) + RF organization, HS code,
 * accepted agency contract + stub file for Manager order path (P4).
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

/** Fixed ObjectIds — mirrored in bdui.constants.ts (BDUI_SEED_*). */
const STUB_FILE_ID = new mongoose.Types.ObjectId('6a8dbd010000000000000001');
const AGENT_ID = new mongoose.Types.ObjectId('6a8dbd020000000000000001');
const CONTRACT_ID = new mongoose.Types.ObjectId('6a8dbd030000000000000001');

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

const hsCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    chapter: { type: String },
    section: { type: String },
    type: { type: String },
    loyalty: { type: String, required: true },
    active: { type: Boolean, default: true },
    createDate: { type: Date, default: Date.now },
    updateDate: { type: Date, default: Date.now },
  },
  { collection: 'hs-codes' },
);

const fileSchema = new mongoose.Schema(
  {
    account: { type: mongoose.Schema.Types.ObjectId },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    salt: { type: String },
    path: { type: String },
    size: { type: Number, required: true },
    private: { type: Boolean, default: true },
    createDate: { type: Date, default: Date.now },
    updateDate: { type: Date, default: Date.now },
  },
  { collection: 'files' },
);

const agentSchema = new mongoose.Schema(
  {
    organizationName: { type: String, required: true },
    inn: { type: String },
    email: { type: String },
    phone: { type: String },
    requisites: { type: Array, default: [] },
    cryptoRequisites: { type: Array, default: [] },
    director: { type: Object, required: true },
    createDate: { type: Date, default: Date.now },
    updateDate: { type: Date, default: Date.now },
  },
  { collection: 'agents' },
);

const contractSchema = new mongoose.Schema(
  {
    account: { type: mongoose.Schema.Types.ObjectId },
    organization: { type: mongoose.Schema.Types.ObjectId },
    agent: { type: mongoose.Schema.Types.ObjectId },
    isTemplate: { type: Boolean, default: false },
    status: { type: String, default: 'created' },
    file: { type: mongoose.Schema.Types.ObjectId, required: true },
    date: { type: Date },
    number: { type: String },
    createDate: { type: Date, default: Date.now },
    updateDate: { type: Date, default: Date.now },
  },
  { collection: 'contracts' },
);

const Account = mongoose.model('BduiLifecycleAccount', accountSchema, 'accounts');
const Organization = mongoose.model('BduiLifecycleOrganization', organizationSchema, 'organizations');
const HsCode = mongoose.model('BduiLifecycleHsCode', hsCodeSchema, 'hs-codes');
const File = mongoose.model('BduiLifecycleFile', fileSchema, 'files');
const Agent = mongoose.model('BduiLifecycleAgent', agentSchema, 'agents');
const Contract = mongoose.model('BduiLifecycleContract', contractSchema, 'contracts');

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
    if (organization.status !== 'approved') {
      organization.status = 'not_approved';
    }
    organization.isActive = true;
    organization.isDeleted = false;
  }
  await organization.save();
  return organization;
}

async function upsertHsCode() {
  const code = '0101210000';
  let hsCode = await HsCode.findOne({ code });
  if (!hsCode) {
    hsCode = new HsCode({
      code,
      description: 'BDUI seed HS code (live horses)',
      chapter: '01',
      section: '0101',
      type: 'good',
      loyalty: 'ok',
      active: true,
    });
  } else {
    hsCode.active = true;
    hsCode.loyalty = 'ok';
    hsCode.description = hsCode.description || 'BDUI seed HS code';
  }
  await hsCode.save();
  return hsCode;
}

async function upsertStubFile(userAccountId) {
  let file = await File.findById(STUB_FILE_ID);
  if (!file) {
    file = new File({
      _id: STUB_FILE_ID,
      account: userAccountId,
      originalName: 'bdui-stub-order.pdf',
      mimeType: 'application/pdf',
      size: 128,
      private: true,
      salt: crypto.randomBytes(16).toString('hex'),
      path: `bdui/stub/${STUB_FILE_ID}`,
    });
  } else {
    file.account = userAccountId;
    file.originalName = 'bdui-stub-order.pdf';
    file.mimeType = 'application/pdf';
    file.private = true;
  }
  await file.save();
  return file;
}

async function upsertAgent() {
  let agent = await Agent.findById(AGENT_ID);
  if (!agent) {
    agent = new Agent({
      _id: AGENT_ID,
      organizationName: 'BDUI Agent LLC',
      inn: '7700000000',
      email: 'agent@bdui.local',
      phone: '+74950000000',
      requisites: [
        {
          bankName: 'BDUI Test Bank',
          accountNumber: '40702810100000000001',
          bik: '044525225',
          corrNumber: '30101810400000000225',
        },
      ],
      cryptoRequisites: [],
      director: { name: 'Петров Пётр Петрович' },
    });
  } else {
    agent.organizationName = 'BDUI Agent LLC';
    agent.director = { name: 'Петров Пётр Петрович' };
  }
  await agent.save();
  return agent;
}

async function upsertContract(userAccountId, organizationId, agentId, fileId) {
  let contract = await Contract.findById(CONTRACT_ID);
  if (!contract) {
    contract = new Contract({
      _id: CONTRACT_ID,
      account: userAccountId,
      organization: organizationId,
      agent: agentId,
      isTemplate: false,
      status: 'accepted',
      file: fileId,
      date: new Date(),
      number: 'BDUI-AG-001',
    });
  } else {
    contract.account = userAccountId;
    contract.organization = organizationId;
    contract.agent = agentId;
    contract.status = 'accepted';
    contract.file = fileId;
    contract.isTemplate = false;
  }
  await contract.save();
  return contract;
}

async function main() {
  await mongoose.connect(MONGODB_URL);
  console.log('Connected:', MONGODB_URL);
  const results = [];
  for (const spec of ACCOUNTS) {
    const { account, password } = await upsertAccount(spec);
    results.push({ email: account.email, roles: account.roles, password, id: account._id.toString() });
  }
  const user = await Account.findOne({ email: 'user@bdui.local' });
  const provider = await Account.findOne({ email: 'provider@bdui.local' });
  const organization = await upsertOrganization(user._id);
  const hsCode = await upsertHsCode();
  const stubFile = await upsertStubFile(user._id);
  const agent = await upsertAgent();
  const contract = await upsertContract(user._id, organization._id, agent._id, stubFile._id);
  console.log('\nBDUI lifecycle seed ready:\n');
  for (const row of results) {
    console.log(`  ${row.email} / ${row.password}  roles=${row.roles.join(',')}  id=${row.id}`);
  }
  console.log(`\n  Organization: ${organization.name} inn=${organization.inn} status=${organization.status} id=${organization._id}`);
  console.log(`  HS code: ${hsCode.code} active=${hsCode.active} loyalty=${hsCode.loyalty}`);
  console.log(`  Stub file: ${stubFile._id}`);
  console.log(`  Agent: ${agent.organizationName} id=${agent._id}`);
  console.log(`  Contract: ${contract.number} status=${contract.status} id=${contract._id}`);
  console.log(`  Provider account id (for mgr_assign_provider): ${provider._id}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
