export default {
  content: [
    './index.html',
    './*.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#ffffff',
          text: '#161616',
          muted: '#8b8b8b',
          line: '#ececec',
          accent: '#1f83ff',
          soft: '#edf5ff',
        },
      },
      maxWidth: {
        app: '500px',
      },
    },
  },
};
