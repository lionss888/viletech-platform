import React from 'react';
import { Mail, Phone, Search, Eye, EyeOff, User } from 'lucide-react';
import Input from './Input';

export default {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    variant: {
      control: { type: 'select' },
      options: ['outlined', 'filled'],
    },
    type: {
      control: { type: 'select' },
      options: ['text', 'email', 'password', 'tel', 'number'],
    },
    disabled: {
      control: { type: 'boolean' },
    },
    required: {
      control: { type: 'boolean' },
    },
  },
};

const Template = (args) => <Input {...args} />;

export const Default = Template.bind({});
Default.args = {
  placeholder: 'Введите текст...',
};

export const WithLabel = Template.bind({});
WithLabel.args = {
  label: 'Имя',
  placeholder: 'Введите ваше имя',
};

export const Required = Template.bind({});
Required.args = {
  label: 'Email',
  type: 'email',
  placeholder: 'example@email.com',
  required: true,
};

export const WithIcon = Template.bind({});
WithIcon.args = {
  label: 'Email',
  type: 'email',
  placeholder: 'example@email.com',
  iconLeft: <Mail size={16} />,
};

export const PhoneInput = Template.bind({});
PhoneInput.args = {
  label: 'Телефон',
  type: 'tel',
  placeholder: '+7 (999) 123-45-67',
  iconLeft: <Phone size={16} />,
};

export const SearchInput = Template.bind({});
SearchInput.args = {
  placeholder: 'Поиск...',
  iconLeft: <Search size={16} />,
};

export const WithError = Template.bind({});
WithError.args = {
  label: 'Email',
  type: 'email',
  placeholder: 'example@email.com',
  error: 'Неверный формат email',
};

export const WithHelperText = Template.bind({});
WithHelperText.args = {
  label: 'Пароль',
  type: 'password',
  placeholder: 'Введите пароль',
  helperText: 'Минимум 8 символов, включая буквы и цифры',
};

export const Disabled = Template.bind({});
Disabled.args = {
  label: 'Неактивное поле',
  placeholder: 'Это поле недоступно',
  disabled: true,
};

export const Small = Template.bind({});
Small.args = {
  label: 'Маленькое поле',
  placeholder: 'Small input',
  size: 'small',
};

export const Large = Template.bind({});
Large.args = {
  label: 'Большое поле',
  placeholder: 'Large input',
  size: 'large',
};

export const Filled = Template.bind({});
Filled.args = {
  label: 'Заполненное поле',
  placeholder: 'Filled variant',
  variant: 'filled',
};

export const PasswordWithToggle = () => {
  const [showPassword, setShowPassword] = React.useState(false);
  
  return (
    <Input
      label="Пароль"
      type={showPassword ? 'text' : 'password'}
      placeholder="Введите пароль"
      iconRight={
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--gray-400)',
          }}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
    />
  );
};

export const FormExample = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '400px' }}>
    <Input
      label="Имя"
      placeholder="Введите ваше имя"
      iconLeft={<User size={16} />}
      required
    />
    <Input
      label="Email"
      type="email"
      placeholder="example@email.com"
      iconLeft={<Mail size={16} />}
      required
    />
    <Input
      label="Телефон"
      type="tel"
      placeholder="+7 (999) 123-45-67"
      iconLeft={<Phone size={16} />}
    />
  </div>
);
