import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../Styles/settings';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const handleMouseEnter = (button: string) => {
    setHoveredButton(button);
  };

  const handleMouseLeave = () => {
    setHoveredButton(null);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Settings</h1>
      
      <section style={styles.section}>
        <h2 style={{ ...styles.subHeader, color: 'black' }}>Profile Settings</h2>
        <button
          style={hoveredButton === 'editProfile' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('editProfile')}
          onMouseLeave={handleMouseLeave}
        >
          Edit Profile
        </button>
        <button
          style={hoveredButton === 'accountManagement' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('accountManagement')}
          onMouseLeave={handleMouseLeave}
        >
          Account Management
        </button>
      </section>

      <section style={styles.section}>
        <h2 style={{ ...styles.subHeader, color: 'black' }}>Notification Settings</h2>
        <button
          style={hoveredButton === 'notificationPreferences' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('notificationPreferences')}
          onMouseLeave={handleMouseLeave}
        >
          Notification Preferences
        </button>
        <button
          style={hoveredButton === 'muteNotifications' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('muteNotifications')}
          onMouseLeave={handleMouseLeave}
        >
          Mute Notifications
        </button>
      </section>

      <section style={styles.section}>
        <h2 style={{ ...styles.subHeader, color: 'black' }}>Privacy Settings</h2>
        <button
          style={hoveredButton === 'lastSeen' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('lastSeen')}
          onMouseLeave={handleMouseLeave}
        >
          Last Seen
        </button>
        <button
          style={hoveredButton === 'readReceipts' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('readReceipts')}
          onMouseLeave={handleMouseLeave}
        >
          Read Receipts
        </button>
        <button
          style={hoveredButton === 'blockUsers' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('blockUsers')}
          onMouseLeave={handleMouseLeave}
        >
          Block Users
        </button>
      </section>

      <section style={styles.section}>
        <h2 style={{ ...styles.subHeader, color: 'black' }}>Chat Settings</h2>
        <button
          style={hoveredButton === 'themeCustomization' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('themeCustomization')}
          onMouseLeave={handleMouseLeave}
        >
          Theme Customization
        </button>
        <button
          style={hoveredButton === 'textSizeAndFont' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('textSizeAndFont')}
          onMouseLeave={handleMouseLeave}
        >
          Text Size and Font
        </button>
        <button
          style={hoveredButton === 'chatBackup' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('chatBackup')}
          onMouseLeave={handleMouseLeave}
        >
          Chat Backup
        </button>
      </section>

      <section style={styles.section}>
        <h2 style={{ ...styles.subHeader, color: 'black' }}>Security Settings</h2>
        <button
          style={hoveredButton === 'twoFactorAuthentication' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('twoFactorAuthentication')}
          onMouseLeave={handleMouseLeave}
        >
          Two-Factor Authentication (2FA)
        </button>
        <button
          style={hoveredButton === 'sessionManagement' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('sessionManagement')}
          onMouseLeave={handleMouseLeave}
        >
          Session Management
        </button>
        <button
          style={hoveredButton === 'appLock' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('appLock')}
          onMouseLeave={handleMouseLeave}
        >
          App Lock
        </button>
      </section>

      <section style={styles.section}>
        <h2 style={{ ...styles.subHeader, color: 'black' }}>Communication Preferences</h2>
        <button
          style={hoveredButton === 'channelManagement' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('channelManagement')}
          onMouseLeave={handleMouseLeave}
        >
          Channel Management
        </button>
        <button
          style={hoveredButton === 'dmSettings' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('dmSettings')}
          onMouseLeave={handleMouseLeave}
        >
          Direct Messages (DM) Settings
        </button>
      </section>

      <section style={styles.section}>
        <h2 style={{ ...styles.subHeader, color: 'black' }}>Accessibility Settings</h2>
        <button
          style={hoveredButton === 'voiceToText' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('voiceToText')}
          onMouseLeave={handleMouseLeave}
        >
          Voice-to-Text
        </button>
        <button
          style={hoveredButton === 'screenReaderSupport' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('screenReaderSupport')}
          onMouseLeave={handleMouseLeave}
        >
          Screen Reader Support
        </button>
      </section>

      <section style={styles.section}>
        <h2 style={{ ...styles.subHeader, color: 'black' }}>Data Usage</h2>
        <button
          style={hoveredButton === 'mediaAutoDownload' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('mediaAutoDownload')}
          onMouseLeave={handleMouseLeave}
        >
          Media Auto-Download
        </button>
        <button
          style={hoveredButton === 'dataSavingMode' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('dataSavingMode')}
          onMouseLeave={handleMouseLeave}
        >
          Data Saving Mode
        </button>
      </section>

      <section style={styles.section}>
        <h2 style={{ ...styles.subHeader, color: 'black' }}>Language</h2>
        <button
          style={hoveredButton === 'appLanguage' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('appLanguage')}
          onMouseLeave={handleMouseLeave}
        >
          App Language
        </button>
      </section>

      <section style={styles.section}>
        <h2 style={{ ...styles.subHeader, color: 'black' }}>Help & Support</h2>
        <button
          style={hoveredButton === 'faqs' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('faqs')}
          onMouseLeave={handleMouseLeave}
        >
          FAQs & Troubleshooting Guides
        </button>
        <button
          style={hoveredButton === 'contactSupport' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('contactSupport')}
          onMouseLeave={handleMouseLeave}
        >
          Contact Support
        </button>
        <button
          style={hoveredButton === 'feedback' ? { ...styles.button, ...styles.buttonHover } : styles.button}
          onMouseEnter={() => handleMouseEnter('feedback')}
          onMouseLeave={handleMouseLeave}
        >
          Feedback and Suggestions
        </button>
      </section>

      <div style={{ padding: "20px", textAlign: "center" }}>
        <button onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
      </div>
    </div>
  );
};

export default Settings;
