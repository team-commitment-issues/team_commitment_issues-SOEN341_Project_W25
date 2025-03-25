import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext';

// Create a test component that uses the ThemeContext
const TestComponent = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <div data-testid="theme-value">{theme}</div>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Reset body classes
    document.body.className = '';
  });
  
  it('provides theme value and toggleTheme function', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    // Initial theme should be light
    expect(screen.getByTestId('theme-value')).toHaveTextContent('light');
    
    // Toggle theme
    fireEvent.click(screen.getByRole('button', { name: /Toggle Theme/i }));
    
    // Theme should be dark after toggle
    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
    
    // Toggle theme again
    fireEvent.click(screen.getByRole('button', { name: /Toggle Theme/i }));
    
    // Theme should be light again
    expect(screen.getByTestId('theme-value')).toHaveTextContent('light');
  });
  
  it('adds/removes dark-mode class on body element', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    // Initially, body should not have dark-mode class
    expect(document.body.classList.contains('dark-mode')).toBe(false);
    
    // Toggle theme
    fireEvent.click(screen.getByRole('button', { name: /Toggle Theme/i }));
    
    // After toggle, body should have dark-mode class
    expect(document.body.classList.contains('dark-mode')).toBe(true);
    
    // Toggle theme again
    fireEvent.click(screen.getByRole('button', { name: /Toggle Theme/i }));
    
    // After second toggle, dark-mode class should be removed
    expect(document.body.classList.contains('dark-mode')).toBe(false);
  });
  
  it('saves theme preference to localStorage', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    // Toggle theme
    fireEvent.click(screen.getByRole('button', { name: /Toggle Theme/i }));
    
    // After toggle, localStorage should have theme value 'dark'
    expect(localStorage.getItem('theme')).toBe('dark');
    
    // Toggle theme again
    fireEvent.click(screen.getByRole('button', { name: /Toggle Theme/i }));
    
    // After second toggle, localStorage should have theme value 'light'
    expect(localStorage.getItem('theme')).toBe('light');
  });
  
  it('reads initial theme from localStorage if available', () => {
    // Set initial theme in localStorage
    localStorage.setItem('theme', 'dark');
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    // Initial theme should be dark (from localStorage)
    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
    expect(document.body.classList.contains('dark-mode')).toBe(true);
  });
});