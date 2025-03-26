import React from 'react';
import SignUpForm from '../Components/SignUpForm.tsx';
import styles from '../Styles/signUpStyles.ts';

const SignUp: React.FC = () => {
  return (
    <div style={styles.container}>
      <SignUpForm />
    </div>
  );
};

export default SignUp;
