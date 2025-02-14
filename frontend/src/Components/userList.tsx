import React from "react";
import styles from "../Styles/dashboardStyles";

const users = ["User 1", "User 2", "User 3", "User N"];

const UserList: React.FC = () => {
  return (
    <div style={styles.userList}>
      <h3>Users</h3>
      <ul>
        {users.map((user, index) => (
          <li key={index}>{user}</li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;
