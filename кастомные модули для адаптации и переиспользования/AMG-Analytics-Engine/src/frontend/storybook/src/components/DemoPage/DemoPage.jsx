import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Navigation from '../Navigation/Navigation';
import Hero from '../Hero/Hero';
import Card from '../Card/Card';
import Button from '../Button/Button';
import Input from '../Input/Input';
import Footer from '../Footer/Footer';
import { Phone, ArrowRight, DollarSign, Globe, Shield, Users, BarChart3 } from 'lucide-react';

const DemoContainer = styled.div`
  min-height: 100vh;
`;

const Section = styled.section`
  padding: 4rem 0;
  
  &:nth-child(even) {
    background: var(--gray-50);
  }
`;

const SectionContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  
  @media (max-width: 768px) {
    padding: 0 1rem;
  }
`;

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 1rem;
  color: var(--gray-900);
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const SectionSubtitle = styled.p`
  font-size: 1.125rem;
  text-align: center;
  color: var(--gray-600);
  margin-bottom: 3rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
`;

const FormSection = styled.div`
  max-width: 500px;
  margin: 0 auto;
  background: white;
  padding: 2rem;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
`;

const FormTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const FormGrid = styled.div`
  display: grid;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  margin: 3rem 0;
`;

const StatCard = styled.div`
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
`;

const StatNumber = styled.div`
  font-size: 3rem;
  font-weight: 700;
  color: var(--primary-blue);
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 1.125rem;
  color: var(--gray-600);
  font-weight: 500;
`;

const DemoPage = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigationProps = {
    logo: 'Monexa',
    menuItems: [
      { label: 'Главная', href: '#home', active: true },
      { 
        label: 'Услуги', 
        href: '#services',
        dropdown: [
          { label: 'Платежи', href: '#payments' },
          { label: 'Консалтинг', href: '#consulting' },
          { label: 'Комплаенс', href: '#compliance' },
          { label: 'Логистика', href: '#logistics' },
        ]
      },
      { label: 'О нас', href: '#about' },
      { label: 'Контакты', href: '#contacts' },
    ],
    actions: [
      {
        text: 'Получить консультацию',
        variant: 'primary',
        onClick: () => alert('Получить консультацию'),
        icon: <Phone size={16} />,
      },
    ],
    scrolled,
  };

  const heroProps = {
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

  const footerProps = {
    companyName: 'Monexa',
    description: 'Инфраструктура для ВЭД: платежи, логистика, консалтинг. Работаем с юрлицами и ИП любого масштаба.',
    services: [
      { label: 'Платежи и переводы', href: '#payments' },
      { label: 'Международный консалтинг', href: '#consulting' },
      { label: 'Санкционный комплаенс', href: '#compliance' },
      { label: 'Логистика', href: '#logistics' },
    ],
    company: [
      { label: 'О компании', href: '#about' },
      { label: 'Команда', href: '#team' },
      { label: 'Новости', href: '#news' },
    ],
    support: [
      { label: 'Помощь', href: '#help' },
      { label: 'Документация', href: '#docs' },
      { label: 'Контакты', href: '#contacts' },
    ],
    contact: {
      email: 'info@monexa.pro',
      phone: '+7 (999) 123-45-67',
    },
    social: {
      linkedin: 'https://linkedin.com/company/monexa',
    },
    newsletter: true,
  };

  return (
    <DemoContainer>
      <Navigation {...navigationProps} />
      
      <div style={{ paddingTop: '70px' }}>
        <Hero {...heroProps} />
        
        <Section>
          <SectionContent>
            <SectionTitle>Наши услуги</SectionTitle>
            <SectionSubtitle>
              Полный спектр услуг для международного бизнеса
            </SectionSubtitle>
            
            <CardsGrid>
              <Card
                title="Платежи и переводы"
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
                title="Международный консалтинг"
                subtitle="Полное сопровождение"
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
                title="Санкционный комплаенс"
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
            </CardsGrid>
          </SectionContent>
        </Section>
        
        <Section>
          <SectionContent>
            <SectionTitle>Статистика</SectionTitle>
            <SectionSubtitle>
              Наши достижения в цифрах
            </SectionSubtitle>
            
            <StatsGrid>
              <StatCard>
                <StatNumber>180+</StatNumber>
                <StatLabel>Стран покрытия</StatLabel>
              </StatCard>
              <StatCard>
                <StatNumber>1000+</StatNumber>
                <StatLabel>Довольных клиентов</StatLabel>
              </StatCard>
              <StatCard>
                <StatNumber>99%</StatNumber>
                <StatLabel>Успешность операций</StatLabel>
              </StatCard>
              <StatCard>
                <StatNumber>24/7</StatNumber>
                <StatLabel>Поддержка клиентов</StatLabel>
              </StatCard>
            </StatsGrid>
          </SectionContent>
        </Section>
        
        <Section>
          <SectionContent>
            <SectionTitle>Свяжитесь с нами</SectionTitle>
            <SectionSubtitle>
              Оставьте заявку и мы свяжемся с вами в ближайшее время
            </SectionSubtitle>
            
            <FormSection>
              <FormTitle>Получить консультацию</FormTitle>
              <FormGrid>
                <Input
                  label="Имя"
                  placeholder="Введите ваше имя"
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="example@email.com"
                  required
                />
                <Input
                  label="Телефон"
                  type="tel"
                  placeholder="+7 (999) 123-45-67"
                />
                <Input
                  label="Сообщение"
                  placeholder="Опишите ваш запрос"
                  as="textarea"
                  rows={4}
                />
              </FormGrid>
              <Button
                variant="primary"
                size="large"
                icon={<Phone size={16} />}
                style={{ width: '100%' }}
                onClick={() => alert('Форма отправлена!')}
              >
                Отправить заявку
              </Button>
            </FormSection>
          </SectionContent>
        </Section>
        
        <Footer {...footerProps} />
      </div>
    </DemoContainer>
  );
};

export default DemoPage;
