import React from 'react';
import { Phone, Mail, ArrowRight } from 'lucide-react';
import Button from './Button';

export default {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    disabled: {
      control: { type: 'boolean' },
    },
    onClick: { action: 'clicked' },
  },
};

const Template = (args) => <Button {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: 'Получить консультацию',
  variant: 'primary',
};

export const Secondary = Template.bind({});
Secondary.args = {
  children: 'Узнать больше',
  variant: 'secondary',
};

export const Ghost = Template.bind({});
Ghost.args = {
  children: 'Подробнее',
  variant: 'ghost',
};

export const Danger = Template.bind({});
Danger.args = {
  children: 'Удалить',
  variant: 'danger',
};

export const WithIcon = Template.bind({});
WithIcon.args = {
  children: 'Связаться с нами',
  variant: 'primary',
  icon: <Phone size={16} />,
};

export const WithArrow = Template.bind({});
WithArrow.args = {
  children: 'Начать сейчас',
  variant: 'primary',
  icon: <ArrowRight size={16} />,
};

export const Small = Template.bind({});
Small.args = {
  children: 'Маленькая кнопка',
  size: 'small',
};

export const Large = Template.bind({});
Large.args = {
  children: 'Большая кнопка',
  size: 'large',
};

export const Disabled = Template.bind({});
Disabled.args = {
  children: 'Недоступно',
  disabled: true,
};

export const AllVariants = () => (
  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
    <Button variant="primary">Primary</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="danger">Danger</Button>
  </div>
);

export const AllSizes = () => (
  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
    <Button size="small">Small</Button>
    <Button size="medium">Medium</Button>
    <Button size="large">Large</Button>
  </div>
);
