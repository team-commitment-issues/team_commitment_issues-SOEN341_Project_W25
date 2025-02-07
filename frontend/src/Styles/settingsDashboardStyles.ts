import { CSSProperties } from 'react';

const styles: { [key: string]: CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', // Blue gradient background
    color: 'rgb(255,255,255)', // White font color for dark background
    minHeight: '100vh',
  },
  header: {
    fontSize: '32px',
    marginBottom: '30px',
    color: 'rgb(255,255,255)', // White font color for header
  },
  subHeader: {
    fontSize: '24px',
    marginBottom: '15px',
    color: 'rgb(255,255,255)', // White font color for sub-header
  },
  section: {
    marginBottom: '20px',
    width: '100%',
    maxWidth: '600px',
    backgroundColor: 'rgb(253,251,243)', // Light background for sections
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    color: 'rgb(0,0,0)', // Black font color for sections
  },
  button: {
    display: 'block',
    width: '100%',
    margin: '10px 0',
    padding: '15px',
    fontSize: '18px',
    cursor: 'pointer',
    backgroundColor: 'rgb(32,32,32)', // Dark background for buttons
    color: 'rgb(255,255,255)', // White font color for dark background
    border: 'none',
    borderRadius: '5px',
    transition: 'background-color 0.3s ease',
  },
  buttonHover: {
    backgroundColor: 'rgb(50,50,50)', // Slightly lighter dark background for hover effect
  },
};

export default styles;