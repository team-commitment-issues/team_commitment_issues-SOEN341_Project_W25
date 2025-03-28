import React, { useState, useEffect } from 'react';
import { useTheme } from '../../Context/ThemeContext.tsx';
import { useOnlineStatus } from '../../Context/OnlineStatusContext.tsx';
// @ts-ignore
import styles from '../../Styles/StatusSelector.module.css';
import { Status } from '../../types/shared.ts';

const StatusSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();
  const { setUserStatus, currentUserStatus } = useOnlineStatus();

  const statuses: Array<{ type: Status; label: string; color: string }> = [
    { type: Status.ONLINE, label: 'Online', color: '#4CAF50' },
    { type: Status.AWAY, label: 'Away', color: '#FFC107' },
    { type: Status.BUSY, label: 'Busy', color: '#F44336' },
    { type: Status.OFFLINE, label: 'Appear Offline', color: '#9E9E9E' }
  ];

  const handleStatusChange = (status: Status) => {
    try {
      setUserStatus(status);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getCurrentStatusLabel = () => {
    return statuses.find(s => s.type === currentUserStatus)?.label || 'Online';
  };

  const getCurrentStatusColor = () => {
    return statuses.find(s => s.type === currentUserStatus)?.color || '#4CAF50';
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(`.${styles.container}`)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        <span style={{ fontSize: '10px' }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div className={`${styles.dropdown} ${theme === 'dark' ? styles.dark : styles.light}`}>
          {statuses.map(status => (
            <div
              key={status.type}
              onClick={() => handleStatusChange(status.type)}
              className={`${styles.dropdownItem} ${theme === 'dark' ? styles.dark : styles.light} ${currentUserStatus === status.type ? (theme === 'dark' ? styles.activeDark : styles.activeLight) : ''}`}
              style={
                { '--hover-bg-color': theme === 'dark' ? '#444' : '#f5f5f5' } as React.CSSProperties
              }
            >
              <div className={styles.statusIndicator} style={{ backgroundColor: status.color }} />
              <span>{status.label}</span>
              {currentUserStatus === status.type && (
                <span style={{ marginLeft: 'auto', fontSize: '12px' }}>✓</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StatusSelector;
