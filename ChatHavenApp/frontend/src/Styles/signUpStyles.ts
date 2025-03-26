const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f0f2f5'
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: '25px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center' as const
  },
  heading: {
    fontSize: '24px',
    marginBottom: '20px',
    color: '#333'
  },
  form: {
    width: '100%'
  },
  error: {
    color: 'red',
    fontSize: '14px',
    marginBottom: '10px'
  }
};

export default styles;
