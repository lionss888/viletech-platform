import React from 'react';
import { Phone, User, ArrowRight } from 'lucide-react';
import Navigation from './Navigation';

export default {
  title: 'Components/Navigation',
  component: Navigation,
  parameters: {
    layout: 'fullscreen',
  },
};

const Template = (args) => <Navigation {...args} />;

export const Default = Template.bind({});
Default.args = {
  logo: 'Monexa',
  menuItems: [
    { label: 'Комплаенс', href: '#compliance' },
    { label: 'Консалтинг', href: '#consulting' },
    { 
      label: 'Услуги', 
      href: '#services',
      dropdown: [
        { label: 'Платежи', href: '#payments' },
        { label: 'Логистика', href: '#logistics' },
        { label: 'Инвестиции', href: '#investments' },
        { label: 'Обмен', href: '#exchange' },
      ]
    },
    { label: 'О нас', href: '#about' },
  ],
  actions: [
    {
      text: 'Получить консультацию',
      variant: 'primary',
      onClick: () => alert('Получить консультацию'),
      icon: <Phone size={16} />,
    },
  ],
};

export const WithMultipleActions = Template.bind({});
WithMultipleActions.args = {
  logo: 'Monexa',
  menuItems: [
    { label: 'Главная', href: '#home', active: true },
    { label: 'Услуги', href: '#services' },
    { label: 'О нас', href: '#about' },
    { label: 'Контакты', href: '#contacts' },
  ],
  actions: [
    {
      text: 'Войти',
      variant: 'ghost',
      onClick: () => alert('Войти'),
      icon: <User size={16} />,
    },
    {
      text: 'Регистрация',
      variant: 'primary',
      onClick: () => alert('Регистрация'),
      icon: <ArrowRight size={16} />,
    },
  ],
};

export const Scrolled = Template.bind({});
Scrolled.args = {
  logo: 'Monexa',
  scrolled: true,
  menuItems: [
    { label: 'Комплаенс', href: '#compliance' },
    { label: 'Консалтинг', href: '#consulting' },
    { label: 'Платежи', href: '#payments' },
    { label: 'Логистика', href: '#logistics' },
  ],
  actions: [
    {
      text: 'Связаться',
      variant: 'primary',
      onClick: () => alert('Связаться'),
    },
  ],
};

export const ComplexMenu = Template.bind({});
ComplexMenu.args = {
  logo: 'Monexa',
  menuItems: [
    { label: 'Главная', href: '#home' },
    { 
      label: 'Услуги', 
      href: '#services',
      dropdown: [
        { label: 'Платежи и переводы', href: '#payments' },
        { label: 'Международный консалтинг', href: '#consulting' },
        { label: 'Санкционный комплаенс', href: '#compliance' },
        { label: 'Обмен криптовалюты', href: '#crypto' },
        { label: 'Инвестиции', href: '#investments' },
        { label: 'Логистика', href: '#logistics' },
      ]
    },
    { 
      label: 'Решения', 
      href: '#solutions',
      dropdown: [
        { label: 'Для бизнеса', href: '#business' },
        { label: 'Для частных клиентов', href: '#individual' },
        { label: 'Для стартапов', href: '#startups' },
        { label: 'Для корпораций', href: '#corporations' },
      ]
    },
    { label: 'О компании', href: '#about' },
    { label: 'Контакты', href: '#contacts' },
  ],
  actions: [
    {
      text: 'Личный кабинет',
      variant: 'ghost',
      onClick: () => alert('Личный кабинет'),
      icon: <User size={16} />,
    },
    {
      text: 'Получить консультацию',
      variant: 'primary',
      onClick: () => alert('Получить консультацию'),
      icon: <Phone size={16} />,
    },
  ],
};

export const Minimal = Template.bind({});
Minimal.args = {
  logo: 'Monexa',
  menuItems: [
    { label: 'Главная', href: '#home' },
    { label: 'О нас', href: '#about' },
  ],
  actions: [
    {
      text: 'Связаться',
      variant: 'primary',
      onClick: () => alert('Связаться'),
    },
  ],
};
