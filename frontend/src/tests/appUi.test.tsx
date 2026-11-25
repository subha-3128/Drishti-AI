import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

describe('Drishti AI Accessible UI (Royal Ivory Stitch)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('walks through onboarding carousel, opens Home Dashboard, toggles theme, and opens Offline & Help views', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Welcome to Drishti AI/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/does NOT replace a white cane/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /2\. Voice/i }));
    expect(screen.getByText(/Voice guidance/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /I Understand — Continue/i }));
    expect(screen.getByRole('button', { name: /Start Navigation Assistance/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /System Status/i })).toBeInTheDocument();

    // Theme switch updates root data-theme attribute
    expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast-light');
    fireEvent.click(screen.getByRole('button', { name: /Switch Light or Dark theme/i }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast-dark');

    // Open Offline Status sub-view
    fireEvent.click(screen.getByRole('button', { name: /Open Model and Offline Status details/i }));
    expect(screen.getByText(/Model & Offline Status/i)).toBeInTheDocument();
    expect(screen.getByText(/efficientdet_lite0\.tflite/i)).toBeInTheDocument();

    // Navigate to Settings and Help tabs
    fireEvent.click(screen.getByRole('button', { name: /^Settings$/i }));
    expect(screen.getByText(/Cactus Whistle voice commands/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Help$/i }));
    expect(screen.getByText(/What Drishti AI can do/i)).toBeInTheDocument();
  });
});
