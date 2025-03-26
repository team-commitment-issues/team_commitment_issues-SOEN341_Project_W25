import React, { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../Context/ThemeContext';
import { UserProvider } from '../Context/UserContext';
import { OnlineStatusProvider } from '../Context/OnlineStatusContext';
import { ChatSelectionProvider } from '../Context/ChatSelectionContext';

interface ProvidersProps {
  children: ReactNode;
  withRouter?: boolean;
  withChatSelection?: boolean;
}

export const AppProviders: React.FC<ProvidersProps> = ({
  children,
  withRouter = true,
  withChatSelection = true // Changed default to true
}) => {
  let wrappedChildren = children;

  // Wrap with ChatSelectionProvider if requested
  if (withChatSelection) {
    wrappedChildren = <ChatSelectionProvider>{wrappedChildren}</ChatSelectionProvider>;
  }

  // Wrap with core providers
  wrappedChildren = (
    <ThemeProvider>
      <UserProvider>
        <OnlineStatusProvider>{wrappedChildren}</OnlineStatusProvider>
      </UserProvider>
    </ThemeProvider>
  );

  // Wrap with BrowserRouter if requested
  if (withRouter) {
    wrappedChildren = <BrowserRouter>{wrappedChildren}</BrowserRouter>;
  }

  return <>{wrappedChildren}</>;
};

export default AppProviders;
