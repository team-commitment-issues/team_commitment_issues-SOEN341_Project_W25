import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { BrowserRouter, Routes, Route, MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from './Context/ThemeContext';
import { UserProvider } from './Context/UserContext';
import { OnlineStatusProvider } from './Context/OnlineStatusContext';
import { ChatSelectionProvider } from './Context/ChatSelectionContext';

interface AllProvidersProps {
  children: React.ReactNode;
}

// Base providers that match the actual application structure in index.tsx
const AllProviders = ({ children }: AllProvidersProps) => {
  return (
    <ThemeProvider>
      <UserProvider>
        <OnlineStatusProvider>
          {children}
        </OnlineStatusProvider>
      </UserProvider>
    </ThemeProvider>
  );
};

// Extended providers with additional contexts needed for certain components
const ExtendedProviders = ({ children }: AllProvidersProps) => {
  return (
    <ThemeProvider>
      <UserProvider>
        <OnlineStatusProvider>
          <ChatSelectionProvider>
            {children}
          </ChatSelectionProvider>
        </OnlineStatusProvider>
      </UserProvider>
    </ThemeProvider>
  );
};

// Standard render with BrowserRouter and base providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult => render(
  <BrowserRouter>
    <AllProviders>{ui}</AllProviders>
  </BrowserRouter>,
  options
);

// Render with extended providers including ChatSelectionProvider
const renderWithExtendedProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult => render(
  <BrowserRouter>
    <ExtendedProviders>{ui}</ExtendedProviders>
  </BrowserRouter>,
  options
);

// Render with memory router for testing specific routes
interface RenderWithRouteOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  paths?: Record<string, React.ComponentType<any>>;
}

const renderWithRoute = (
  ui: ReactElement,
  { 
    route = '/', 
    paths = {}, 
    ...options 
  }: RenderWithRouteOptions = {}
): RenderResult => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AllProviders>
        <Routes>
          {Object.entries(paths).map(([path, Component]) => (
            <Route key={path} path={path} element={<Component />} />
          ))}
          <Route path="*" element={ui} />
        </Routes>
      </AllProviders>
    </MemoryRouter>,
    options
  );
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { 
  customRender as render,
  renderWithExtendedProviders,
  renderWithRoute,
  AllProviders,
  ExtendedProviders
};

// Mock navigation
export const mockNavigate = jest.fn();
export const mockLocation = {
  pathname: '/',
  search: '',
  hash: '',
  state: null
};

// Comprehensive React Router DOM mock
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
  useMatch: () => null
}));

// Authentication helpers
export const mockAuthenticatedUser = (userData = { 
  username: 'testuser', 
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER'
}) => {
  localStorage.setItem('token', 'fake-jwt-token');
  localStorage.setItem('user', JSON.stringify(userData));
};

export const mockAuthenticatedAdmin = () => {
  mockAuthenticatedUser({
    username: 'admin',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN'
  });
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// WebSocket test helpers
export const mockWebSocketMessage = (message: any) => {
  // Access the MockWebSocket global and trigger a message
  const mockWsInstances = (global.WebSocket as any).mock?.instances;
  if (mockWsInstances && mockWsInstances.length > 0) {
    const mockWs = mockWsInstances[mockWsInstances.length - 1];
    if (mockWs && typeof mockWs.mockReceiveMessage === 'function') {
      mockWs.mockReceiveMessage(message);
    }
  }
};

// Wait for condition helper
export const waitForCondition = (
  condition: () => boolean, 
  { timeout = 1000, interval = 50 } = {}
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkCondition = () => {
      if (condition()) {
        resolve();
        return;
      }
      
      if (Date.now() - startTime >= timeout) {
        reject(new Error(`Timed out waiting for condition after ${timeout}ms`));
        return;
      }
      
      setTimeout(checkCondition, interval);
    };
    
    checkCondition();
  });
};