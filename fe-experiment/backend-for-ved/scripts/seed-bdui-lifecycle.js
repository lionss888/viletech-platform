/**
 * Seeds BDUI lifecycle accounts (5 ВИ roles) + RF organizations, currencies,
 * counterparties (address/geo), HS codes, accepted agency contract + stub files.
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
const ORG_ID = new mongoose.Types.ObjectId('6a8dbd040000000000000001');
const USER_ACCOUNT_ID = new mongoose.Types.ObjectId('6a8dbd050000000000000001');
const MANAGER_STUB_FILE_ID = new mongoose.Types.ObjectId('6a8dbd060000000000000001');
const PROVIDER_ACCOUNT_ID = new mongoose.Types.ObjectId('6a8dbd070000000000000001');

/** E10 directory seeds — fixed ids for idempotent re-seed (not in BDUI_SEED_* lifecycle stubs). */
const ORG_ID_2 = new mongoose.Types.ObjectId('6a8dbd040000000000000002');
const COUNTERPARTY_FOREIGN_ID = new mongoose.Types.ObjectId('6a8dbd080000000000000001');
const COUNTERPARTY_RU_ID = new mongoose.Types.ObjectId('6a8dbd080000000000000002');
const ROOT_ACCOUNT_ID = new mongoose.Types.ObjectId('6a8dbd090000000000000001');

const ACCOUNTS = [
  {
    email: 'user@bdui.local',
    fullName: 'BDUI User',
    roles: ['user'],
    password: process.env.BDUI_USER_PASSWORD || 'BduiUser2024!',
    _id: USER_ACCOUNT_ID,
    enablePostpay: true,
  },
  { email: 'ico@bdui.local', fullName: 'BDUI Internal CO', roles: ['internal_compliance_officer'] },
  { email: 'eco@bdui.local', fullName: 'BDUI External CO', roles: ['compliance_officer'] },
  { email: 'manager@bdui.local', fullName: 'BDUI Manager', roles: ['manager'] },
  {
    email: 'provider@bdui.local',
    fullName: 'BDUI Provider',
    roles: ['provider'],
    _id: PROVIDER_ACCOUNT_ID,
  },
  {
    email: 'root@bdui.local',
    fullName: 'BDUI Root',
    roles: ['root'],
    password: process.env.BDUI_ROOT_PASSWORD || process.env.BDUI_LIFECYCLE_PASSWORD || 'BduiLifecycle2024!',
    _id: ROOT_ACCOUNT_ID,
  },
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
    legalAddress: { type: String },
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

const currencySchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, index: true },
    rate: { type: Number, required: true },
    active: { type: Boolean, default: true },
    direction: { type: String, default: 'no' },
    timestamp: { type: Number, required: true },
    source: { type: String, required: true },
    type: { type: String, required: true },
    createDate: { type: Date, default: Date.now },
    updateDate: { type: Date, default: Date.now },
  },
  { collection: 'currencies' },
);

const counterpartySchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true },
    country: { type: String, required: true },
    inn: { type: String },
    registrationNumber: { type: String },
    legalAddress: { type: String },
    type: { type: String, required: true },
    banks: { type: Array, default: [] },
    lastApprovalStatus: { type: String, default: 'approved' },
    lastApprovalDate: { type: Date },
    statusHistory: { type: Array, default: [] },
    formPayments: { type: Array, default: [] },
    isActive: { type: Boolean, default: true },
    createDate: { type: Date, default: Date.now },
    updateDate: { type: Date, default: Date.now },
  },
  { collection: 'counterparties' },
);

const Account = mongoose.model('BduiLifecycleAccount', accountSchema, 'accounts');
const Organization = mongoose.model('BduiLifecycleOrganization', organizationSchema, 'organizations');
const HsCode = mongoose.model('BduiLifecycleHsCode', hsCodeSchema, 'hs-codes');
const File = mongoose.model('BduiLifecycleFile', fileSchema, 'files');
const Agent = mongoose.model('BduiLifecycleAgent', agentSchema, 'agents');
const Contract = mongoose.model('BduiLifecycleContract', contractSchema, 'contracts');
const Currency = mongoose.model('BduiLifecycleCurrency', currencySchema, 'currencies');
const Counterparty = mongoose.model('BduiLifecycleCounterparty', counterpartySchema, 'counterparties');

