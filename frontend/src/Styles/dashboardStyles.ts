import { CSSProperties } from 'react';

const styles: { [key: string]: CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: 'rgb(32,32,32)', // Dark background
    color: 'rgb(255,255,255)', // White font color for dark background
  },
  button: {
    margin: '10px',
    padding: '10px 20px',
    fontSize: '16px',
    cursor: 'pointer',
    backgroundColor: 'rgb(253,251,243)', // Light background for buttons
    color: 'rgb(137,103,74)', // Font color for buttons
    border: 'none',
    borderRadius: '5px',
  },
  header: {
    color: 'rgb(137,103,74)', // Font color for header
  },
};

export default styles;