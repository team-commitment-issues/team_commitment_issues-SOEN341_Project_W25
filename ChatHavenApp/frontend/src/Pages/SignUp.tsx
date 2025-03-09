import React from 'react';
import SignUpForm from '../Components/SignUpForm';
import styles from '../Styles/signUpStyles';

const SignUp: React.FC = () => {
  return (
    <div style={styles.container}>
      <SignUpForm />
    </div>
  );
};

export default SignUp;