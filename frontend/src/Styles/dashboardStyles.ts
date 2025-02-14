const styles = {
  container: {
    position: "relative" as const,
    display: "flex",
    flexDirection: "column" as "column",
    alignItems: "center",
    height: "100vh",
    padding: "20px",
    backgroundColor: "#F0F2F5",
  },
  menuContainer: {
    position: "absolute" as const,
    top: "10px",
    right: "20px",
  },
  menuButton: {
    backgroundColor: "#1877F2",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: "14px",
    transition: "background 0.3s",
    fontWeight: "bold",
    "&:hover": {
      backgroundColor: "#145DBF",
    },
  },
  dropdownMenu: {
    position: "absolute" as const,
    top: "30px",
    right: "0",
    backgroundColor: "#fff",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column" as "column",
    width: "140px",
    zIndex: 1000,
    padding: "5px 0",
    border: "1px solid #E4E6EB",
  },
  heading: {
    fontSize: "24px",
    marginTop: "20px",
    fontWeight: "bold",
    color: "#1C1E21",
    textAlign: "center" as const,
  },
  text: {
    fontSize: "16px",
    color: "#606770",
    textAlign: "center" as const,
  },
  mainContainer: {
    display: "flex",
    width: "100%",
    height: "calc(100vh - 60px)",
    justifyContent: "space-between",
    padding: "10px",
    gap: "15px",
  },
  userList: {
    width: "20%",
    height: "74%",
    padding: "15px",
    backgroundColor: "#FFFFFF",
    borderRadius: "12px",
    textAlign: "center" as const,
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
    border: "1px solid #E4E6EB",
    transition: "box-shadow 0.3s ease",
    "&:hover": {
      boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)",
    },
  },
  middleContainer: {
    display: "flex",
    flexDirection: "column" as "column",
    width: "35%",
    gap: "10px",
  },
  directMessages: {
    width: "40%",
    height: "74%",
    padding: "15px",
    backgroundColor: "#FFFFFF",
    borderRadius: "12px",
    textAlign: "left" as const,
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
    border: "1px solid #E4E6EB",
    display: "flex",
    flexDirection: "column" as "column",
    justifyContent: "space-between",
  },

  chatHeader: {
    width: "100%",
    padding: "10px",
    fontWeight: "bold",
    borderBottom: "1px solid #E4E6EB",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center" as const,
    height: "50px",
  },

  chatBox: {
    flex: 1,
    overflowY: "auto" as "auto",
    padding: "10px",
    borderRadius: "8px",
    backgroundColor: "#F0F2F5",
    maxHeight: "300px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
  },
  adminActionsContainer: {
    position: "absolute" as const,
    top: "5px",
    left: "20px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "fit-content",
    backgroundColor: "transparent",
    zIndex: 1000,
  },
  adminActions: {
    padding: "10px",
    backgroundColor: "#E7F3FF",
    borderRadius: "8px",
    textAlign: "left" as const,
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
    border: "1px solid #D3E3FC",
    width: "248px",
    fontSize: "12px",
  },

  adminActionsHeading: {
    fontSize: "16px",
    fontWeight: "bold",
    paddingLeft: "45px",
    marginBottom: "0px",
  },

  adminActionsText: {
    fontSize: "12px",
    paddingLeft: "20px",
  },

  assignUserButton: {
    marginTop: "10px",
    backgroundColor: "#1877F2",
    color: "#FFFFFF",
    border: "none",
    padding: "8px 14px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background 0.3s",
    display: "block",
    marginLeft: "48px",
    "&:hover": {
      backgroundColor: "#145DBF",
    },
  },

  teamList: {
    width: "92.5%",
    height: "auto",
    padding: "15px",
    backgroundColor: "#FFFFFF",
    borderRadius: "12px",
    textAlign: "center" as const,
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
    border: "1px solid #E4E6EB",
    transition: "box-shadow 0.3s ease",
    "&:hover": {
      boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)",
    },
  },
  channelList: {
    width: "92.5%",
    height: "auto",
    padding: "15px",
    backgroundColor: "#FFFFFF",
    borderRadius: "12px",
    textAlign: "center" as const,
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
    border: "1px solid #E4E6EB",
    transition: "box-shadow 0.3s ease",
    "&:hover": {
      boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)",
    },
  },
  draggableItem: {
    padding: "10px",
    cursor: "grab",
    userSelect: "none",
    borderRadius: "6px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E4E6EB",
    transition: "transform 0.2s ease-in-out",
    "&:hover": {
      transform: "scale(1.05)",
    },
  },
  menuItem: {
    backgroundColor: "transparent",
    border: "none",
    padding: "10px",
    textAlign: "left" as const,
    cursor: "pointer",
    fontSize: "14px",
    width: "100%",
    transition: "background 0.3s",
    fontWeight: "500",
    "&:hover": {
      backgroundColor: "#E4E6EB",
    },
  },
  listContainer: {
    display: "flex",
    flexDirection: "column" as const,
    width: "100%",
    padding: "0px",
    backgroundColor: "transparent",
    borderRadius: "6px",
    boxShadow: "none",
    border: "none",
    listStyleType: "none",
    margin: "0",
    paddingLeft: "0",
  },
  listItem: {
    padding: "8px",
    fontSize: "14px",
    cursor: "pointer",
    transition: "background 0.3s",
    borderBottom: "1px solid #E4E6EB",
    "&:hover": {
      backgroundColor: "#F0F2F5",
    },
  },

  listHeader: {
    fontSize: "16px",
    fontWeight: "bold",
    textAlign: "center" as const,
    paddingBottom: "5px",
    borderBottom: "1px solid #E4E6EB",
  },
  createTeamButton: {
    marginTop: "10px",
    backgroundColor: "#1877F2",
    color: "#FFFFFF",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background 0.3s",
    width: "100%",
    textAlign: "center" as const,
    "&:hover": {
      backgroundColor: "#145DBF",
    },
  },

  chatMessage: {
    padding: "8px",
    backgroundColor: "#DCF8C6",
    borderRadius: "10px",
    alignSelf: "flex-start",
    maxWidth: "70%",
    fontSize: "14px",
    wordBreak: "break-word",
  },

  chatPlaceholder: {
    fontSize: "14px",
    color: "#606770",
    textAlign: "center" as const,
  },

  inputBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px",
    borderTop: "1px solid #E4E6EB",
  },

  inputField: {
    flex: 1,
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #CCC",
    fontSize: "14px",
  },

  sendButton: {
    backgroundColor: "#1877F2",
    color: "#FFFFFF",
    border: "none",
    padding: "10px 15px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background 0.3s",
    "&:hover": {
      backgroundColor: "#145DBF",
    },
  },
};

export default styles;
