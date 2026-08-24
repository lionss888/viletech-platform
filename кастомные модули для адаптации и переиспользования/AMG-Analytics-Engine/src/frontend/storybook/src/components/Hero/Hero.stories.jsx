import React from 'react';
import { ArrowRight, Phone, Globe, DollarSign } from 'lucide-react';
import Hero from './Hero';

export default {
  title: 'Components/Hero',
  component: Hero,
  parameters: {
    layout: 'fullscreen',
  },
};

const Template = (args) => <Hero {...args} />;

export const Default = Template.bind({});
Default.args = {
  title: 'Забудь про ВЭД. Займись бизнесом',
  subtitle: 'Инфраструктура для ВЭД: платежи, логистика, консалтинг. Работаем с юрлицами и ИП любого масштаба — от стартапов до корпораций.',
  primaryAction: {
    text: 'Получить консультацию',
    onClick: () => alert('Получить консультацию'),
    icon: <Phone size={16} />,
  },
  secondaryAction: {
    text: 'Узнать больше',
    onClick: () => alert('Узнать больше'),
    icon: <ArrowRight size={16} />,
  },
  stats: [
    { number: '180+', label: 'стран' },
    { number: '24/7', label: 'поддержка' },
    { number: '99%', label: 'успешность' },
  ],
  visualTitle: 'Monexa',
  visualText: 'Платежи, логистика, консалтинг',
  visualIcon: <Globe size={48} />,
};

export const Payments = Template.bind({});
Payments.args = {
  title: 'Платежи и переводы',
  subtitle: 'Переводите и получайте средства по всему миру — быстро, легально и в нужной валюте.',
  primaryAction: {
    text: 'Подключиться',
    onClick: () => alert('Подключиться'),
    icon: <DollarSign size={16} />,
  },
  secondaryAction: {
    text: 'Узнать о тарифах',
    onClick: () => alert('Узнать о тарифах'),
  },
  stats: [
    { number: '180+', label: 'стран' },
    { number: '50+', label: 'валют' },
    { number: '<1мин', label: 'перевод' },
  ],
  visualTitle: 'Надёжные маршруты',
  visualText: 'Система автоматически выбирает оптимальный путь для перевода',
  visualIcon: <DollarSign size={48} />,
};

export const Consulting = Template.bind({});
Consulting.args = {
  title: 'Международный консалтинг',
  subtitle: 'Сопровождаем выход на зарубежные рынки под ключ — для тех, кто строит бизнес и управляет капиталом за границей.',
  primaryAction: {
    text: 'Консультация для бизнеса',
    onClick: () => alert('Консультация для бизнеса'),
  },
  secondaryAction: {
    text: 'Консультация для частных клиентов',
    onClick: () => alert('Консультация для частных клиентов'),
  },
  stats: [
    { number: '10+', label: 'лет опыта' },
    { number: '1000+', label: 'клиентов' },
    { number: '50+', label: 'юрисдикций' },
  ],
  visualTitle: 'Полное сопровождение',
  visualText: 'От регистрации до открытия счетов',
  visualIcon: <Globe size={48} />,
};

export const Compliance = Template.bind({});
Compliance.args = {
  title: 'Санкционный комплаенс',
  subtitle: 'Проверим вашего контрагента за вас — покажем риски по международным спискам, экспортно-импортные потоки и страны поставок.',
  primaryAction: {
    text: 'Проверить контрагента',
    onClick: () => alert('Проверить контрагента'),
  },
  stats: [
    { number: '2ч', label: 'проверка' },
    { number: '100%', label: 'точность' },
    { number: '24/7', label: 'мониторинг' },
  ],
  visualTitle: 'Безопасность',
  visualText: 'Избегайте блокировок и штрафов',
  visualIcon: <Globe size={48} />,
};

export const Minimal = Template.bind({});
Minimal.args = {
  title: 'Начните с простого шага',
  subtitle: 'Введите контакты — мы расскажем, что дальше',
  primaryAction: {
    text: 'Отправить',
    onClick: () => alert('Отправить'),
  },
};
