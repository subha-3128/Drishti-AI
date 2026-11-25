import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

describe('Drishti AI Accessible UI', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows onboarding disclaimer first and unlocks Start Assistance after acknowledgement', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Welcome to Drishti AI/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/does NOT replace a white cane/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /I Understand — Continue/i }));
    expect(screen.getByRole('button', { name: /Start Navigation Assistance/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /System Status/i })).toBeInTheDocument();
  });
});
