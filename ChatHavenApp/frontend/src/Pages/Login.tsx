import React from "react";
import LoginForm from "../Components/LoginForm";
import styles from "../Styles/loginStyles";
import { useTheme } from "../Context/ThemeContext";

const Login: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div
      style={{
        ...styles.container,
        ...(theme === "dark" && styles.container["&.dark-mode"]),
      }}
    >
      <LoginForm />
    </div>
  );
};

export default Login;
