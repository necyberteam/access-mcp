#!/usr/bin/env node

import { BaseAccessServer, Tool, Resource, CallToolResult } from "@access-mcp/shared";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { version } = require("../package.json");

interface SearchNSFAwardsArgs {
  id?: string;
  query?: string;
  pi?: string;
  institution?: string;
  primary_only?: boolean;
  limit?: number;
}

// Raw NSF API award response structure
interface RawNSFAward {
  id?: string;
  title?: string;
  abstractText?: string;
  piFirstName?: string;
  piLastName?: string;
  coPDPI?: string;
  poName?: string;
  awardeeName?: string;
  awardeeCity?: string;
  awardeeStateCode?: string;
  fundsObligatedAmt?: string;
  estimatedTotalAmt?: string;
  startDate?: string;
  expDate?: string;
  primaryProgram?: string;
  ueiNumber?: string;
  fundProgramName?: string;
}

interface NSFAward {
  awardNumber: string;
  title: string;
  institution: string;
  principalInvestigator: string;
  coPIs: string[];
  totalIntendedAward: string;
  totalAwardedToDate: string;
  startDate: string;
  endDate: string;
  abstract: string;
  primaryProgram: string;
  programOfficer: string;
  ueiNumber: string;
}

export class NSFAwardsServer extends BaseAccessServer {
  constructor() {
    super("access-mcp-nsf-awards", version, "https://api.nsf.gov");
  }

