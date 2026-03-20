/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: '#f2f0eb',
        tasklist: '#F7F7F8',
        taskitem: '#EBEBEB',
        promptbg: '#F9F9F9',
        userbubble: '#F5F5F5',
        primary: '#111111',
        muted: '#666666',
        accent: '#008040',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
