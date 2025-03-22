import React, { useState } from 'react';
import { setUserStatus } from '../../Services/onlineStatusService';
import { useTheme } from '../../Context/ThemeContext';
import styles from '../../Styles/StatusSelector.module.css';

type Status = 'online' | 'away' | 'busy' | 'offline';

const StatusSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<Status>('online');
  const { theme } = useTheme();
  
  const statuses: { type: Status; label: string; color: string }[] = [
      { type: 'online', label: 'Online', color: '#4CAF50' },
      { type: 'away', label: 'Away', color: '#FFC107' },
      { type: 'busy', label: 'Busy', color: '#F44336' },
      { type: 'offline', label: 'Appear Offline', color: '#9E9E9E' }
    ];
  
  const handleStatusChange = async (status: Status) => {
    try {
      await setUserStatus(status);
      setCurrentStatus(status);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };
  
  const getCurrentStatusLabel = () => {
    return statuses.find(s => s.type === currentStatus)?.label || 'Online';
  };
  
  const getCurrentStatusColor = () => {
    return statuses.find(s => s.type === currentStatus)?.color || '#4CAF50';
  };
  
  return (
    <div className={styles.container}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`${styles.toggle} ${theme === 'dark' ? styles.dark : styles.light}`}
      >
        <div 
          className={styles.statusIndicator} 
          style={{ backgroundColor: getCurrentStatusColor() }} 
        />
        <span>{getCurrentStatusLabel()}</span>
        <span style={{ fontSize: '10px' }}>▼</span>
      </div>
      
      {isOpen && (
        <div className={`${styles.dropdown} ${theme === 'dark' ? styles.dark : styles.light}`}>
          {statuses.map(status => (
            <div 
              key={status.type}
              onClick={() => handleStatusChange(status.type)}
              className={`${styles.dropdownItem} ${theme === 'dark' ? styles.dark : styles.light} ${currentStatus === status.type ? (theme === 'dark' ? styles.activeDark : styles.activeLight) : ''}`}
              style={{ '--hover-bg-color': theme === 'dark' ? '#444' : '#f5f5f5' } as React.CSSProperties}
            >
              <div 
                className={styles.statusIndicator} 
                style={{ backgroundColor: status.color }} 
              />
              <span>{status.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StatusSelector;