  protected getTools(): Tool[] {
    return [
      {
        name: "search_nsf_awards",
        description: "Search NSF awards and funding. Returns {total, items}.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Award number (e.g., '2138259')",
            },
            query: {
              type: "string",
              description: "Search keywords in titles/abstracts",
            },
            pi: {
              type: "string",
              description: "Principal investigator name",
            },
            institution: {
              type: "string",
              description: "Institution name",
            },
            primary_only: {
              type: "boolean",
              description:
                "When searching by institution, only return awards where the institution is the PRIMARY recipient (excludes collaborative/co-PI awards from other institutions). Default: false",
              default: false,
            },
            limit: {
              type: "number",
              description: "Max results (default: 10)",
              default: 10,
            },
          },
        },
      },
    ];
  }

  protected getResources(): Resource[] {
    return [];
  }

  protected async handleToolCall(request: {
    method: "tools/call";
    params: { name: string; arguments?: Record<string, unknown> };
  }): Promise<CallToolResult> {
    const { name, arguments: args = {} } = request.params;
    const typedArgs = args as SearchNSFAwardsArgs;

    try {
      switch (name) {
        case "search_nsf_awards":
          return await this.searchNSFAwardsRouter(typedArgs);
        default:
          return this.errorResponse(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.errorResponse(message);
    }
  }

  protected async handleResourceRead(): Promise<never> {
    throw new Error("Resource reading not supported");
  }

  private async searchNSFAwardsRouter(args: SearchNSFAwardsArgs): Promise<CallToolResult> {
    if (args.id) {
      return await this.get_nsf_award({ award_number: args.id });
    }

    if (args.pi) {
      return await this.find_nsf_awards_by_pi({ pi_name: args.pi, limit: args.limit });
    }

    if (args.institution) {
      return await this.find_nsf_awards_by_institution({
        institution_name: args.institution,
        limit: args.limit,
        primary_only: args.primary_only || false,
      });
    }

    if (args.query) {
      return await this.find_nsf_awards_by_keywords({ keywords: args.query, limit: args.limit });
    }

    return this.errorResponse("Provide id, query, pi, or institution");
  }

  private async find_nsf_awards_by_pi(args: { pi_name: string; limit?: number }) {
    const awards = await this.searchNSFAwardsByPI(args.pi_name, args.limit || 10);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ total: awards.length, items: awards }),
        },
      ],
    };
  }

  private async get_nsf_award(args: { award_number: string }) {
    const award = await this.fetchNSFAwardData(args.award_number);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ total: 1, items: [award] }),
        },
      ],
    };
  }

  private async find_nsf_awards_by_institution(args: {
    institution_name: string;
    limit?: number;
    primary_only?: boolean;
  }) {
    let awards = await this.searchNSFAwardsByInstitution(args.institution_name, args.limit || 10);

    // If primary_only is requested, filter awards to only include those where
    // the queried institution is the primary recipient
    if (args.primary_only) {
      const normalizedInstitution = this.normalizeInstitutionName(args.institution_name);
      awards = awards.filter((award) => {
        const awardInstitution = this.normalizeInstitutionName(award.institution);
        return this.matchesInstitution(awardInstitution, [normalizedInstitution]);
      });
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ total: awards.length, items: awards }),
        },
      ],
    };
  }

  private async find_nsf_awards_by_keywords(args: { keywords: string; limit?: number }) {
    const awards = await this.searchNSFAwardsByKeywords(args.keywords, args.limit || 10);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ total: awards.length, items: awards }),
        },
      ],
    };
  }

  private async fetchNSFAwardData(awardNumber: string): Promise<NSFAward> {
    const cleanAwardNumber = awardNumber.replace(/[^0-9]/g, "");

    const apiUrl = `https://api.nsf.gov/services/v1/awards.json?id=${cleanAwardNumber}&printFields=id,title,abstractText,piFirstName,piLastName,coPDPI,poName,awardeeName,awardeeCity,awardeeStateCode,fundsObligatedAmt,estimatedTotalAmt,startDate,expDate,primaryProgram,ueiNumber,fundProgramName`;

    const response = await fetch(apiUrl, { redirect: "follow" });
    if (!response.ok) {
      throw new Error(`NSF API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.response?.award || data.response.award.length === 0) {
      throw new Error(`No NSF award found with number: ${awardNumber}`);
    }

    const award = data.response.award[0];
    return this.parseNSFAward(award);
  }

  private async searchNSFAwardsByPI(piName: string, limit: number): Promise<NSFAward[]> {
    // Use the correct NSF API parameter 'pdPIName' for PI name searches
    const searchStrategies = [
      {
        name: "Exact name match",
        params: `pdPIName=${encodeURIComponent(piName.replace(/\s+/g, "+"))}`,
      },
      {
        name: "Last name only",
        params: `pdPIName=${encodeURIComponent(piName.split(" ").pop()?.replace(/\s+/g, "+") || piName)}`,
      },
      {
        name: "First name only",
        params: `pdPIName=${encodeURIComponent(piName.split(" ")[0]?.replace(/\s+/g, "+") || piName)}`,
      },
    ];

    for (const strategy of searchStrategies) {
      try {
        const apiUrl = `https://api.nsf.gov/services/v1/awards.json?${strategy.params}&printFields=id,title,abstractText,piFirstName,piLastName,coPDPI,poName,awardeeName,awardeeCity,awardeeStateCode,fundsObligatedAmt,estimatedTotalAmt,startDate,expDate,primaryProgram,ueiNumber,fundProgramName&offset=1&rpp=100`;

        const response = await fetch(apiUrl, { redirect: "follow" });
        if (!response.ok) {
          continue;
        }

        const data = await response.json();

        if (data.response?.award && data.response.award.length > 0) {
          const awards = data.response.award
            .slice(0, Math.min(limit, 100))
            .map((award: RawNSFAward) => this.parseNSFAward(award));

          if (awards.length > 0) {
            return awards;
          }
        }
      } catch (error) {
        continue;
      }
    }

    return [];
  }

  private async searchNSFAwardsByPersonnel(personName: string, limit: number): Promise<NSFAward[]> {
    // Search both PI and Co-PI fields
    const awards: NSFAward[] = [];

    // First search as PI
    const piAwards = await this.searchNSFAwardsByPI(personName, limit);
    awards.push(...piAwards);

    // Then search Co-PI field (if we need more results)
    if (awards.length < limit) {
      try {
        const apiUrl = `https://api.nsf.gov/services/v1/awards.json?coPDPI=${encodeURIComponent(personName)}&printFields=id,title,abstractText,piFirstName,piLastName,coPDPI,poName,awardeeName,awardeeCity,awardeeStateCode,fundsObligatedAmt,estimatedTotalAmt,startDate,expDate,primaryProgram,ueiNumber,fundProgramName&offset=1&rpp=${Math.min(limit - awards.length, 100)}`;

        const response = await fetch(apiUrl, { redirect: "follow" });
        if (response.ok) {
          const data = await response.json();

          if (data.response?.award && data.response.award.length > 0) {
            const copiAwards = data.response.award.map((award: RawNSFAward) =>
              this.parseNSFAward(award)
            );
            awards.push(...copiAwards);
          }
        }
      } catch (error) {
        // Continue with PI results only
      }
    }

    return awards.slice(0, limit);
  }

  private async searchNSFAwardsByInstitution(
    institutionName: string,
    limit: number
  ): Promise<NSFAward[]> {
    try {
      const apiUrl = `https://api.nsf.gov/services/v1/awards.json?awardeeName=${encodeURIComponent(institutionName)}&printFields=id,title,abstractText,piFirstName,piLastName,coPDPI,poName,awardeeName,awardeeCity,awardeeStateCode,fundsObligatedAmt,estimatedTotalAmt,startDate,expDate,primaryProgram,ueiNumber,fundProgramName&offset=1&rpp=${Math.min(limit, 100)}`;

      const response = await fetch(apiUrl, { redirect: "follow" });
      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      if (data.response?.award && data.response.award.length > 0) {
        return data.response.award.map((award: RawNSFAward) => this.parseNSFAward(award));
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  private async searchNSFAwardsByKeywords(keywords: string, limit: number): Promise<NSFAward[]> {
    try {
      const apiUrl = `https://api.nsf.gov/services/v1/awards.json?keyword=${encodeURIComponent(keywords)}&printFields=id,title,abstractText,piFirstName,piLastName,coPDPI,poName,awardeeName,awardeeCity,awardeeStateCode,fundsObligatedAmt,estimatedTotalAmt,startDate,expDate,primaryProgram,ueiNumber,fundProgramName&offset=1&rpp=${Math.min(limit, 100)}`;

      const response = await fetch(apiUrl, { redirect: "follow" });
      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      if (data.response?.award && data.response.award.length > 0) {
        return data.response.award.map((award: RawNSFAward) => this.parseNSFAward(award));
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  private parseNSFAward(award: RawNSFAward): NSFAward {
    const coPIs =
      award.coPDPI && typeof award.coPDPI === "string"
        ? award.coPDPI.split(";").map((name: string) => name.trim())
        : [];

    return {
      awardNumber: award.id || "",
      title: award.title || "No title available",
      institution: award.awardeeName || "Unknown institution",
      principalInvestigator:
        `${award.piFirstName || ""} ${award.piLastName || ""}`.trim() || "Unknown PI",
      coPIs,
      totalIntendedAward: award.estimatedTotalAmt
        ? `$${parseInt(award.estimatedTotalAmt).toLocaleString()}`
        : "Amount not available",
      totalAwardedToDate: award.fundsObligatedAmt
        ? `$${parseInt(award.fundsObligatedAmt).toLocaleString()}`
        : "Amount not available",
      startDate: award.startDate || "Unknown",
      endDate: award.expDate || "Unknown",
      abstract: award.abstractText || "No abstract available",
      primaryProgram: award.primaryProgram || award.fundProgramName || "Unknown program",
      programOfficer: award.poName || "Unknown",
      ueiNumber: award.ueiNumber || "",
    };
  }

  private formatNSFAwardsResults(title: string, awards: NSFAward[], summary: string): string {
    let result = `🏆 **${title}**\n\n${summary}\n\n`;

    if (awards.length === 0) {
      result += "❌ **No awards found**\n\n";
      result += "**Suggestions:**\n";
      result += "• Try different name variations\n";
      result += "• Check spelling\n";
      result += "• Try searching by last name only\n";
      result += "• Use institution search instead\n";
      return result;
    }

    for (let i = 0; i < awards.length; i++) {
      const award = awards[i];
      result += `**${i + 1}. Award ${award.awardNumber}**\n`;
      result += `• **Title**: ${award.title}\n`;
      result += `• **PI**: ${award.principalInvestigator}\n`;
      result += `• **Institution**: ${award.institution}\n`;
      result += `• **Amount**: ${award.totalIntendedAward}\n`;
      result += `• **Period**: ${award.startDate} to ${award.endDate}\n`;
      result += `• **Program**: ${award.primaryProgram}\n`;

      if (award.coPIs.length > 0) {
        result += `• **Co-PIs**: ${award.coPIs.slice(0, 3).join("; ")}${award.coPIs.length > 3 ? " ..." : ""}\n`;
      }

      result += "\n";
    }

    result += `**💡 Next Steps:**\n`;
    result += `• Use \`get_nsf_award\` for detailed information about specific awards\n`;
    result += `• Cross-reference with XDMoD usage data for impact analysis\n`;

    return result;
  }

  private formatSingleNSFAward(award: NSFAward): string {
    let result = `🏆 **NSF Award ${award.awardNumber}**\n\n`;

    result += `**Project Information:**\n`;
    result += `• **Title**: ${award.title}\n`;
    result += `• **Principal Investigator**: ${award.principalInvestigator}\n`;
    result += `• **Institution**: ${award.institution}\n`;
    result += `• **Program Officer**: ${award.programOfficer}\n`;
    result += `• **Primary Program**: ${award.primaryProgram}\n\n`;

    result += `**Funding Details:**\n`;
    result += `• **Total Award Amount**: ${award.totalIntendedAward}\n`;
    result += `• **Amount Obligated**: ${award.totalAwardedToDate}\n`;
    result += `• **Project Period**: ${award.startDate} to ${award.endDate}\n\n`;

    if (award.coPIs.length > 0) {
      result += `**Co-Principal Investigators:**\n`;
      for (const copi of award.coPIs.slice(0, 10)) {
        result += `• ${copi}\n`;
      }
      if (award.coPIs.length > 10) {
        result += `• ... and ${award.coPIs.length - 10} more\n`;
      }
      result += "\n";
    }

    result += `**Abstract:**\n${award.abstract}\n\n`;

    result += `**Research Impact:**\n`;
    result += `• This NSF-funded research may utilize ACCESS-CI computational resources\n`;
    result += `• Use XDMoD to analyze computational usage patterns for this project\n`;
    result += `• Cross-reference PI/Co-PI names with XDMoD user data\n`;

    return result;
  }

  /**
   * Normalize institution names for better matching.
   * Handles common variations in punctuation, abbreviations, and formatting.
   */
  private normalizeInstitutionName(name: string): string {
    return (
      name
        // Normalize punctuation variations
        .replace(/,\s*(at|in|of)\s*/gi, " $1 ") // "Colorado, Boulder" → "Colorado at Boulder"
        .replace(/,\s+/g, " ") // Remove other commas
        .replace(/\s*-\s*/g, "-") // Normalize hyphens
        .replace(/\s*&\s*/g, " and ") // Normalize ampersands
        // Normalize institution type words
        .replace(/\b(University|College|Institute|School|Center|Laboratory|Lab)\b/gi, (match) => {
          const mappings: Record<string, string> = {
            university: "University",
            college: "College",
            institute: "Institute",
            school: "School",
            center: "Center",
            laboratory: "Laboratory",
            lab: "Laboratory",
          };
          return mappings[match.toLowerCase()] || match;
        })
        // Handle common abbreviations
        .replace(/\bU\b/g, "University")
        .replace(/\bUniv\b/gi, "University")
        .replace(/\bColl\b/gi, "College")
        .replace(/\bInst\b/gi, "Institute")
        // Normalize whitespace
        .replace(/\s+/g, " ")
        .trim()
    );
  }

  /**
   * Check if an institution name matches the search criteria.
   * Uses multi-tier matching strategy to avoid false positives.
   */
  private matchesInstitution(institutionText: string, searchVariants: string[]): boolean {
    const normalizedText = institutionText.toLowerCase();

    // Common words that should be ignored in word overlap matching
    const COMMON_INSTITUTION_WORDS = new Set([
      "university",
      "institute",
      "college",
      "school",
      "center",
      "academy",
      "polytechnic",
      "tech",
      "state",
      "national",
    ]);

    for (const variant of searchVariants) {
      const normalizedVariant = variant.toLowerCase();

      // Tier 1: Exact match (highest confidence)
      if (normalizedText === normalizedVariant) {
        return true;
      }

      // Tier 2: Full variant contained in text (with length check to avoid false positives)
      if (normalizedVariant.length > 8 && normalizedText.includes(normalizedVariant)) {
        return true;
      }

      // Tier 3: Check significant word overlap (excludes common words)
      const textWords = new Set(
        normalizedText.split(/\s+/).filter((w) => w.length > 3 && !COMMON_INSTITUTION_WORDS.has(w))
      );

      const variantWords = normalizedVariant
        .split(/\s+/)
        .filter((w) => w.length > 3 && !COMMON_INSTITUTION_WORDS.has(w));

      if (variantWords.length > 0 && textWords.size > 0) {
        const matchingWords = variantWords.filter((word) => textWords.has(word));
        const overlapRatio = matchingWords.length / variantWords.length;

        // Require EITHER high overlap (75%+) OR at least 2 matching significant words
        if (overlapRatio >= 0.75 || (matchingWords.length >= 2 && overlapRatio >= 0.5)) {
          return true;
        }
      }
    }

    return false;
  }
}
