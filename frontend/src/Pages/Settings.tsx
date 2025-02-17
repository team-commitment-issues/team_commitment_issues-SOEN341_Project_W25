import React from "react";
import { useNavigate } from "react-router-dom";

const Settings: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h2>Settings Page</h2>
      <p>Adjust your application settings here.</p>
      <button onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
    </div>
  );
};

export default Settings;
