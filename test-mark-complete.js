// Test mark complete functionality
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Mock authentication token - you'll need to replace this with a real token
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3MTNkYTNkNDYyNGY3YzBlNDM1NzNjOSIsImlhdCI6MTcyOTM2MzAzNiwiZXhwIjoxNzMyNTIzNTM2fQ.Qp3uCHyDPuOCo0Bka5uQJT2TGJ_3d5SN9XwCQN2JMTs';

// Test course and lecture IDs from our existing data
const courseId = '68ebee953d3b19e14a5e5d36';
const lectureId = '68ebee953d3b19e14a5e5d37'; // First lecture ID

async function testMarkComplete() {
  try {
    console.log('🧪 Testing mark lecture complete...');
    console.log('Course ID:', courseId);
    console.log('Lecture ID:', lectureId);
    
    const response = await axios.post(
      `${API_BASE_URL}/courses/${courseId}/lectures/${lectureId}/complete`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Success! Response:', response.data);
    
    // Test getting progress
    console.log('\n📊 Getting progress...');
    const progressResponse = await axios.get(
      `${API_BASE_URL}/courses/${courseId}/progress`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('📈 Progress:', progressResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

testMarkComplete();