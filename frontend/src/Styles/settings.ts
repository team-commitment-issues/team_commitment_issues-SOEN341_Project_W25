import { CSSProperties } from 'react';

const styles: { [key: string]: CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    color: 'rgb(255,255,255)',
    minHeight: '100vh',
  },
  header: {
    fontSize: '32px',
    marginBottom: '30px',
    color: 'rgb(255,255,255)',
  },
  subHeader: {
    fontSize: '24px',
    marginBottom: '15px',
    color: 'rgb(255,255,255)',
  },
  section: {
    marginBottom: '20px',
    width: '100%',
    maxWidth: '600px',
    backgroundColor: 'rgb(253,251,243)', 
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    color: 'rgb(0,0,0)',
  },
  button: {
    display: 'block',
    width: '100%',
    margin: '10px 0',
    padding: '15px',
    fontSize: '18px',
    cursor: 'pointer',
    backgroundColor: 'rgb(32,32,32)', 
    color: 'rgb(255,255,255)',
    border: 'none',
    borderRadius: '5px',
    transition: 'background-color 0.3s ease',
  },
  buttonHover: {
    backgroundColor: 'rgb(50,50,50)',
  },
};

export default styles;