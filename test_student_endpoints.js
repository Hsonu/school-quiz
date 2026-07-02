require('dotenv').config();
const jwt = require('jsonwebtoken');
const jwtConfig = require('./config/jwt');
const http = require('http');

const token = jwt.sign(
  { id: '6a40c5b0fd58313dab5f8f01', role: 'student' },
  jwtConfig.secret,
  { expiresIn: '1h' }
);

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5050,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: JSON.parse(data)
        });
      });
    });

    req.on('error', err => reject(err));
    req.end();
  });
}

async function test() {
  try {
    const semesters = await makeRequest('/api/principal/semesters');
    console.log('Semesters response status:', semesters.statusCode);
    console.log('Semesters response body:', semesters.body);

    const courses = await makeRequest('/api/principal/courses');
    console.log('Courses response status:', courses.statusCode);
    console.log('Courses response body:', courses.body);
  } catch (err) {
    console.error('Request failed:', err);
  }
}

test();
