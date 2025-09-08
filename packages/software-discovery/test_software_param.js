#!/usr/bin/env node

import axios from 'axios';

const API_KEY = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;
const BASE_URL = 'https://ara-db.ccs.uky.edu';

if (!API_KEY) {
  console.log('Please set SDS_API_KEY or VITE_SDS_API_KEY environment variable');
  process.exit(1);
}

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'User-Agent': 'access-mcp-software-discovery-test/1.0.0'
  },
  validateStatus: () => true
});

async function testSoftwareParameter() {
  console.log('Testing SDS API with software= parameter...\n');
  
  // Test 1: Try software parameter without resource
  console.log('1. Testing API with software= parameter (no resource):');
  try {
    const response1 = await client.get(`/api=API_0/${API_KEY}?software=python`);
    console.log(`Status: ${response1.status}`);
    if (response1.status === 200) {
      console.log(`Success! Found ${Array.isArray(response1.data) ? response1.data.length : 0} results`);
      if (Array.isArray(response1.data) && response1.data.length > 0) {
        console.log(`Sample result: ${JSON.stringify(response1.data[0], null, 2).substring(0, 500)}...\n`);
      }
    } else {
      console.log(`Response: ${JSON.stringify(response1.data, null, 2).substring(0, 500)}...\n`);
    }
  } catch (error) {
    console.log(`Error: ${error.message}\n`);
  }

  // Test 2: Try software_name parameter
  console.log('2. Testing API with software_name= parameter:');
  try {
    const response2 = await client.get(`/api=API_0/${API_KEY}?software_name=tensorflow`);
    console.log(`Status: ${response2.status}`);
    if (response2.status === 200) {
      console.log(`Success! Found ${Array.isArray(response2.data) ? response2.data.length : 0} results`);
      if (Array.isArray(response2.data) && response2.data.length > 0) {
        console.log(`Sample result: ${JSON.stringify(response2.data[0], null, 2).substring(0, 500)}...\n`);
      }
    } else {
      console.log(`Response: ${JSON.stringify(response2.data, null, 2).substring(0, 500)}...\n`);
    }
  } catch (error) {
    console.log(`Error: ${error.message}\n`);
  }

  // Test 3: Try search parameter
  console.log('3. Testing API with search= parameter:');
  try {
    const response3 = await client.get(`/api=API_0/${API_KEY}?search=gromacs`);
    console.log(`Status: ${response3.status}`);
    if (response3.status === 200) {
      console.log(`Success! Found ${Array.isArray(response3.data) ? response3.data.length : 0} results`);
      if (Array.isArray(response3.data) && response3.data.length > 0) {
        console.log(`Sample result: ${JSON.stringify(response3.data[0], null, 2).substring(0, 500)}...\n`);
      }
    } else {
      console.log(`Response: ${JSON.stringify(response3.data, null, 2).substring(0, 500)}...\n`);
    }
  } catch (error) {
    console.log(`Error: ${error.message}\n`);
  }

  // Test 4: Try query parameter
  console.log('4. Testing API with query= parameter:');
  try {
    const response4 = await client.get(`/api=API_0/${API_KEY}?query=matlab`);
    console.log(`Status: ${response4.status}`);
    if (response4.status === 200) {
      console.log(`Success! Found ${Array.isArray(response4.data) ? response4.data.length : 0} results`);
      if (Array.isArray(response4.data) && response4.data.length > 0) {
        console.log(`Sample result: ${JSON.stringify(response4.data[0], null, 2).substring(0, 500)}...\n`);
      }
    } else {
      console.log(`Response: ${JSON.stringify(response4.data, null, 2).substring(0, 500)}...\n`);
    }
  } catch (error) {
    console.log(`Error: ${error.message}\n`);
  }

  // Test 5: Try filter parameter  
  console.log('5. Testing API with filter= parameter:');
  try {
    const response5 = await client.get(`/api=API_0/${API_KEY}?filter=pytorch`);
    console.log(`Status: ${response5.status}`);
    if (response5.status === 200) {
      console.log(`Success! Found ${Array.isArray(response5.data) ? response5.data.length : 0} results`);
      if (Array.isArray(response5.data) && response5.data.length > 0) {
        console.log(`Sample result: ${JSON.stringify(response5.data[0], null, 2).substring(0, 500)}...\n`);
      }
    } else {
      console.log(`Response: ${JSON.stringify(response5.data, null, 2).substring(0, 500)}...\n`);
    }
  } catch (error) {
    console.log(`Error: ${error.message}\n`);
  }

  // Test 6: Try combining software with rp=all
  console.log('6. Testing API with rp=all and software= parameter:');
  try {
    const response6 = await client.get(`/api=API_0/${API_KEY}/rp=all?software=python`);
    console.log(`Status: ${response6.status}`);
    if (response6.status === 200) {
      console.log(`Success! Found ${Array.isArray(response6.data) ? response6.data.length : 0} results`);
      if (Array.isArray(response6.data) && response6.data.length > 0) {
        console.log(`Sample result: ${JSON.stringify(response6.data[0], null, 2).substring(0, 500)}...\n`);
      }
    } else {
      console.log(`Response: ${JSON.stringify(response6.data, null, 2).substring(0, 500)}...\n`);
    }
  } catch (error) {
    console.log(`Error: ${error.message}\n`);
  }
}

testSoftwareParameter().catch(console.error);