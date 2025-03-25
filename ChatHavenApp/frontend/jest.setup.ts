// Import Jest DOM matchers
import '@testing-library/jest-dom';

// Make React available globally for tests
import React from 'react';
global.React = React;

// Add a global fetch mock if needed
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
  } as Response)
);