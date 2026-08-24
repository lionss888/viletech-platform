import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown } from 'lucide-react';
import Button from '../Button/Button';

const NavContainer = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--gray-200);
  transition: all var(--transition-normal);
  
  ${props => props.scrolled && `
    background: rgba(255, 255, 255, 0.98);
    box-shadow: var(--shadow-md);
  `}
`;

const NavContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
  
  @media (max-width: 768px) {
    padding: 0 1rem;
  }
`;

const Logo = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-blue);
  text-decoration: none;
  
  &:hover {
    color: var(--primary-blue-dark);
  }
`;

const NavMenu = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const NavItem = styled.div`
  position: relative;
`;

const NavLink = styled.a`
  color: var(--gray-700);
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: color var(--transition-normal);
  
  &:hover {
    color: var(--primary-blue);
  }
  
  ${props => props.active && `
    color: var(--primary-blue);
  `}
`;

const DropdownMenu = styled(motion.div)`
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--gray-200);
  min-width: 200px;
  padding: 0.5rem 0;
  z-index: 1001;
`;

const DropdownItem = styled.a`
  display: block;
  padding: 0.75rem 1rem;
  color: var(--gray-700);
  text-decoration: none;
  transition: all var(--transition-normal);
  
  &:hover {
    background: var(--gray-50);
    color: var(--primary-blue);
  }
`;

const NavActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const MobileMenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  color: var(--gray-700);
  cursor: pointer;
  padding: 0.5rem;
  
  @media (max-width: 768px) {
    display: block;
  }
`;

const MobileMenu = styled(motion.div)`
  position: fixed;
  top: 70px;
  left: 0;
  right: 0;
  background: white;
  border-bottom: 1px solid var(--gray-200);
  box-shadow: var(--shadow-lg);
  z-index: 999;
  
  @media (min-width: 769px) {
    display: none;
  }
`;

const MobileMenuItem = styled.div`
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--gray-100);
  
  &:last-child {
    border-bottom: none;
  }
`;

const MobileMenuLink = styled.a`
  display: block;
  color: var(--gray-700);
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem 0;
  
  &:hover {
    color: var(--primary-blue);
  }
`;

const MobileDropdown = styled.div`
  padding-left: 1rem;
  margin-top: 0.5rem;
`;

const MobileDropdownItem = styled.a`
  display: block;
  color: var(--gray-600);
  text-decoration: none;
  padding: 0.5rem 0;
  font-size: 0.875rem;
  
  &:hover {
    color: var(--primary-blue);
  }
`;

const Navigation = ({ 
  logo = 'Monexa',
  menuItems = [],
  actions = [],
  scrolled = false 
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleDropdown = (index) => {
    setOpenDropdown(openDropdown === index ? null : index);
  };

  return (
    <NavContainer scrolled={scrolled}>
      <NavContent>
        <Logo>{logo}</Logo>
        
        <NavMenu>
          {menuItems.map((item, index) => (
            <NavItem key={index}>
              {item.dropdown ? (
                <>
                  <NavLink
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleDropdown(index);
                    }}
                  >
                    {item.label}
                    <ChevronDown size={16} />
                  </NavLink>
                  
                  <AnimatePresence>
                    {openDropdown === index && (
                      <DropdownMenu
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {item.dropdown.map((dropdownItem, dropdownIndex) => (
                          <DropdownItem key={dropdownIndex} href={dropdownItem.href}>
                            {dropdownItem.label}
                          </DropdownItem>
                        ))}
                      </DropdownMenu>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <NavLink href={item.href} active={item.active}>
                  {item.label}
                </NavLink>
              )}
            </NavItem>
          ))}
        </NavMenu>
        
        <NavActions>
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'ghost'}
              size={action.size || 'medium'}
              onClick={action.onClick}
              icon={action.icon}
            >
              {action.text}
            </Button>
          ))}
        </NavActions>
        
        <MobileMenuButton onClick={toggleMobileMenu}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </MobileMenuButton>
      </NavContent>
      
      <AnimatePresence>
        {mobileMenuOpen && (
          <MobileMenu
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {menuItems.map((item, index) => (
              <MobileMenuItem key={index}>
                <MobileMenuLink
                  href={item.href}
                  onClick={() => {
                    if (item.dropdown) {
                      toggleDropdown(index);
                    } else {
                      setMobileMenuOpen(false);
                    }
                  }}
                >
                  {item.label}
                  {item.dropdown && <ChevronDown size={16} style={{ marginLeft: 'auto' }} />}
                </MobileMenuLink>
                
                {item.dropdown && openDropdown === index && (
                  <MobileDropdown>
                    {item.dropdown.map((dropdownItem, dropdownIndex) => (
                      <MobileDropdownItem key={dropdownIndex} href={dropdownItem.href}>
                        {dropdownItem.label}
                      </MobileDropdownItem>
                    ))}
                  </MobileDropdown>
                )}
              </MobileMenuItem>
            ))}
            
            {actions.length > 0 && (
              <MobileMenuItem>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {actions.map((action, index) => (
                    <Button
                      key={index}
                      variant={action.variant || 'ghost'}
                      size="medium"
                      onClick={() => {
                        action.onClick();
                        setMobileMenuOpen(false);
                      }}
                      icon={action.icon}
                      style={{ width: '100%' }}
                    >
                      {action.text}
                    </Button>
                  ))}
                </div>
              </MobileMenuItem>
            )}
          </MobileMenu>
        )}
      </AnimatePresence>
    </NavContainer>
  );
};

export default Navigation;
