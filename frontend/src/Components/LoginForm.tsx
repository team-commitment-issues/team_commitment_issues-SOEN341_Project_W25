import React, { useState } from 'react';
import { login } from '../Services/authService';
import { useNavigate } from 'react-router-dom';
import Input from './UI/Input';
import Button from './UI/Button';
import FormGroup from './UI/FormGroup';
import styles from '../Styles/loginStyles';
import TextLink from './UI/TextLink';

const LoginForm: React.FC = () => {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await login(username, password);
            if (response.token) {
                localStorage.setItem('token', response.token);
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
            <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </FormGroup>
          <FormGroup label="Password:">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </FormGroup>
          <Button text="Login" type="submit" />
        </form>
        <TextLink text="Don't have an account?" linkText="Sign up" to="/signup" />
      </div>
    );
};

export default LoginForm;