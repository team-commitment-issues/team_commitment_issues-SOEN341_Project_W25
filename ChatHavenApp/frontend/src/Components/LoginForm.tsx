import React, { useState } from 'react';
import { login } from '../Services/authService.ts';
import { useNavigate } from 'react-router-dom';
import Input from './UI/Input.tsx';
import Button from './UI/Button.tsx';
import FormGroup from './UI/FormGroup.tsx';
import styles from '../Styles/loginStyles.ts';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import TextLink from './UI/TextLink.tsx';
import { useUser } from '../Context/UserContext.tsx';

const LoginForm: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const navigate = useNavigate();
  const { setUserData } = useUser();

  const toggleShowPassword = () => {
    setShowPassword(prevState => !prevState);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await login(username, password);
      if (response.token) {
        localStorage.setItem('token', response.token);

        const userData = {
          username: username
        };

        // Update both context and localStorage
        setUserData(userData);

        navigate('/dashboard');
      }
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  return (
    <div style={styles.formContainer}>
      <h2 style={styles.heading}>Login to ChatHaven</h2>
      {error && <p style={styles.error}>{error}</p>}
      <form onSubmit={handleLogin} style={styles.form}>
        <FormGroup label="Username:">
          <Input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
        </FormGroup>
        <FormGroup label="Password:">
          <div style={{ position: 'relative' }}>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <span
              onClick={toggleShowPassword}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                color: '#555'
              }}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
        </FormGroup>
        <Button text="Login" type="submit" />
      </form>
      <TextLink text="Don't have an account?" linkText="Sign up" to="/signup" />
    </div>
  );
};

export default LoginForm;
