const styles = {
  container: {
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    height: '100vh',
    padding: '20px',
    textAlign: 'center' as const,
  },
  heading: {
    fontSize: '24px',
    marginTop: '60px',
  },
  text: {
    fontSize: '16px',
    color: '#555',
  },
  cardContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    marginTop: '20px',
  },
  card: {
    width: '250px',
    height: '180px',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
  },
  buttonContainer: {
    marginTop: 'auto',
  },
  menuContainer: {
    position: 'absolute' as const,
    top: '20px',
    right: '20px',
  },
  menuButton: {
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '10px 15px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  dropdownMenu: {
    position: 'absolute' as const,
    top: '40px',
    right: '0',
    backgroundColor: '#fff',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column' as const,
    width: '150px',
  },
  menuItem: {
    backgroundColor: 'transparent',
    border: 'none',
    padding: '10px',
    textAlign: 'left' as const,
    cursor: 'pointer',
    fontSize: '14px',
    width: '100%',
  },
  menuItemHover: {
    backgroundColor: '#f1f1f1',
  },
};

export default styles;
