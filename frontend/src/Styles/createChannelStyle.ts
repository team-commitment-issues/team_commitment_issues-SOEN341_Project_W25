const styles = {
  formContainer: {
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#F0F2F5",
  },
  formTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "15px",
  },
  formLabel: {
    fontSize: "14px",
    fontWeight: "bold",
    marginTop: "10px",
    textAlign: "left" as const,
    width: "100%",
  },
  formInput: {
    width: "250px",
    padding: "8px",
    marginTop: "5px",
    borderRadius: "6px",
    border: "1px solid #CCC",
    fontSize: "14px",
  },
  formButtons: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "15px",
    width: "250px",
  },
  cancelButton: {
    backgroundColor: "#CCC",
    color: "#333",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background 0.3s",
    "&:hover": {
      backgroundColor: "#999",
    },
  },
  submitButton: {
    backgroundColor: "#1877F2",
    color: "#FFFFFF",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "background 0.3s",
    "&:hover": {
      backgroundColor: "#145DBF",
    },
  },
};

export default styles;
