import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const StyledCard = styled(motion.div)`
  background: var(--white);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  transition: all var(--transition-normal);
  
  ${props => props.variant === 'elevated' && `
    box-shadow: var(--shadow-lg);
    
    &:hover {
      box-shadow: var(--shadow-xl);
      transform: translateY(-4px);
    }
  `}
  
  ${props => props.variant === 'outlined' && `
    border: 1px solid var(--gray-200);
    box-shadow: none;
    
    &:hover {
      border-color: var(--primary-blue);
      box-shadow: var(--shadow-sm);
    }
  `}
  
  ${props => props.variant === 'glass' && `
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: none;
  `}
`;

const CardHeader = styled.div`
  padding: 1.5rem 1.5rem 0;
  
  ${props => props.compact && `
    padding: 1rem 1rem 0;
  `}
`;

const CardTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--gray-900);
  margin: 0 0 0.5rem 0;
  
  ${props => props.compact && `
    font-size: 1.125rem;
  `}
`;

const CardSubtitle = styled.p`
  font-size: 0.875rem;
  color: var(--gray-600);
  margin: 0;
`;

const CardContent = styled.div`
  padding: 1.5rem;
  
  ${props => props.compact && `
    padding: 1rem;
  `}
`;

const CardFooter = styled.div`
  padding: 0 1.5rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  ${props => props.compact && `
    padding: 0 1rem 1rem;
  `}
`;

const CardImage = styled.div`
  width: 100%;
  height: 200px;
  background: linear-gradient(135deg, var(--primary-blue), var(--secondary-purple));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 3rem;
  
  ${props => props.compact && `
    height: 120px;
    font-size: 2rem;
  `}
`;

const Card = ({ 
  children, 
  title, 
  subtitle, 
  variant = 'elevated', 
  compact = false,
  image,
  footer,
  onClick,
  ...props 
}) => {
  return (
    <StyledCard
      variant={variant}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      {...props}
    >
      {image && <CardImage compact={compact}>{image}</CardImage>}
      
      {(title || subtitle) && (
        <CardHeader compact={compact}>
          {title && <CardTitle compact={compact}>{title}</CardTitle>}
          {subtitle && <CardSubtitle>{subtitle}</CardSubtitle>}
        </CardHeader>
      )}
      
      <CardContent compact={compact}>
        {children}
      </CardContent>
      
      {footer && (
        <CardFooter compact={compact}>
          {footer}
        </CardFooter>
      )}
    </StyledCard>
  );
};

export default Card;
