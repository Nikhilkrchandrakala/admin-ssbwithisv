// config.js

const config = {
  backendBaseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001'
    : 'https://api.ssbwithisv.in',
};


// 