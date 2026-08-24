import React from 'react';
import { ArrowRight, DollarSign, Globe, Shield } from 'lucide-react';
import Card from './Card';
import Button from '../Button/Button';

export default {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['elevated', 'outlined', 'glass'],
    },
    compact: {
      control: { type: 'boolean' },
    },
    onClick: { action: 'clicked' },
  },
};

const Template = (args) => <Card {...args} />;

export const Default = Template.bind({});
Default.args = {
  title: 'Платежи и переводы',
  subtitle: 'Переводите и получайте средства по всему миру',
  children: 'Быстро, легально и в нужной валюте. Система автоматически выбирает оптимальный путь для перевода.',
};

export const WithImage = Template.bind({});
WithImage.args = {
  title: 'Международные платежи',
  subtitle: '180+ стран покрытия',
  image: <DollarSign />,
  children: 'Надёжные платёжные маршруты с автоматическим выбором оптимального пути для перевода.',
};

export const WithFooter = Template.bind({});
WithFooter.args = {
  title: 'Санкционный комплаенс',
  subtitle: 'Проверим вашего контрагента за вас',
  image: <Shield />,
  children: 'Покажем риски по международным спискам, экспортно-импортные потоки и страны поставок.',
  footer: (
    <>
      <span style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>От 2 часов</span>
      <Button size="small" icon={<ArrowRight size={14} />}>
        Проверить
      </Button>
    </>
  ),
};

export const Outlined = Template.bind({});
Outlined.args = {
  title: 'Консалтинг',
  subtitle: 'Международный консалтинг с полным сопровождением',
  variant: 'outlined',
  children: 'Для тех, кто строит бизнес и управляет капиталом за границей.',
};

export const Compact = Template.bind({});
Compact.args = {
  title: 'Логистика',
  subtitle: 'Оплата, доставка, документы, таможня',
  image: <Globe />,
  compact: true,
  children: 'Мы берём всё на себя — вы получаете результат.',
};

export const Glass = Template.bind({});
Glass.args = {
  title: 'Инвестиции',
  subtitle: 'Платформа для глобальных вложений',
  variant: 'glass',
  children: 'Акции, крипта, стратегии. Всё в одном приложении.',
};

export const Interactive = Template.bind({});
Interactive.args = {
  title: 'Нажмите на карточку',
  subtitle: 'Кликните для взаимодействия',
  image: <ArrowRight />,
  children: 'Эта карточка реагирует на клики и имеет hover эффекты.',
  onClick: () => alert('Карточка была нажата!'),
};

export const ServiceCard = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: '1200px' }}>
    <Card
      title="Платежи"
      subtitle="Быстрые международные переводы"
      image={<DollarSign />}
      footer={
        <Button size="small" icon={<ArrowRight size={14} />}>
          Подключиться
        </Button>
      }
    >
      Переводите и получайте средства по всему миру — быстро, легально и в нужной валюте.
    </Card>
    
    <Card
      title="Консалтинг"
      subtitle="Международный консалтинг"
      image={<Globe />}
      footer={
        <Button size="small" icon={<ArrowRight size={14} />}>
          Получить консультацию
        </Button>
      }
    >
      Сопровождаем выход на зарубежные рынки под ключ с полным сопровождением.
    </Card>
    
    <Card
      title="Комплаенс"
      subtitle="Проверка контрагентов"
      image={<Shield />}
      footer={
        <Button size="small" icon={<ArrowRight size={14} />}>
          Проверить
        </Button>
      }
    >
      Проверим вашего контрагента за вас — покажем риски по международным спискам.
    </Card>
  </div>
);
