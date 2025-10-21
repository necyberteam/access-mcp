#!/usr/bin/env node

/**
 * Organization API Investigation
 *
 * Comprehensive investigation of ACCESS-CI organization endpoints to:
 * 1. Identify why endpoints are failing
 * 2. Find alternative working endpoints
 * 3. Document the issue for ACCESS-CI team
 */

import axios from 'axios';

const API_BASE = 'https://operations-api.access-ci.org';

async function investigateOrganizationAPI() {
  console.log('🔬 Investigating ACCESS-CI Organization API Endpoints\n');
  console.log('═'.repeat(80) + '\n');

  // Test 1: Organizations endpoint (active-groups pattern)
  console.log('TEST 1: Active Groups - Organizations\n');
  console.log('Endpoint: /wh2/cider/v1/access-active-groups/type/organizations.access-ci.org/\n');

  try {
    const response = await axios.get(
      `${API_BASE}/wh2/cider/v1/access-active-groups/type/organizations.access-ci.org/`,
      {
        timeout: 10000,
        validateStatus: () => true // Accept any status
      }
    );

    console.log(`Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    console.log(`\nResponse Structure:`);
    console.log(JSON.stringify(response.data, null, 2).substring(0, 500));

    if (response.data?.results?.active_groups) {
      console.log(`\nOrganizations Found: ${response.data.results.active_groups.length}`);
      if (response.data.results.active_groups.length > 0) {
        console.log(`\nFirst Organization Sample:`);
        console.log(JSON.stringify(response.data.results.active_groups[0], null, 2));
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log('\n' + '═'.repeat(80) + '\n');

  // Test 2: Individual organization lookup
  console.log('TEST 2: Individual Organization Lookup\n');
  console.log('Endpoint: /wh2/cider/v1/access-active/info_groupid/{orgId}/?format=json\n');

  const testOrgIds = [844, 856, 2058];

  for (const orgId of testOrgIds) {
    console.log(`\nTrying org ID ${orgId}:`);
    try {
      const response = await axios.get(
        `${API_BASE}/wh2/cider/v1/access-active/info_groupid/${orgId}/?format=json`,
        {
          timeout: 5000,
          validateStatus: () => true
        }
      );

      console.log(`  Status: ${response.status}`);
      if (response.status !== 200) {
        console.log(`  Error: ${response.statusText}`);
        console.log(`  Response: ${JSON.stringify(response.data).substring(0, 200)}`);
      } else {
        console.log(`  Success! Data keys: ${Object.keys(response.data).join(', ')}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '═'.repeat(80) + '\n');

  // Test 3: Check what's in the actual compute resources response
  console.log('TEST 3: Analyze Compute Resources Response\n');
  console.log('Endpoint: /wh2/cider/v1/access-active-groups/type/resource-catalog.access-ci.org/\n');

  try {
    const response = await axios.get(
      `${API_BASE}/wh2/cider/v1/access-active-groups/type/resource-catalog.access-ci.org/`,
      { timeout: 10000 }
    );

    const resources = response.data?.results?.active_groups || [];
    console.log(`Resources Found: ${resources.length}\n`);

    if (resources.length > 0) {
      const sample = resources[0];
      console.log('Sample Resource - All Fields:');
      console.log(JSON.stringify(sample, null, 2).substring(0, 1000));

      console.log('\n\nOrganization-Related Fields:');
      const orgFields = Object.keys(sample).filter(key =>
        key.toLowerCase().includes('org') ||
        key.toLowerCase().includes('institution') ||
        key.toLowerCase().includes('provider')
      );

      orgFields.forEach(field => {
        console.log(`  ${field}: ${JSON.stringify(sample[field])}`);
      });

      // Check if any resource has organization names (not IDs)
      console.log('\n\nSearching for resources with organization names...');
      let foundOrgNames = false;

      for (const resource of resources.slice(0, 10)) {
        if (resource.rollup_organization_ids && resource.rollup_organization_ids.length > 0) {
          console.log(`\n${resource.group_descriptive_name}:`);
          console.log(`  Org IDs: ${resource.rollup_organization_ids}`);

          // Check various possible fields
          const possibleNameFields = [
            'organization_names',
            'rollup_organization_names',
            'provider_names',
            'institution_names',
            'organization_descriptive_names'
          ];

          possibleNameFields.forEach(field => {
            if (resource[field]) {
              console.log(`  ${field}: ${JSON.stringify(resource[field])}`);
              foundOrgNames = true;
            }
          });
        }
      }

      if (!foundOrgNames) {
        console.log('  ❌ No organization name fields found in any resource');
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log('\n' + '═'.repeat(80) + '\n');

  // Test 4: Try alternative endpoint patterns
  console.log('TEST 4: Alternative Endpoint Patterns\n');

  const alternativeEndpoints = [
    '/wh2/cider/v1/organizations/',
    '/wh2/cider/v1/info-groups/type/organizations/',
    '/wh2/cider/v1/access-active/organizations/',
    '/wh2/glue2/v1/organizations/',
    '/wh2/cider/v1/resource-providers/',
  ];

  for (const endpoint of alternativeEndpoints) {
    console.log(`\nTrying: ${endpoint}`);
    try {
      const response = await axios.get(
        `${API_BASE}${endpoint}`,
        {
          timeout: 5000,
          validateStatus: () => true
        }
      );

      console.log(`  Status: ${response.status}`);

      if (response.status === 200) {
        console.log(`  ✓ Success!`);
        const dataKeys = Object.keys(response.data);
        console.log(`  Response keys: ${dataKeys.join(', ')}`);

        if (response.data.results) {
          console.log(`  Results count: ${response.data.results.length || 'N/A'}`);
        }
      } else if (response.status === 404) {
        console.log(`  ✗ Not Found`);
      } else {
        console.log(`  ⚠ ${response.statusText}`);
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
    }
  }

  console.log('\n' + '═'.repeat(80) + '\n');

  // Test 5: Check API documentation endpoint
  console.log('TEST 5: API Documentation/Schema\n');

  const docsEndpoints = [
    '/wh2/cider/v1/',
    '/wh2/',
    '/docs/',
    '/api/',
  ];

  for (const endpoint of docsEndpoints) {
    console.log(`\nTrying: ${endpoint}`);
    try {
      const response = await axios.get(
        `${API_BASE}${endpoint}`,
        {
          timeout: 5000,
          validateStatus: () => true,
          maxRedirects: 0
        }
      );

      if (response.status === 200) {
        console.log(`  ✓ Success! (Content length: ${response.data.length || 'N/A'})`);
      } else {
        console.log(`  Status: ${response.status}`);
      }
    } catch (error) {
      if (error.response?.status === 301 || error.response?.status === 302) {
        console.log(`  → Redirects to: ${error.response.headers.location}`);
      } else {
        console.log(`  ✗ ${error.message}`);
      }
    }
  }

  console.log('\n' + '═'.repeat(80) + '\n');
  console.log('Investigation Complete\n');
}

// Run the investigation
investigateOrganizationAPI();
