import React, { useState, useEffect } from 'react';
import '../../Styles/ContextMenu.css';

interface ContextMenuProps {
  items: { label: string; onClick: () => void }[];
  position: { x: number; y: number };
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ items, position, onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleClick = () => {
      setVisible(false);
      onClose();
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [onClose]);

  if (!visible) return null;

  return (
    <ul
      className="context-menu"
      style={{
        top: position.y,
        left: position.x,
      }}
    >
      {items.map((item, index) => (
        <li key={index} onClick={item.onClick}>
          {item.label}
        </li>
      ))}
    </ul>
  );
};

export default ContextMenu;
