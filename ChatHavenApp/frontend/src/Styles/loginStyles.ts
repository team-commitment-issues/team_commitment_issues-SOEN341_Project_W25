const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    width: "100vw",
    backgroundColor: "#fff",
    color: "#000",
    margin: "0",
    padding: "0",
    "&.dark-mode": {
      backgroundColor: "#121212",
      color: "#fff",
    },
  },

  formContainer: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: "30px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    maxWidth: "400px",
    width: "90%",
    textAlign: "center" as const,

    "@media (max-width: 768px)": {
      width: "95%",
      padding: "20px",
    },

    "@media (max-width: 480px)": {
      width: "100%",
      padding: "15px",
      borderRadius: "5px",
    },

    "&.dark-mode": {
      backgroundColor: "#2a2a2a",
      boxShadow: "0 4px 12px rgba(255, 255, 255, 0.1)",
    },
  },

  form: {
    width: "100%",
  },

  heading: {
    fontSize: "20px",
    marginBottom: "20px",
    fontWeight: "bold",
    color: "#000",
    "&.dark-mode": {
      color: "#fff",
    },
  },

  inputField: {
    width: "100%",
    padding: "10px",
    marginTop: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "14px",
    color: "#000",
    "&.dark-mode": {
      backgroundColor: "#2a2a2a",
      color: "#fff",
      border: "1px solid #444",
    },
  },

  button: {
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    padding: "10px",
    borderRadius: "5px",
    fontSize: "16px",
    cursor: "pointer",
    marginTop: "20px",
    width: "100%",
    "&:hover": {
      backgroundColor: "#0056b3",
    },
  },

  error: {
    color: "red",
    fontSize: "14px",
    marginBottom: "10px",
    "&.dark-mode": {
      color: "red",
    },
  },

  signupText: {
    color: "#000",
    marginTop: "10px",
    fontSize: "14px",
    "&.dark-mode": {
      color: "#000",
    },
  },
};

export default styles;