const CURRENCY_SEEDS = [
  { symbol: 'rub', rate: 1, source: 'cbr', type: 'fiat' },
  { symbol: 'usd', rate: 92.5, source: 'cbr', type: 'fiat' },
  { symbol: 'eur', rate: 100.2, source: 'cbr', type: 'fiat' },
  { symbol: 'cny', rate: 12.8, source: 'cbr', type: 'fiat' },
  { symbol: 'usdt', rate: 92.4, source: 'open-exchange', type: 'stablecoin' },
];

const ORG_DIRECTORY = [
  {
    _id: ORG_ID,
    name: 'ООО BDUI Тест',
    inn: '7707083893',
    email: 'org@bdui.local',
    phone: '+74951234567',
    signerName: 'Иванов Иван Иванович',
    signerPosition: 'general_director',
    businessForm: 'ООО',
    legalAddress: '125009, г. Москва, ул. Тверская, д. 1',
    status: 'not_approved',
  },
  {
    _id: ORG_ID_2,
    name: 'ООО BDUI Экспорт',
    inn: '7707083894',
    email: 'export@bdui.local',
    phone: '+74951234568',
    signerName: 'Сидорова Анна Петровна',
    signerPosition: 'general_director',
    businessForm: 'ООО',
    legalAddress: '190000, г. Санкт-Петербург, Невский пр., д. 10',
    status: 'approved',
  },
];

async function upsertAccount(spec) {
  const password = spec.password || PASSWORD;
  let account = await Account.findOne({ email: spec.email });
  if (spec._id && account && account._id.toString() !== spec._id.toString()) {
    console.warn(
      `Realigning ${spec.email}: ${account._id} → ${spec._id} (delete+recreate for fixed BDUI seed id)`,
    );
    await Account.deleteOne({ _id: account._id });
    account = null;
  }
  if (!account && spec._id) {
    account = await Account.findById(spec._id);
  }
  if (!account) {
    account = new Account({
      ...(spec._id ? { _id: spec._id } : {}),
      email: spec.email,
      fullName: spec.fullName,
      roles: spec.roles,
      confirmed: true,
      active: true,
      phone: '+79990000000',
      enablePostpay: Boolean(spec.enablePostpay),
    });
  } else {
    account.fullName = spec.fullName;
    account.roles = spec.roles;
    account.confirmed = true;
    account.active = true;
    account.blocked = false;
    if (typeof spec.enablePostpay === 'boolean') {
      account.enablePostpay = spec.enablePostpay;
    }
  }
  account.setPassword(password);
  await account.save();
  return { account, password };
}

async function upsertOrganizations(userAccountId) {
  const saved = [];
  for (const spec of ORG_DIRECTORY) {
    let organization = await Organization.findById(spec._id);
    if (!organization) {
      organization = await Organization.findOne({ inn: spec.inn });
    }
    if (organization && organization._id.toString() !== spec._id.toString()) {
      console.warn(
        `Realigning org ${spec.inn}: ${organization._id} → ${spec._id} (delete+recreate for fixed BDUI seed id)`,
      );
      await Organization.deleteOne({ _id: organization._id });
      organization = null;
    }
    if (!organization) {
      organization = new Organization({
        _id: spec._id,
        name: spec.name,
        inn: spec.inn,
        email: spec.email,
        phone: spec.phone,
        signerName: spec.signerName,
        signerPosition: spec.signerPosition,
        type: 'user',
        businessForm: spec.businessForm,
        legalAddress: spec.legalAddress,
        account: userAccountId,
        status: spec.status,
        isActive: true,
      });
    } else {
      organization.account = userAccountId;
      organization.name = spec.name;
      organization.inn = spec.inn;
      organization.email = spec.email;
      organization.phone = spec.phone;
      organization.signerName = spec.signerName;
      organization.signerPosition = spec.signerPosition;
      organization.businessForm = spec.businessForm;
      organization.legalAddress = spec.legalAddress;
      if (spec._id.toString() === ORG_ID.toString() && organization.status === 'approved') {
        /* keep approved if manually promoted */
      } else if (spec._id.toString() === ORG_ID.toString() && organization.status !== 'approved') {
        organization.status = spec.status;
      } else {
        organization.status = spec.status;
      }
      organization.isActive = true;
      organization.isDeleted = false;
    }
    await organization.save();
    saved.push(organization);
  }
  return saved;
}

