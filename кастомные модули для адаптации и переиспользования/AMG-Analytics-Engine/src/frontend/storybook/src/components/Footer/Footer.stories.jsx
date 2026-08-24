import React from 'react';
import Footer from './Footer';

export default {
  title: 'Components/Footer',
  component: Footer,
  parameters: {
    layout: 'fullscreen',
  },
};

const Template = (args) => <Footer {...args} />;

export const Default = Template.bind({});
Default.args = {
  companyName: 'Monexa',
  description: 'Инфраструктура для ВЭД: платежи, логистика, консалтинг. Работаем с юрлицами и ИП любого масштаба — от стартапов до корпораций.',
  services: [
    { label: 'Платежи и переводы', href: '#payments' },
    { label: 'Международный консалтинг', href: '#consulting' },
    { label: 'Санкционный комплаенс', href: '#compliance' },
    { label: 'Обмен криптовалюты', href: '#crypto' },
    { label: 'Инвестиции', href: '#investments' },
    { label: 'Логистика', href: '#logistics' },
  ],
  company: [
    { label: 'О компании', href: '#about' },
    { label: 'Команда', href: '#team' },
    { label: 'Карьера', href: '#careers' },
    { label: 'Новости', href: '#news' },
    { label: 'Блог', href: '#blog' },
  ],
  support: [
    { label: 'Помощь', href: '#help' },
    { label: 'Документация', href: '#docs' },
    { label: 'API', href: '#api' },
    { label: 'Статус сервисов', href: '#status' },
  ],
  contact: {
    email: 'info@monexa.pro',
    phone: '+7 (999) 123-45-67',
    address: 'Москва, ул. Примерная, 123',
  },
  social: {
    twitter: 'https://twitter.com/monexa',
    linkedin: 'https://linkedin.com/company/monexa',
    facebook: 'https://facebook.com/monexa',
  },
  newsletter: true,
};

export const Minimal = Template.bind({});
Minimal.args = {
  companyName: 'Monexa',
  description: 'Инфраструктура для ВЭД.',
  services: [
    { label: 'Платежи', href: '#payments' },
    { label: 'Консалтинг', href: '#consulting' },
  ],
  company: [
    { label: 'О нас', href: '#about' },
  ],
  support: [
    { label: 'Поддержка', href: '#support' },
  ],
  newsletter: false,
};

export const WithoutNewsletter = Template.bind({});
WithoutNewsletter.args = {
  ...Default.args,
  newsletter: false,
};

export const WithoutSocial = Template.bind({});
WithoutSocial.args = {
  ...Default.args,
  social: {},
};

export const CustomCompany = Template.bind({});
CustomCompany.args = {
  companyName: 'AMG Banking',
  description: 'Современная банковская система для управления финансами и аналитики.',
  services: [
    { label: 'Банковские операции', href: '#banking' },
    { label: 'Аналитика', href: '#analytics' },
    { label: 'Отчетность', href: '#reports' },
    { label: 'API интеграции', href: '#api' },
  ],
  company: [
    { label: 'О системе', href: '#about' },
    { label: 'Документация', href: '#docs' },
    { label: 'Обновления', href: '#updates' },
  ],
  support: [
    { label: 'Техподдержка', href: '#support' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Контакты', href: '#contacts' },
  ],
  contact: {
    email: 'support@amg-banking.com',
    phone: '+7 (800) 555-35-35',
  },
  social: {
    linkedin: 'https://linkedin.com/company/amg-banking',
  },
  newsletter: true,
};
