/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        paper: '#F7F1E3',
        'paper-raised': '#FFF9ED',
        purple: '#6D3CEB',
        'purple-dark': '#4D1FB8',
        ink: '#141116',
        muted: '#716B75',
        line: '#D8CEBE',
        danger: '#B42318',
        'folder-red': '#D9554D',
        'folder-green': '#46A758',
        'folder-orange': '#E58A2B',
        'folder-pink': '#D95D8A',
        'folder-blue': '#3F7CCF',
        'folder-teal': '#2E9C91',
        'folder-yellow': '#E2B93F',
        'folder-black': '#2B272D',
        'folder-gray': '#CFCDD2',
      },
      fontFamily: {
        sans: ['DMSans_400Regular'],
        'sans-medium': ['DMSans_600SemiBold'],
        display: ['Fraunces_700Bold'],
      },
      boxShadow: {
        card: '4px 5px 0px rgba(20, 17, 22, 0.95)',
      },
    },
  },
  plugins: [],
};
