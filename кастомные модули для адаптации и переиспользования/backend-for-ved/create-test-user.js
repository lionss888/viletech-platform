/**
 * Скрипт для создания тестового пользователя
 * Запуск: node create-test-user.js
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

// Подключение к MongoDB
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/fea360';

// Схема Account (упрощенная версия)
const accountSchema = new mongoose.Schema({
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
    lastDate: { type: Date }
  },
  createDate: { type: Date, default: Date.now },
  updateDate: { type: Date, default: Date.now },
}, { collection: 'accounts' });

// Метод для установки пароля (как в account.schema.ts)
accountSchema.methods.setPassword = function(password) {
  if (!password) {
    throw new Error('Missing password');
  }
  const saltBuffer = crypto.randomBytes(32);
  const salt = saltBuffer.toString('hex');
  const hashRaw = crypto.pbkdf2Sync(password, salt, 25000, 512, 'sha256');
  this.salt = salt;
  this.hash = hashRaw.toString('hex');
};

const Account = mongoose.model('Account', accountSchema, 'accounts');

async function createUser() {
  try {
    console.log('Подключение к MongoDB...');
    await mongoose.connect(MONGODB_URL);
    console.log('✓ Подключено к MongoDB');

    const email = 'admin@vili.local';
    const password = 'ViliAdmin2024!'; // Минимум 10 символов
    const fullName = 'Test Admin User';
    const roles = ['root']; // ROOT - самая привилегированная роль в системе

    // Проверяем, существует ли пользователь
    const existingUser = await Account.findOne({ email });
    if (existingUser) {
      console.log(`⚠ Пользователь с email ${email} уже существует`);
      console.log('Обновляю пароль...');
      existingUser.setPassword(password);
      existingUser.fullName = fullName;
      existingUser.roles = roles;
      existingUser.active = true;
      existingUser.confirmed = true;
      existingUser.updateDate = new Date();
      await existingUser.save();
      console.log('✓ Пароль обновлен');
      console.log(`✓ Пользователь: ${email}`);
      console.log(`✓ Пароль: ${password}`);
      await mongoose.disconnect();
      return;
    }

    // Создаем нового пользователя
    console.log('Создание пользователя...');
    const account = new Account({
      email,
      fullName,
      roles,
      lang: 'ru',
      active: true,
      confirmed: true,
    });

    account.setPassword(password);
    await account.save();

    console.log('✓ Пользователь успешно создан!');
    console.log(`✓ Email: ${email}`);
    console.log(`✓ Пароль: ${password}`);
    console.log(`✓ Роли: ${roles.join(', ')}`);

    await mongoose.disconnect();
    console.log('✓ Отключено от MongoDB');
  } catch (error) {
    console.error('✗ Ошибка:', error.message);
    if (error.code === 11000) {
      console.error('Пользователь с таким email уже существует');
    }
    process.exit(1);
  }
}

createUser();
