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

async function testSoftwareWithResource() {
  console.log('Testing SDS API with software= parameter combined with resource...\n');
  
  // Test 1: Resource with software filter parameter
  console.log('1. Testing with resource AND software= parameter:');
  try {
    const response1 = await client.get(`/api=API_0/${API_KEY}/rp=delta.ncsa.access-ci.org?software=python`);
    console.log(`Status: ${response1.status}`);
    if (response1.status === 200) {
      console.log(`Success! Found ${Array.isArray(response1.data) ? response1.data.length : 0} results`);
      if (Array.isArray(response1.data) && response1.data.length > 0) {
        console.log(`First 3 results:`);
        response1.data.slice(0, 3).forEach(pkg => {
          console.log(`  - ${pkg.software_name}: ${pkg.software_description?.substring(0, 50)}...`);
        });
      }
    } else {
      console.log(`Failed: ${response1.status}`);
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }

  console.log('\n2. Testing with resource AND filter= parameter:');
  try {
    const response2 = await client.get(`/api=API_0/${API_KEY}/rp=delta.ncsa.access-ci.org?filter=tensorflow`);
    console.log(`Status: ${response2.status}`);
    if (response2.status === 200) {
      console.log(`Success! Found ${Array.isArray(response2.data) ? response2.data.length : 0} results`);
      if (Array.isArray(response2.data) && response2.data.length > 0) {
        console.log(`First 3 results:`);
        response2.data.slice(0, 3).forEach(pkg => {
          console.log(`  - ${pkg.software_name}: ${pkg.software_description?.substring(0, 50)}...`);
        });
      }
    } else {
      console.log(`Failed: ${response2.status}`);
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }

  console.log('\n3. Testing with resource AND search= parameter:');
  try {
    const response3 = await client.get(`/api=API_0/${API_KEY}/rp=delta.ncsa.access-ci.org?search=gpu`);
    console.log(`Status: ${response3.status}`);
    if (response3.status === 200) {
      console.log(`Success! Found ${Array.isArray(response3.data) ? response3.data.length : 0} results`);
      if (Array.isArray(response3.data) && response3.data.length > 0) {
        console.log(`First 3 results:`);
        response3.data.slice(0, 3).forEach(pkg => {
          console.log(`  - ${pkg.software_name}: ${pkg.software_description?.substring(0, 50)}...`);
        });
      }
    } else {
      console.log(`Failed: ${response3.status}`);
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }

  console.log('\n4. Comparing filtered vs unfiltered:');
  try {
    // Get unfiltered
    const unfiltered = await client.get(`/api=API_0/${API_KEY}/rp=delta.ncsa.access-ci.org?include=software_name`);
    const unfilteredCount = Array.isArray(unfiltered.data) ? unfiltered.data.length : 0;
    
    // Get filtered
    const filtered = await client.get(`/api=API_0/${API_KEY}/rp=delta.ncsa.access-ci.org?include=software_name&software=python`);
    const filteredCount = Array.isArray(filtered.data) ? filtered.data.length : 0;
    
    console.log(`Unfiltered results: ${unfilteredCount}`);
    console.log(`Filtered with software=python: ${filteredCount}`);
    
    if (filteredCount < unfilteredCount && filteredCount > 0) {
      console.log(`✓ Filter appears to be working! Reduced from ${unfilteredCount} to ${filteredCount} results`);
    } else if (filteredCount === unfilteredCount) {
      console.log(`✗ Filter doesn't seem to be working - same number of results`);
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

testSoftwareWithResource().catch(console.error);