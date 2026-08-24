import React, { forwardRef } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const InputWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const StyledInput = styled(motion.input)`
  width: 100%;
  padding: ${props => props.size === 'small' ? '0.5rem 0.75rem' : props.size === 'large' ? '1rem 1.25rem' : '0.75rem 1rem'};
  font-size: ${props => props.size === 'small' ? '0.875rem' : props.size === 'large' ? '1.125rem' : '1rem'};
  border: 2px solid var(--gray-200);
  border-radius: var(--border-radius-md);
  background: var(--white);
  color: var(--gray-900);
  transition: all var(--transition-normal);
  outline: none;
  
  &::placeholder {
    color: var(--gray-400);
  }
  
  &:focus {
    border-color: var(--primary-blue);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
  
  &:hover:not(:focus) {
    border-color: var(--gray-300);
  }
  
  ${props => props.error && `
    border-color: var(--accent-red);
    
    &:focus {
      border-color: var(--accent-red);
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
  `}
  
  ${props => props.disabled && `
    background: var(--gray-50);
    color: var(--gray-500);
    cursor: not-allowed;
    
    &:hover {
      border-color: var(--gray-200);
    }
  `}
  
  ${props => props.variant === 'filled' && `
    background: var(--gray-50);
    border-color: transparent;
    
    &:focus {
      background: var(--white);
      border-color: var(--primary-blue);
    }
  `}
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gray-700);
  margin-bottom: 0.5rem;
  
  ${props => props.required && `
    &::after {
      content: ' *';
      color: var(--accent-red);
    }
  `}
`;

const ErrorMessage = styled.span`
  display: block;
  font-size: 0.75rem;
  color: var(--accent-red);
  margin-top: 0.25rem;
`;

const HelperText = styled.span`
  display: block;
  font-size: 0.75rem;
  color: var(--gray-500);
  margin-top: 0.25rem;
`;

const InputIcon = styled.div`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  ${props => props.position === 'left' ? 'left: 0.75rem;' : 'right: 0.75rem;'}
  color: var(--gray-400);
  pointer-events: none;
  
  ${props => props.size === 'small' && `
    ${props.position === 'left' ? 'left: 0.5rem;' : 'right: 0.5rem;'}
  `}
  
  ${props => props.size === 'large' && `
    ${props.position === 'left' ? 'left: 1rem;' : 'right: 1rem;'}
  `}
`;

const InputWithIcon = styled(StyledInput)`
  ${props => props.iconLeft && `
    padding-left: ${props.size === 'small' ? '2.25rem' : props.size === 'large' ? '3rem' : '2.75rem'};
  `}
  
  ${props => props.iconRight && `
    padding-right: ${props.size === 'small' ? '2.25rem' : props.size === 'large' ? '3rem' : '2.75rem'};
  `}
`;

const Input = forwardRef(({
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  size = 'medium',
  variant = 'outlined',
  iconLeft,
  iconRight,
  ...props
}, ref) => {
  const hasIcon = iconLeft || iconRight;
  const InputComponent = hasIcon ? InputWithIcon : StyledInput;
  
  return (
    <InputWrapper>
      {label && (
        <Label required={required}>
          {label}
        </Label>
      )}
      
      <InputComponent
        ref={ref}
        size={size}
        variant={variant}
        error={error}
        disabled={disabled}
        iconLeft={iconLeft}
        iconRight={iconRight}
        whileFocus={{ scale: 1.01 }}
        {...props}
      />
      
      {iconLeft && (
        <InputIcon position="left" size={size}>
          {iconLeft}
        </InputIcon>
      )}
      
      {iconRight && (
        <InputIcon position="right" size={size}>
          {iconRight}
        </InputIcon>
      )}
      
      {error && (
        <ErrorMessage>
          {error}
        </ErrorMessage>
      )}
      
      {helperText && !error && (
        <HelperText>
          {helperText}
        </HelperText>
      )}
    </InputWrapper>
  );
});

Input.displayName = 'Input';

export default Input;
