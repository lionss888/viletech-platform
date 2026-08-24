import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Globe, Twitter, Linkedin, Facebook } from 'lucide-react';
import Button from '../Button/Button';

const FooterContainer = styled.footer`
  background: var(--gray-900);
  color: white;
  padding: 4rem 0 2rem;
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  
  @media (max-width: 768px) {
    padding: 0 1rem;
  }
`;

const FooterGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 3rem;
  margin-bottom: 3rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const FooterSection = styled.div``;

const FooterTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: white;
`;

const FooterDescription = styled.p`
  color: var(--gray-400);
  line-height: 1.6;
  margin-bottom: 1.5rem;
`;

const FooterLink = styled.a`
  display: block;
  color: var(--gray-400);
  text-decoration: none;
  padding: 0.5rem 0;
  transition: color var(--transition-normal);
  
  &:hover {
    color: white;
  }
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  color: var(--gray-400);
`;

const SocialLinks = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
`;

const SocialLink = styled(motion.a)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--gray-800);
  border-radius: 50%;
  color: var(--gray-400);
  text-decoration: none;
  transition: all var(--transition-normal);
  
  &:hover {
    background: var(--primary-blue);
    color: white;
    transform: translateY(-2px);
  }
`;

const FooterBottom = styled.div`
  border-top: 1px solid var(--gray-800);
  padding-top: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
`;

const Copyright = styled.p`
  color: var(--gray-500);
  font-size: 0.875rem;
`;

const FooterBottomLinks = styled.div`
  display: flex;
  gap: 2rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const FooterBottomLink = styled.a`
  color: var(--gray-500);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color var(--transition-normal);
  
  &:hover {
    color: white;
  }
`;

const NewsletterSection = styled.div`
  margin-bottom: 2rem;
`;

const NewsletterForm = styled.form`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const NewsletterInput = styled.input`
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid var(--gray-700);
  border-radius: var(--border-radius-md);
  background: var(--gray-800);
  color: white;
  outline: none;
  
  &::placeholder {
    color: var(--gray-500);
  }
  
  &:focus {
    border-color: var(--primary-blue);
  }
`;

const Footer = ({
  companyName = 'Monexa',
  description = 'Инфраструктура для ВЭД: платежи, логистика, консалтинг. Работаем с юрлицами и ИП любого масштаба.',
  services = [],
  company = [],
  support = [],
  contact = {},
  social = {},
  newsletter = true,
}) => {
  return (
    <FooterContainer>
      <FooterContent>
        <FooterGrid>
          <FooterSection>
            <FooterTitle>{companyName}</FooterTitle>
            <FooterDescription>{description}</FooterDescription>
            
            {newsletter && (
              <NewsletterSection>
                <FooterTitle style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                  Подпишитесь на новости
                </FooterTitle>
                <NewsletterForm onSubmit={(e) => e.preventDefault()}>
                  <NewsletterInput 
                    type="email" 
                    placeholder="Ваш email"
                    required
                  />
                  <Button 
                    type="submit" 
                    size="medium"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Подписаться
                  </Button>
                </NewsletterForm>
              </NewsletterSection>
            )}
            
            <SocialLinks>
              {social.twitter && (
                <SocialLink href={social.twitter} whileHover={{ scale: 1.1 }}>
                  <Twitter size={20} />
                </SocialLink>
              )}
              {social.linkedin && (
                <SocialLink href={social.linkedin} whileHover={{ scale: 1.1 }}>
                  <Linkedin size={20} />
                </SocialLink>
              )}
              {social.facebook && (
                <SocialLink href={social.facebook} whileHover={{ scale: 1.1 }}>
                  <Facebook size={20} />
                </SocialLink>
              )}
            </SocialLinks>
          </FooterSection>
          
          <FooterSection>
            <FooterTitle>Услуги</FooterTitle>
            {services.map((service, index) => (
              <FooterLink key={index} href={service.href}>
                {service.label}
              </FooterLink>
            ))}
          </FooterSection>
          
          <FooterSection>
            <FooterTitle>Компания</FooterTitle>
            {company.map((item, index) => (
              <FooterLink key={index} href={item.href}>
                {item.label}
              </FooterLink>
            ))}
          </FooterSection>
          
          <FooterSection>
            <FooterTitle>Поддержка</FooterTitle>
            {support.map((item, index) => (
              <FooterLink key={index} href={item.href}>
                {item.label}
              </FooterLink>
            ))}
            
            {contact.email && (
              <ContactItem>
                <Mail size={16} />
                <span>{contact.email}</span>
              </ContactItem>
            )}
            
            {contact.phone && (
              <ContactItem>
                <Phone size={16} />
                <span>{contact.phone}</span>
              </ContactItem>
            )}
            
            {contact.address && (
              <ContactItem>
                <MapPin size={16} />
                <span>{contact.address}</span>
              </ContactItem>
            )}
          </FooterSection>
        </FooterGrid>
        
        <FooterBottom>
          <Copyright>
            © {new Date().getFullYear()} {companyName}. Все права защищены.
          </Copyright>
          
          <FooterBottomLinks>
            <FooterBottomLink href="/privacy">Политика конфиденциальности</FooterBottomLink>
            <FooterBottomLink href="/terms">Условия использования</FooterBottomLink>
            <FooterBottomLink href="/cookies">Cookies</FooterBottomLink>
          </FooterBottomLinks>
        </FooterBottom>
      </FooterContent>
    </FooterContainer>
  );
};

export default Footer;
