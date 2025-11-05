import fetch from 'node-fetch';  
  
async function test() {  
  console.log('Testing real blockchain...');  
  try {  
    const response = await fetch('http://localhost:8080/api/health');  
    console.log('Gateway status:', response.ok ? 'RUNNING' : 'NOT RUNNING');  
  } catch(e) { console.log('Error:', e.message); }  
}  
  
test(); 