async function upsertCurrencies() {
  const timestamp = Math.floor(Date.now() / 1000);
  const saved = [];
  for (const spec of CURRENCY_SEEDS) {
    let currency = await Currency.findOne({ symbol: spec.symbol, source: spec.source });
    if (!currency) {
      currency = new Currency({
        symbol: spec.symbol,
        rate: spec.rate,
        active: true,
        direction: 'no',
        timestamp,
        source: spec.source,
        type: spec.type,
      });
    } else {
      currency.rate = spec.rate;
      currency.active = true;
      currency.direction = 'no';
      currency.timestamp = timestamp;
      currency.type = spec.type;
    }
    await currency.save();
    saved.push(currency);
  }
  return saved;
}

async function upsertCounterparties(userAccountId, managerAccountId) {
  const now = new Date();
  const specs = [
    {
      _id: COUNTERPARTY_FOREIGN_ID,
      name: 'Global Trade Ltd',
      country: 'CN',
      registrationNumber: 'CN-BDUI-001',
      legalAddress: '200120, Shanghai, Pudong, Century Ave 100',
      type: 'foreign',
      banks: [
        {
          uuid: 'bdui-bank-cn-001',
          bankName: 'Shanghai Test Bank',
          swiftCode: 'SHTTCNSH',
          bankCountry: 'CN',
          bankAddress: 'Shanghai, Pudong',
          accounts: [
            {
              uuid: 'bdui-acc-cn-usd',
              accountNumber: '4000001234567890',
              currency: 'usd',
              isPrimary: true,
            },
          ],
        },
      ],
    },
    {
      _id: COUNTERPARTY_RU_ID,
      name: 'ООО Контрагент BDUI',
      country: 'RU',
      inn: '7708123456',
      legalAddress: '119021, г. Москва, ул. Льва Толстого, д. 16',
      type: 'russian',
      banks: [
        {
          uuid: 'bdui-bank-ru-001',
          bankName: 'АО «BDUI Банк»',
          bankCountry: 'RU',
          bankAddress: 'г. Москва',
          accounts: [
            {
              uuid: 'bdui-acc-ru-rub',
              accountNumber: '40702810900000000099',
              currency: 'rub',
              isPrimary: true,
            },
          ],
        },
      ],
    },
  ];
  const saved = [];
  for (const spec of specs) {
    let counterparty = await Counterparty.findById(spec._id);
    if (!counterparty) {
      if (spec.type === 'russian' && spec.inn) {
        counterparty = await Counterparty.findOne({ createdBy: userAccountId, inn: spec.inn });
      }
      if (!counterparty && spec.type === 'foreign') {
        counterparty = await Counterparty.findOne({
          createdBy: userAccountId,
          name: spec.name,
          country: spec.country,
        });
      }
    }
    if (counterparty && counterparty._id.toString() !== spec._id.toString()) {
      await Counterparty.deleteOne({ _id: counterparty._id });
      counterparty = null;
    }
    if (!counterparty) {
      counterparty = new Counterparty({
        _id: spec._id,
        createdBy: userAccountId,
        name: spec.name,
        country: spec.country,
        inn: spec.inn,
        registrationNumber: spec.registrationNumber,
        legalAddress: spec.legalAddress,
        type: spec.type,
        banks: spec.banks,
        lastApprovalStatus: 'approved',
        lastApprovalDate: now,
        lastApprovedBy: managerAccountId,
        isActive: true,
      });
    } else {
      counterparty.createdBy = userAccountId;
      counterparty.name = spec.name;
      counterparty.country = spec.country;
      counterparty.inn = spec.inn;
      counterparty.registrationNumber = spec.registrationNumber;
      counterparty.legalAddress = spec.legalAddress;
      counterparty.type = spec.type;
      counterparty.banks = spec.banks;
      counterparty.lastApprovalStatus = 'approved';
      counterparty.lastApprovalDate = now;
      counterparty.lastApprovedBy = managerAccountId;
      counterparty.isActive = true;
    }
    await counterparty.save();
    saved.push(counterparty);
  }
  return saved;
}

