const styles = {
  container: {
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as 'column',
    alignItems: 'center',
    height: '100vh',
    padding: '20px',
    backgroundColor: '#F0F2F5',
    '&.dark-mode': {
      backgroundColor: '#121212',
      color: '#e0e0e0'
    }
  },
  menuContainer: {
    position: 'absolute' as const,
    top: '10px',
    right: '20px',
    '&.dark-mode': {
      backgroundColor: '#242424'
    }
  },
  menuButton: {
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background 0.3s',
    fontWeight: 'bold',
    '&:hover': {
      backgroundColor: '#0056b3'
    },
    '&.dark-mode': {
      backgroundColor: '#007bff',
      border: '1px solid #007bff',
      color: '#fff'
    }
  },

  menuItem: {
    backgroundColor: 'transparent',
    border: 'none',
    padding: '10px',
    textAlign: 'left' as const,
    cursor: 'pointer',
    fontSize: '14px',
    width: '100%',
    transition: 'background 0.3s',
    fontWeight: '500',
    color: '#fff',
    '&:hover': {
      backgroundColor: '#0056b3'
    },
    '&.dark-mode': {
      backgroundColor: 'transparent',
      color: '#fff'
    },
    '&.dark-mode:hover': {
      backgroundColor: '#0056b3'
    }
  },

  dropdownMenu: {
    position: 'absolute' as const,
    top: '30px',
    right: '0',
    backgroundColor: '#007bff',
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column' as 'column',
    width: '140px',
    zIndex: 1000,
    padding: '5px 0',
    border: '1px solid #0056b3',
    '&.dark-mode': {
      backgroundColor: '#007bff',
      border: '1px solid #0056b3',
      boxShadow: '0px 4px 10px rgba(255, 255, 255, 0.1)'
    }
  },

  heading: {
    fontSize: '24px',
    marginTop: '20px',
    fontWeight: 'bold',
    color: '#1C1E21',
    textAlign: 'center' as const,
    '&.dark-mode': {
      color: '#e0e0e0'
    }
  },
  text: {
    fontSize: '16px',
    color: '#606770',
    textAlign: 'center' as const,
    '&.dark-mode': {
      color: '#e0e0e0'
    }
  },
  mainContainer: {
    display: 'flex',
    width: '100%',
    height: 'calc(100vh - 60px)',
    justifyContent: 'space-between',
    padding: '10px',
    gap: '15px'
  },

  middleContainer: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    width: '35%',
    gap: '10px'
  },
  teamMessages: {
    width: '40%',
    height: '74%',
    padding: '15px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    textAlign: 'left' as const,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    border: '1px solid #E4E6EB',
    display: 'flex',
    flexDirection: 'column' as 'column',
    justifyContent: 'space-between',
    '&.dark-mode': {
      backgroundColor: '#242424',
      border: '1px solid #444'
    }
  },
  chatHeader: {
    width: '100%',
    padding: '10px',
    fontWeight: 'bold',
    borderBottom: '1px solid #E4E6EB',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center' as const,
    height: '50px',
    '&.dark-mode': {
      borderBottom: '1px solid #444'
    }
  },
  chatBox: {
    flex: 1,
    overflowY: 'auto' as 'auto',
    padding: '10px',
    borderRadius: '8px',
    backgroundColor: '#F0F2F5',
    maxHeight: '300px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    '&.dark-mode': {
      backgroundColor: '#121212'
    }
  },
  adminActionsContainer: {
    position: 'absolute' as const,
    top: '5px',
    left: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: 'fit-content',
    backgroundColor: 'transparent',
    zIndex: 1000
  },
  adminActions: {
    padding: '10px',
    backgroundColor: '#E7F3FF',
    borderRadius: '8px',
    textAlign: 'left' as const,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    border: '1px solid #D3E3FC',
    width: '248px',
    fontSize: '12px',
    '&.dark-mode': {
      backgroundColor: '#242424',
      border: '1px solid #444'
    }
  },
  adminActionsHeading: {
    fontSize: '16px',
    fontWeight: 'bold',
    paddingLeft: '45px',
    marginBottom: '0px',
    '&.dark-mode': {
      color: '#e0e0e0'
    }
  },
  adminActionsText: {
    fontSize: '12px',
    paddingLeft: '20px',
    '&.dark-mode': {
      color: '#e0e0e0'
    }
  },
  assignUserButton: {
    marginTop: '10px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: '1px solid #007bff',
    padding: '10px 20px',
    borderRadius: '5px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
    width: '100%',
    textAlign: 'center' as const,
    '&:hover': {
      backgroundColor: '#0056b3'
    },
    '&.dark-mode': {
      backgroundColor: '#007bff',
      border: '1px solid #007bff',
      color: '#fff'
    }
  },
  cardContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    padding: '15px',
    width: '250px',
    textAlign: 'center' as const,
    '&.dark-mode': {
      backgroundColor: '#242424',
      border: '1px solid #444'
    }
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '10px'
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#F0F2F5',
    '&.dark-mode': {
      backgroundColor: '#121212'
    }
  },
  formTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '15px',
    '&.dark-mode': {
      color: '#e0e0e0'
    }
  },
  formLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    marginTop: '10px',
    textAlign: 'left' as const,
    width: '100%',
    '&.dark-mode': {
      color: '#e0e0e0'
    }
  },
  formInput: {
    width: '250px',
    padding: '8px',
    marginTop: '5px',
    borderRadius: '6px',
    border: '1px solid #CCC',
    fontSize: '14px',
    '&.dark-mode': {
      backgroundColor: '#242424',
      color: '#e0e0e0',
      border: '1px solid #444'
    }
  },
  formButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '15px',
    width: '250px'
  },
  cancelButton: {
    backgroundColor: '#CCC',
    color: '#333',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 0.3s',
    '&:hover': {
      backgroundColor: '#999'
    },
    '&.dark-mode': {
      backgroundColor: '#444',
      color: '#e0e0e0'
    }
  },
  submitButton: {
    backgroundColor: '#1877F2',
    color: '#FFFFFF',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background 0.3s',
    '&:hover': {
      backgroundColor: '#145DBF'
    },
    '&.dark-mode': {
      backgroundColor: '#333',
      color: '#e0e0e0'
    }
  },
  listHeader: {
    fontSize: '16px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    paddingBottom: '5px',
    borderBottom: '1px solid #E4E6EB',
    '&.dark-mode': {
      color: '#e0e0e0',
      borderBottom: '1px solid #444'
    }
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    width: '100%',
    padding: '0px',
    backgroundColor: 'transparent',
    borderRadius: '6px',
    boxShadow: 'none',
    border: 'none',
    listStyleType: 'none',
    margin: '0',
    paddingLeft: '0',
    '&.dark-mode': {
      backgroundColor: '#242424'
    }
  },

  createTeamButton: {
    marginTop: '10px',
    backgroundColor: '#1877F2',
    color: '#FFFFFF',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.3s',
    width: '100%',
    textAlign: 'center' as const,
    '&:hover': {
      backgroundColor: '#145DBF'
    },
    '&.dark-mode': {
      backgroundColor: '#007bff',
      border: '1px solid #007bff',
      color: '#fff'
    }
  },

  chatPlaceholder: {
    fontSize: '14px',
    color: '#606770',
    textAlign: 'center' as const,
    '&.dark-mode': {
      color: '#e0e0e0'
    }
  },

  chatMessage: {
    padding: '8px',
    backgroundColor: '#DCF8C6',
    borderRadius: '10px',
    alignSelf: 'flex-start',
    maxWidth: '70%',
    fontSize: '14px',
    wordBreak: 'break-word',
    '&.dark-mode': {
      backgroundColor: '#333'
    }
  },

  inputBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px',
    borderTop: '1px solid #E4E6EB',
    '&.dark-mode': {
      borderTop: '1px solid #444'
    }
  },

  inputField: {
    flex: 1,
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #CCC',
    fontSize: '14px',
    '&.dark-mode': {
      backgroundColor: '#242424',
      color: '#e0e0e0',
      border: '1px solid #444'
    }
  },

  sendButton: {
    backgroundColor: '#007bff',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.3s',
    '&:hover': {
      backgroundColor: '#0056b3'
    },
    '&.dark-mode': {
      backgroundColor: '#007bff',
      border: '1px solid #007bff',
      color: '#fff'
    }
  },

  teamHeader: {
    width: '100%',
    padding: '10px',
    fontWeight: 'bold',
    borderBottom: '1px solid #E4E6EB',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center' as const,
    height: '50px',
    '&.dark-mode': {
      borderBottom: '1px solid #444'
    }
  },
  channelList: {
    height: 'auto',
    padding: '15px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    textAlign: 'center' as const,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    border: '1px solid #E4E6EB',
    transition: 'box-shadow 0.3s ease',
    '&:hover': {
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)'
    },
    '&.dark-mode': {
      backgroundColor: '#242424',
      border: '1px solid #444'
    }
  },

  teamList: {
    height: 'auto',
    padding: '15px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    textAlign: 'center' as const,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    border: '1px solid #E4E6EB',
    transition: 'box-shadow 0.3s ease',
    '&:hover': {
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)'
    },
    '&.dark-mode': {
      backgroundColor: '#242424',
      border: '1px solid #444'
    }
  },
  listItem: {
    padding: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background 0.3s, font-weight 0.3s',
    borderBottom: '1px solid #E4E6EB',
    '&:hover': {
      backgroundColor: '#F0F2F5'
    },
    '&.dark-mode:hover': {
      backgroundColor: '#333'
    }
  },
  userList: {
    width: '20%',
    height: 'auto',
    padding: '15px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    textAlign: 'center' as const,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    border: '1px solid #E4E6EB',
    transition: 'box-shadow 0.3s ease',
    '&:hover': {
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)'
    },
    '&.dark-mode': {
      backgroundColor: '#242424',
      border: '1px solid #444'
    }
  },

  deleteChannelButton: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    marginLeft: '10px',
    transition: 'transform 0.2s',
    '&:hover': {
      transform: 'scale(1.2)'
    },
    '&.dark-mode': {
      color: '#e0e0e0'
    }
  },

  trashIcon: {
    color: '#D9534F',
    fontSize: '14px',
    verticalAlign: 'middle',
    '&.dark-mode': {
      color: '#D9534F'
    }
  },

  deleteTeamButton: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    marginLeft: '10px',
    transition: 'transform 0.2s',
    '&:hover': {
      transform: 'scale(1.2)'
    },
    '&.dark-mode': {
      color: '#e0e0e0'
    }
  },

  createChannelButton: {
    marginTop: '10px',
    backgroundColor: '#007bff',
    color: '#FFFFFF',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.3s',
    width: '100%',
    textAlign: 'center' as const,
    '&:hover': {
      backgroundColor: '#0056b3'
    },
    '&.dark-mode': {
      backgroundColor: '#007bff',
      border: '1px solid #007bff',
      color: '#fff'
    }
  },

  teamName: {
    fontSize: '16px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    '&.dark-mode': {
      color: '#e0e0e0'
    }
  },

  channelName: {
    fontSize: '16px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    '&.dark-mode': {
      color: '#e0e0e0'
    }
  },
  addUserToTeamContainer: {
    padding: '16px',
    marginTop: '16px',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    backgroundColor: '#FFFFFF',
    '&.dark-mode': {
      backgroundColor: '#242424',
      border: '1px solid #444'
    }
  },
  addUserToTeamHeading: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
    '&.dark-mode': {
      color: '#e0e0e0'
    }
  },
  addUserToTeamErrorMessage: {
    color: '#EF4444',
    marginBottom: '16px'
  },
  addUserToTeamSuccessMessage: {
    color: '#10B981',
    marginBottom: '16px'
  },
  addUserToTeamSelect: {
    border: '1px solid #D1D5DB',
    padding: '8px',
    borderRadius: '8px',
    width: '100%',
    marginBottom: '16px',
    '&.dark-mode': {
      backgroundColor: '#242424',
      color: '#e0e0e0',
      border: '1px solid #444'
    }
  },
  addUserToTeamButton: {
    marginTop: '8px',
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    '&:hover': {
      backgroundColor: '#2563EB'
    },
    '&:disabled': {
      backgroundColor: '#93C5FD',
      cursor: 'not-allowed'
    },
    '&.dark-mode': {
      backgroundColor: '#333',
      color: '#e0e0e0'
    }
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px'
  },
  statusIndicator: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: '8px'
  },
  online: { backgroundColor: 'green' },
  away: { backgroundColor: 'orange' },
  offline: { backgroundColor: 'gray' },
  lastSeen: {
    fontSize: '12px',
    color: '#606770'
  },
  emojiButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    marginLeft: '8px',
    padding: '5px',
    borderRadius: '50%',
    transition: 'background-color 0.3s',
    '&:hover': {
      backgroundColor: '#f0f0f0'
    },
    '&.dark-mode': {
      backgroundColor: 'transparent',
      color: '#e0e0e0',
      '&:hover': {
        backgroundColor: '#333'
      }
    }
  },
  emojiPickerContainer: {
    position: 'absolute' as const,
    bottom: '60px', // Adjust based on the input box position
    right: '20px', // Adjust based on layout
    zIndex: 1000,
    boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    backgroundColor: '#fff',
    padding: '10px',
    '&.dark-mode': {
      backgroundColor: '#242424',
      boxShadow: '0px 4px 6px rgba(255, 255, 255, 0.1)'
    }
  }
};

export default styles;
