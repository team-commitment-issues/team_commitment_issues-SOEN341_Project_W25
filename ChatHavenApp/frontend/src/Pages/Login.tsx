import React from 'react';
import LoginForm from '../Components/LoginForm';
import styles from '../Styles/loginStyles';

const Login: React.FC = () => {
  return (
    <div style={styles.container}>
      <LoginForm />
    </div>
  );
};

export default Login;