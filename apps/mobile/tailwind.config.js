/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand palette
        primary: {
          DEFAULT: '#3b82f6',   // blue-500
          dark:    '#2563eb',   // blue-600
          light:   '#60a5fa',   // blue-400
        },
        // Dark backgrounds
        bg: {
          DEFAULT: '#0f0f0f',   // near-black
          surface: '#1a1a1a',   // card / bubble bg
          elevated:'#242424',   // modals / sheets
          input:   '#1e1e1e',   // input fields
        },
        // Text
        text: {
          primary:   '#f0f0f0',
          secondary: '#9ca3af', // gray-400
          muted:     '#6b7280', // gray-500
        },
        // Chat bubbles
        bubble: {
          own:    '#2563eb',    // own message
          other:  '#262626',    // other's message
        },
        // Status
        online:  '#22c55e',     // green-500
        danger:  '#ef4444',     // red-500
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
}
