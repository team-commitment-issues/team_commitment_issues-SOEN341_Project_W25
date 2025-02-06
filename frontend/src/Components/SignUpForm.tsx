import React, { useState } from 'react';
import { signUp } from '../Services/authService';
import { useNavigate } from 'react-router-dom';
import Input from './UI/Input';
import Button from './UI/Button';
import FormGroup from './UI/FormGroup';
import styles from '../Styles/signUpStyles';

const SignUpForm: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [userID, setUserID] = useState<string>('');
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signUp(email, password, firstName, lastName, userID);
      navigate('/login');
    } catch (err) {
      setError('Signup failed. Please try again.');
    }
  };

  return (
    <div style={styles.formContainer}>
      <h2 style={styles.heading}>Sign Up for ChatHaven</h2>
      {error && <p style={styles.error}>{error}</p>}
      <form onSubmit={handleSignUp} style={styles.form}>
        <FormGroup label="Email:">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </FormGroup>
        <FormGroup label="Password:">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </FormGroup>
        <FormGroup label="First Name:">
          <Input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </FormGroup>
        <FormGroup label="Last Name:">
          <Input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </FormGroup>
        <FormGroup label="User ID (Visible to Others):">
          <Input type="text" value={userID} onChange={(e) => setUserID(e.target.value)} required />
        </FormGroup>
        <Button text="Sign Up" type="submit" />
      </form>
    </div>
  );
};

export default SignUpForm;