async function upsertHsCodes() {
  const specs = [
    {
      code: '0101210000',
      description: 'BDUI seed HS code (live horses)',
      chapter: '01',
      section: '0101',
      type: 'good',
    },
    {
      code: '8471300000',
      description: 'BDUI seed HS code (portable computers)',
      chapter: '84',
      section: '8471',
      type: 'good',
    },
  ];
  const saved = [];
  for (const spec of specs) {
    let hsCode = await HsCode.findOne({ code: spec.code });
    if (!hsCode) {
      hsCode = new HsCode({
        code: spec.code,
        description: spec.description,
        chapter: spec.chapter,
        section: spec.section,
        type: spec.type,
        loyalty: 'ok',
        active: true,
      });
    } else {
      hsCode.active = true;
      hsCode.loyalty = 'ok';
      hsCode.description = spec.description;
    }
    await hsCode.save();
    saved.push(hsCode);
  }
  return saved;
}

async function upsertStubFile(fileId, ownerAccountId, originalName) {
  let file = await File.findById(fileId);
  if (!file) {
    file = new File({
      _id: fileId,
      account: ownerAccountId,
      originalName,
      mimeType: 'application/pdf',
      size: 128,
      private: true,
      salt: crypto.randomBytes(16).toString('hex'),
      path: `bdui/stub/${fileId}`,
    });
  } else {
    file.account = ownerAccountId;
    file.originalName = originalName;
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
          bankCountry: 'RU',
          bankAddress: 'г. Москва, ул. Банковская, д. 5',
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
  const manager = await Account.findOne({ email: 'manager@bdui.local' });
  const provider = await Account.findOne({ email: 'provider@bdui.local' });
  const organization = await upsertOrganizations(user._id);
  const primaryOrg = organization.find((item) => item._id.toString() === ORG_ID.toString()) ?? organization[0];
  const hsCodes = await upsertHsCodes();
  const currencies = await upsertCurrencies();
  const counterparties = await upsertCounterparties(user._id, manager._id);
  const stubFile = await upsertStubFile(STUB_FILE_ID, user._id, 'bdui-stub-order.pdf');
  const managerStub = await upsertStubFile(
    MANAGER_STUB_FILE_ID,
    manager._id,
    'bdui-manager-stub-contract.pdf',
  );
  const agent = await upsertAgent();
  const contract = await upsertContract(user._id, primaryOrg._id, agent._id, stubFile._id);
  console.log('\nBDUI lifecycle seed ready:\n');
  for (const row of results) {
    console.log(`  ${row.email} / ${row.password}  roles=${row.roles.join(',')}  id=${row.id}`);
  }
  console.log(`\n  Organizations (${organization.length}):`);
  for (const org of organization) {
    console.log(`    - ${org.name} inn=${org.inn} status=${org.status} id=${org._id}`);
    if (org.legalAddress) {
      console.log(`      address: ${org.legalAddress}`);
    }
  }
  console.log(`  User enablePostpay: ${user.enablePostpay}`);
  console.log(`  Currencies (${currencies.length} active): ${currencies.map((item) => item.symbol).join(', ')}`);
  console.log(`  Counterparties (${counterparties.length}):`);
  for (const cp of counterparties) {
    console.log(`    - ${cp.name} (${cp.country}) id=${cp._id}`);
  }
  console.log(`  HS codes (${hsCodes.length}): ${hsCodes.map((item) => item.code).join(', ')}`);
  console.log(`  Stub file (user): ${stubFile._id}`);
  console.log(`  Stub file (manager): ${managerStub._id}`);
  console.log(`  Agent: ${agent.organizationName} id=${agent._id}`);
  console.log(`  Contract: ${contract.number} status=${contract.status} id=${contract._id}`);
  console.log(`  Provider account id (for mgr_assign_provider): ${provider._id}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
