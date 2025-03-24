import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserProfile } from '../Services/userService';

interface UserData {
  username: string;
  // Add other user properties as needed
}

interface UserContextType {
  userData: UserData | null;
  setUserData: (data: UserData | null) => void;
  updateUsername: (newUsername: string) => void;
  isAuthenticated: boolean;
  refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Function to refresh user data from the server
  const refreshUserData = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setUserData(null);
      setIsAuthenticated(false);
      return;
    }
    
    try {
      // Fetch the latest user data from the server
      const profileData = await getUserProfile();
      
      // Update state and localStorage
      setUserData({
        username: profileData.username,
        // Add other properties as needed
      });
      
      localStorage.setItem('user', JSON.stringify({
        username: profileData.username,
        // Add other properties as needed
      }));
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      
      // Fallback to localStorage if server request fails
      const storedUserData = localStorage.getItem('user');
      if (storedUserData) {
        try {
          const parsedUserData = JSON.parse(storedUserData);
          setUserData(parsedUserData);
          setIsAuthenticated(true);
        } catch (parseError) {
          console.error('Failed to parse user data from localStorage:', parseError);
          localStorage.removeItem('user');
        }
      }
    }
  };

  // Initialize user data on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      // First load from localStorage for immediate UI display
      const storedUserData = localStorage.getItem('user');
      if (storedUserData) {
        try {
          const parsedUserData = JSON.parse(storedUserData);
          setUserData(parsedUserData);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Failed to parse user data from localStorage:', error);
          localStorage.removeItem('user');
        }
      }
      
      // Then refresh from server to get the latest data
      refreshUserData().catch(err => {
        console.error('Error refreshing user data on init:', err);
      });
    }
  }, []);

  // Helper function to update username both in state and localStorage
  const updateUsername = (newUsername: string) => {
    if (!userData) {
      return;
    }
    
    const updatedUserData = {
      ...userData,
      username: newUsername
    };
    
    // Update state
    setUserData(updatedUserData);
    
    // Update localStorage
    localStorage.setItem('user', JSON.stringify(updatedUserData));
    
    console.log(`Username updated to: ${newUsername}`);
  };

  // Update localStorage whenever userData changes
  useEffect(() => {
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    }
  }, [userData]);

  const value = {
    userData,
    setUserData,
    updateUsername,
    isAuthenticated,
    refreshUserData
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;