#!/usr/bin/env node

/**
 * Test FIXED Institution Matching Logic
 *
 * Verify the fix prevents false positive matches
 */

// Simulate the normalizeInstitutionName method
function normalizeInstitutionName(name) {
  return name
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Common words that should be ignored in word overlap matching
const COMMON_INSTITUTION_WORDS = new Set([
  'university', 'institute', 'college', 'school', 'center',
  'academy', 'polytechnic', 'tech', 'state', 'national'
]);

// Simulate matchesInstitution method (FIXED VERSION)
function matchesInstitution(institutionText, searchVariants) {
  const normalizedText = normalizeInstitutionName(institutionText).toLowerCase();

  for (const variant of searchVariants) {
    const normalizedVariant = variant.toLowerCase();

    // Tier 1: Exact match
    if (normalizedText === normalizedVariant) {
      return { match: true, reason: 'exact match', variant };
    }

    // Tier 2: Full variant contained (with length check)
    if (normalizedVariant.length > 8 && normalizedText.includes(normalizedVariant)) {
      return { match: true, reason: 'substring match', variant };
    }

    // Tier 3: Word overlap (FIXED: excludes common words)
    const textWords = new Set(
      normalizedText.split(/\s+/)
        .filter(w => w.length > 3 && !COMMON_INSTITUTION_WORDS.has(w))
    );

    const variantWords = normalizedVariant.split(/\s+/)
      .filter(w => w.length > 3 && !COMMON_INSTITUTION_WORDS.has(w));

    if (variantWords.length > 0 && textWords.size > 0) {
      const matchingWords = variantWords.filter(word => textWords.has(word));
      const overlapRatio = matchingWords.length / variantWords.length;

      // Require EITHER high overlap (75%+) OR at least 2 matching significant words
      if (overlapRatio >= 0.75 || (matchingWords.length >= 2 && overlapRatio >= 0.5)) {
        return {
          match: true,
          reason: `word overlap ${overlapRatio.toFixed(2)} (${matchingWords.join(', ')})`,
          variant,
          matchingWords
        };
      }
    }
  }

  return { match: false, reason: 'no match' };
}

// Get institution variants (simplified)
function getInstitutionVariants(name) {
  const variants = [name];

  // Known mappings
  const knownMappings = {
    'Stanford University': ['Stanford', 'Leland Stanford Junior University'],
    'University of Colorado Boulder': [
      'CU Boulder',
      'Colorado Boulder',
      'University of Colorado at Boulder',
      'University of Colorado'
    ]
  };

  for (const [canonical, alternates] of Object.entries(knownMappings)) {
    if (name.toLowerCase().includes(canonical.toLowerCase())) {
      variants.push(canonical, ...alternates);
    }
  }

  // Generate patterns
  if (name.startsWith('University of ')) {
    const location = name.replace(/^University of /, '');
    variants.push(location + ' University');
  } else if (name.endsWith(' University')) {
    const prefix = name.replace(/ University$/, '');
    variants.push('University of ' + prefix);
  }

  return [...new Set(variants)];
}

console.log('🔬 Testing FIXED Institution Matching Logic\n');
console.log('═'.repeat(80) + '\n');

// Test cases
const testInstitutions = [
  'Stanford University',
  'University of Colorado Boulder'
];

const actualInstitutions = [
  'University of California, Berkeley',
  'Carnegie Mellon University',
  'Stanford University',
  'University of Colorado Boulder',
  'University of Illinois at Urbana-Champaign'
];

let totalMatches = {};

testInstitutions.forEach(searchInst => {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`\nSEARCH: "${searchInst}"\n`);

  const normalized = normalizeInstitutionName(searchInst);
  const variants = getInstitutionVariants(normalized);

  console.log(`Normalized: "${normalized}"`);
  console.log(`Variants Generated (${variants.length}):`);
  variants.forEach(v => console.log(`  • ${v}`));

  console.log(`\nMatching Against Actual Institutions:\n`);

  const matches = [];

  actualInstitutions.forEach(actualInst => {
    const result = matchesInstitution(actualInst, variants);
    const symbol = result.match ? '✓' : '✗';
    const color = result.match ? '\x1b[32m' : '\x1b[31m'; // green or red
    const reset = '\x1b[0m';

    console.log(`${color}${symbol}${reset} ${actualInst}`);
    if (result.match) {
      console.log(`    → ${result.reason} (variant: "${result.variant}")`);
      if (result.matchingWords) {
        console.log(`    → Significant words matched: [${result.matchingWords.join(', ')}]`);
      }
      matches.push(actualInst);
    }
  });

  totalMatches[searchInst] = matches;
});

console.log('\n' + '═'.repeat(80) + '\n');

// Verification
console.log('\n✅ VERIFICATION:\n');

let allPassed = true;

if (totalMatches['Stanford University'].length === 1 &&
    totalMatches['Stanford University'][0] === 'Stanford University') {
  console.log('✓ Stanford University: CORRECT (1 match, correct institution)');
} else {
  console.log('✗ Stanford University: FAILED');
  console.log(`  Expected: 1 match (Stanford University)`);
  console.log(`  Got: ${totalMatches['Stanford University'].length} matches`);
  console.log(`  Matches: ${totalMatches['Stanford University'].join(', ')}`);
  allPassed = false;
}

if (totalMatches['University of Colorado Boulder'].length === 1 &&
    totalMatches['University of Colorado Boulder'][0] === 'University of Colorado Boulder') {
  console.log('✓ CU Boulder: CORRECT (1 match, correct institution)');
} else {
  console.log('✗ CU Boulder: FAILED');
  console.log(`  Expected: 1 match (University of Colorado Boulder)`);
  console.log(`  Got: ${totalMatches['University of Colorado Boulder'].length} matches`);
  console.log(`  Matches: ${totalMatches['University of Colorado Boulder'].join(', ')}`);
  allPassed = false;
}

console.log('\n' + '═'.repeat(80) + '\n');

if (allPassed) {
  console.log('🎉 ALL TESTS PASSED! Institution matching is working correctly.\n');
  console.log('Stanford and CU Boulder now return DIFFERENT results (as expected).\n');
} else {
  console.log('⚠️  TESTS FAILED! There are still false positive matches.\n');
}
