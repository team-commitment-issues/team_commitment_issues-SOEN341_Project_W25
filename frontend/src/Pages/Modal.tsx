import React, { useState, ReactElement } from 'react';
import styled from 'styled-components';

const ModalBackdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
`;

const ModalContent = styled.div`
  background-color: #333;
  color: #ddd;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  width: 60%;
  max-width: 800px;
  display: flex;
  position: relative;
`;

const Sidebar = styled.div`
  width: 30%;
  border-right: 1px solid #555;
`;

const MainContent = styled.div`
  width: 70%;
  padding: 20px;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  color: #ddd;
  cursor: pointer;
`;

const ModalHeader = styled.div`
  font-size: 1.5em;
  margin-bottom: 20px;
`;

const Modal: React.FC<{ onClose: () => void, title: string, children: React.ReactNode }> = ({ onClose, title, children }) => {
  const [selectedOption, setSelectedOption] = useState<string>('');

  const handleOptionClick = (option: string) => {
    setSelectedOption(option);
  };

  return (
    <ModalBackdrop onClick={(event: React.MouseEvent) => event.target === event.currentTarget && onClose()}>
      <ModalContent onClick={(event: React.MouseEvent) => event.stopPropagation()}>
        <CloseButton onClick={onClose}>&times;</CloseButton>
        <ModalHeader>{title}</ModalHeader>
        <Sidebar>
          {React.Children.map(children, (child) =>
            React.isValidElement(child) ? // Ensure child is a valid React element
              React.cloneElement(child as ReactElement<{onClick: () => void}>, { onClick: () => handleOptionClick((child as ReactElement<{children?: React.ReactNode}>).props.children?.toString() || '') }) : null
          )}
        </Sidebar>
        <MainContent>
          {selectedOption ? <h2>{selectedOption}</h2> : <h2>Select an option</h2>}
        </MainContent>
      </ModalContent>
    </ModalBackdrop>
  );
}

export default Modal;
