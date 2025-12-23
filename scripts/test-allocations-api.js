#!/usr/bin/env node

/**
 * Test Allocations API Data
 *
 * Fetch actual data from allocations API to verify institution values
 */

async function testAllocationsAPI() {
  console.log("🔬 Testing Allocations API Institution Data\n");
  console.log("═".repeat(80) + "\n");

  const baseURL = "https://allocations.access-ci.org";
  const url = `${baseURL}/current-projects.json?page=1`;

  console.log(`Fetching: ${url}\n`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log(`✅ Success!\n`);
    console.log(`Total Pages: ${data.pages || "N/A"}`);
    console.log(`Projects on Page 1: ${data.projects?.length || 0}\n`);

    if (data.projects && data.projects.length > 0) {
      console.log("Sample Project Structure:");
      console.log(JSON.stringify(data.projects[0], null, 2));

      console.log("\n" + "═".repeat(80) + "\n");
      console.log("PI Institutions from First 10 Projects:\n");

      const institutions = new Map();

      data.projects.slice(0, 20).forEach((project, idx) => {
        const institution = project.piInstitution || "NO INSTITUTION FIELD";
        console.log(`${idx + 1}. ${project.requestTitle || "No Title"}`);
        console.log(`   PI: ${project.pi || "No PI"}`);
        console.log(`   Institution: ${institution}\n`);

        institutions.set(institution, (institutions.get(institution) || 0) + 1);
      });

      console.log("═".repeat(80) + "\n");
      console.log("Institution Distribution (first 20 projects):\n");

      Array.from(institutions.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([inst, count]) => {
          console.log(`${count}x - ${inst}`);
        });

      // Check if all projects have the same institution
      const uniqueInstitutions = new Set(data.projects.map((p) => p.piInstitution));
      console.log("\n" + "═".repeat(80) + "\n");
      console.log(`Unique Institutions in Full Dataset: ${uniqueInstitutions.size}`);

      if (uniqueInstitutions.size === 1) {
        console.log("\n⚠️  WARNING: All projects have the SAME institution!");
        console.log(`    Institution: ${Array.from(uniqueInstitutions)[0]}`);
        console.log("    This suggests test/demo data.\n");
      } else if (uniqueInstitutions.size < 5) {
        console.log("\n⚠️  WARNING: Very few unique institutions");
        console.log("    This might be test/demo data.\n");
      } else {
        console.log("\n✅ Good diversity in institutions - looks like real data\n");
      }

      console.log(`All unique institutions:\n`);
      Array.from(uniqueInstitutions)
        .slice(0, 20)
        .forEach((inst) => {
          console.log(`  • ${inst}`);
        });
    } else {
      console.log("No projects found in response");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Run the test
testAllocationsAPI();
