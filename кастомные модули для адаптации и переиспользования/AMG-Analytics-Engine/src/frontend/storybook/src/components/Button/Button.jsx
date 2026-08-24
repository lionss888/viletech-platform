import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const StyledButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: ${props => props.size === 'small' ? '0.5rem 1rem' : props.size === 'large' ? '1rem 2rem' : '0.75rem 1.5rem'};
  font-size: ${props => props.size === 'small' ? '0.875rem' : props.size === 'large' ? '1.125rem' : '1rem'};
  font-weight: 500;
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-normal);
  text-decoration: none;
  white-space: nowrap;
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: linear-gradient(135deg, var(--primary-blue), var(--primary-blue-dark));
          color: white;
          box-shadow: var(--shadow-md);
          
          &:hover {
            background: linear-gradient(135deg, var(--primary-blue-dark), var(--primary-blue));
            box-shadow: var(--shadow-lg);
            transform: translateY(-2px);
          }
        `;
      case 'secondary':
        return `
          background: transparent;
          color: var(--primary-blue);
          border: 2px solid var(--primary-blue);
          
          &:hover {
            background: var(--primary-blue);
            color: white;
            transform: translateY(-2px);
          }
        `;
      case 'ghost':
        return `
          background: transparent;
          color: var(--gray-600);
          
          &:hover {
            background: var(--gray-100);
            color: var(--gray-800);
          }
        `;
      case 'danger':
        return `
          background: var(--accent-red);
          color: white;
          
          &:hover {
            background: #dc2626;
            transform: translateY(-2px);
          }
        `;
      default:
        return `
          background: var(--gray-100);
          color: var(--gray-700);
          
          &:hover {
            background: var(--gray-200);
          }
        `;
    }
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
  
  &:focus {
    outline: 2px solid var(--primary-blue);
    outline-offset: 2px;
  }
`;

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false, 
  onClick, 
  type = 'button',
  icon,
  ...props 
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      disabled={disabled}
      onClick={onClick}
      type={type}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      {...props}
    >
      {icon && icon}
      {children}
    </StyledButton>
  );
};

export default Button;
