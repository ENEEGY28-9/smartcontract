// Test auto-mint endpoint directly
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjM0NTk1NjgsImlkIjoidGd5NnQ5N2lxaGQwd2xsIiwidHlwZSI6ImFkbWluIn0.18ykZHuS0MN_jkOzJk6P4O8j4KWwug8U4NIX-staH4E';

console.log('Testing auto-mint endpoint...\n');

fetch('http://localhost:8090/api/admin/auto-mint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({amount: 1000})
})
.then(r => {
  console.log('Response status:', r.status);
  return r.json();
})
.then(d => {
  console.log('Auto-mint result:');
  console.log(JSON.stringify(d, null, 2));
})
.catch(e => console.log('Error:', e));

