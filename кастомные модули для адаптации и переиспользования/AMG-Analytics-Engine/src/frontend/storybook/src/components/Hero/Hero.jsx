import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import Button from '../Button/Button';

const HeroContainer = styled.section`
  min-height: 80vh;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><polygon fill="rgba(255,255,255,0.1)" points="0,1000 1000,0 1000,1000"/></svg>');
    background-size: cover;
  }
`;

const HeroContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 4rem 2rem;
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 2rem;
  }
`;

const HeroText = styled.div`
  color: white;
`;

const HeroTitle = styled(motion.h1)`
  font-size: 3.5rem;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 2rem;
  }
`;

const HeroSubtitle = styled(motion.p)`
  font-size: 1.25rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  opacity: 0.9;
  
  @media (max-width: 768px) {
    font-size: 1.125rem;
  }
`;

const HeroActions = styled(motion.div)`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const HeroStats = styled(motion.div)`
  display: flex;
  gap: 2rem;
  margin-top: 3rem;
  
  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const HeroVisual = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  
  @media (max-width: 768px) {
    min-height: 300px;
  }
`;

const VisualCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--border-radius-xl);
  padding: 2rem;
  text-align: center;
  color: white;
  max-width: 300px;
`;

const VisualIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const VisualTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const VisualText = styled.p`
  font-size: 0.875rem;
  opacity: 0.8;
  line-height: 1.5;
`;

const Hero = ({
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  stats,
  visual,
  visualTitle,
  visualText,
  visualIcon,
}) => {
  return (
    <HeroContainer>
      <HeroContent>
        <HeroText>
          <HeroTitle
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {title}
          </HeroTitle>
          
          <HeroSubtitle
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {subtitle}
          </HeroSubtitle>
          
          <HeroActions
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {primaryAction && (
              <Button
                variant="primary"
                size="large"
                onClick={primaryAction.onClick}
                icon={primaryAction.icon}
              >
                {primaryAction.text}
              </Button>
            )}
            
            {secondaryAction && (
              <Button
                variant="secondary"
                size="large"
                onClick={secondaryAction.onClick}
                icon={secondaryAction.icon}
                style={{ 
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  color: 'white'
                }}
              >
                {secondaryAction.text}
              </Button>
            )}
          </HeroActions>
          
          {stats && (
            <HeroStats
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              {stats.map((stat, index) => (
                <StatItem key={index}>
                  <StatNumber>{stat.number}</StatNumber>
                  <StatLabel>{stat.label}</StatLabel>
                </StatItem>
              ))}
            </HeroStats>
          )}
        </HeroText>
        
        <HeroVisual
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {visual ? (
            visual
          ) : (
            <VisualCard>
              {visualIcon && <VisualIcon>{visualIcon}</VisualIcon>}
              {visualTitle && <VisualTitle>{visualTitle}</VisualTitle>}
              {visualText && <VisualText>{visualText}</VisualText>}
            </VisualCard>
          )}
        </HeroVisual>
      </HeroContent>
    </HeroContainer>
  );
};

export default Hero;
