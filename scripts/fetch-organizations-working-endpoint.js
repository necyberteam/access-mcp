#!/usr/bin/env node

/**
 * Fetch Organizations from Working Endpoint
 *
 * Use the discovered working endpoint to get all organization data
 */

import axios from 'axios';

const API_BASE = 'https://operations-api.access-ci.org';

async function fetchOrganizations() {
  console.log('📥 Fetching Organizations from Working Endpoint\n');
  console.log('Endpoint: /wh2/cider/v1/organizations/\n');
  console.log('═'.repeat(80) + '\n');

  try {
    const response = await axios.get(
      `${API_BASE}/wh2/cider/v1/organizations/`,
      { timeout: 10000 }
    );

    if (response.status !== 200) {
      console.error(`❌ Error: ${response.status} ${response.statusText}`);
      return;
    }

    const organizations = response.data.results || [];
    console.log(`✅ Found ${organizations.length} organizations\n`);

    if (organizations.length === 0) {
      console.log('No organizations returned');
      return;
    }

    // Show structure of first organization
    console.log('Sample Organization Structure:');
    console.log(JSON.stringify(organizations[0], null, 2));
    console.log('\n' + '═'.repeat(80) + '\n');

    // Create mapping based on what fields are available
    console.log('All Organizations:\n');

    // Try to find the ID field
    const idField = organizations[0].organization_id ? 'organization_id' :
                    organizations[0].info_groupid ? 'info_groupid' :
                    organizations[0].id ? 'id' :
                    organizations[0].groupid ? 'groupid' : null;

    const nameField = organizations[0].organization_name ? 'organization_name' :
                      organizations[0].organization_descriptive_name ? 'organization_descriptive_name' :
                      organizations[0].name ? 'name' :
                      organizations[0].descriptive_name ? 'descriptive_name' : null;

    console.log(`ID Field: ${idField || 'UNKNOWN'}`);
    console.log(`Name Field: ${nameField || 'UNKNOWN'}\n`);

    // List all organizations
    organizations.forEach(org => {
      const id = idField ? org[idField] : 'N/A';
      const name = nameField ? org[nameField] : 'N/A';
      console.log(`${id}: ${name}`);
    });

    console.log('\n' + '═'.repeat(80) + '\n');

    // Now map to our known org IDs from compute resources
    console.log('Mapping to Compute Resource Organization IDs:\n');

    const knownResourceOrgIds = [
      178, 467, 471, 476, 561, 563, 653, 844, 848, 856,
      1869, 2000, 2058, 2440, 4659, 12964, 14449, 16235, 19169
    ];

    console.log('Checking which of our 19 org IDs are in this list...\n');

    knownResourceOrgIds.forEach(targetId => {
      const found = organizations.find(org => {
        const orgId = idField ? org[idField] : null;
        return orgId === targetId || orgId === targetId.toString();
      });

      if (found) {
        const name = nameField ? found[nameField] : 'N/A';
        console.log(`✓ ${targetId}: ${name}`);
      } else {
        console.log(`✗ ${targetId}: NOT FOUND in organizations endpoint`);
      }
    });

    console.log('\n' + '═'.repeat(80) + '\n');

    // Generate TypeScript mapping
    console.log('TypeScript Mapping (for found organizations):\n');
    console.log('private readonly KNOWN_ORGANIZATIONS: Record<number, string> = {');

    const mappedOrgs = [];
    knownResourceOrgIds.forEach(targetId => {
      const found = organizations.find(org => {
        const orgId = idField ? org[idField] : null;
        return orgId === targetId || orgId === targetId.toString();
      });

      if (found) {
        const name = nameField ? found[nameField] : 'Unknown';
        mappedOrgs.push({ id: targetId, name });
      }
    });

    // Sort by ID
    mappedOrgs.sort((a, b) => a.id - b.id);

    mappedOrgs.forEach(org => {
      console.log(`  ${org.id}: "${org.name}",`);
    });

    console.log('};');

    console.log('\n' + '═'.repeat(80) + '\n');
    console.log(`Coverage: ${mappedOrgs.length}/${knownResourceOrgIds.length} organization IDs mapped`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run
fetchOrganizations();
