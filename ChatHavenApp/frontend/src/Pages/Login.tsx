import React from 'react';
import LoginForm from '../Components/LoginForm.tsx';
import styles from '../Styles/loginStyles.ts';
import { useTheme } from '../Context/ThemeContext.tsx';

const Login: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div
      style={{
        ...styles.container,
        ...(theme === 'dark' && styles.container['&.dark-mode'])
      }}
    >
      <LoginForm />
    </div>
  );
};

export default Login;
