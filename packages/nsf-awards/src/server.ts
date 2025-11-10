#!/usr/bin/env node

import { BaseAccessServer } from "@access-mcp/shared";
import { AxiosInstance } from "axios";

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
    super("access-mcp-nsf-awards", "0.1.0", "https://api.nsf.gov");
  }

  protected getTools() {
    return [
      {
        name: "find_nsf_awards_by_pi",
        description: "Search for NSF awards where a specific person is listed as the Principal Investigator. Use this to find funding for a researcher's projects, track their grant history, or identify research they are leading.",
        inputSchema: {
          type: "object",
          properties: {
            pi_name: {
              type: "string",
              description: "Principal investigator name to search for",
              examples: [
                "John Smith",
                "Jane Doe",
                "Smith"
              ]
            },
            limit: {
              type: "number",
              description: "Maximum number of awards to return",
              default: 10,
            },
          },
          required: ["pi_name"],
        },
      },
      {
        name: "find_nsf_awards_by_personnel",
        description: "Search for NSF awards where a person is listed as either Principal Investigator or Co-PI. Use this when you want to find all projects someone is involved with, regardless of their role.",
        inputSchema: {
          type: "object",
          properties: {
            person_name: {
              type: "string",
              description: "Person name to search for in award personnel (PI or Co-PI)",
              examples: [
                "John Smith",
                "Jane Doe",
                "Robert Johnson"
              ]
            },
            limit: {
              type: "number",
              description: "Maximum number of awards to return",
              default: 10,
            },
          },
          required: ["person_name"],
        },
      },
      {
        name: "get_nsf_award",
        description: "Retrieve comprehensive details about a specific NSF award including full abstract, funding amounts, project dates, PI/Co-PI information, and program details. Use this when you have an award number and need complete project information.",
        inputSchema: {
          type: "object",
          properties: {
            award_number: {
              type: "string",
              description: "NSF award number",
              examples: [
                "2138259",
                "1948997",
                "2229876"
              ]
            },
          },
          required: ["award_number"],
        },
      },
      {
        name: "find_nsf_awards_by_institution",
        description: "Search for all NSF awards granted to a specific institution. Use this to discover research funding at universities and research centers, track institutional portfolios, or find collaborators at specific organizations.",
        inputSchema: {
          type: "object",
          properties: {
            institution_name: {
              type: "string",
              description: "Institution name to search for",
              examples: [
                "Stanford University",
                "MIT",
                "University of California",
                "Carnegie Mellon University"
              ]
            },
            limit: {
              type: "number",
              description: "Maximum number of awards to return",
              default: 10,
            },
          },
          required: ["institution_name"],
        },
      },
      {
        name: "find_nsf_awards_by_keywords",
        description: "Search for NSF awards by keywords appearing in the project title or abstract. Use this to find research projects in specific domains, discover related work, or identify potential collaborators working on similar topics.",
        inputSchema: {
          type: "object",
          properties: {
            keywords: {
              type: "string",
              description: "Keywords to search for in award titles and abstracts",
              examples: [
                "machine learning",
                "climate change",
                "genomics",
                "quantum computing"
              ]
            },
            limit: {
              type: "number",
              description: "Maximum number of awards to return",
              default: 10,
            },
          },
          required: ["keywords"],
        },
      },
    ];
  }

  protected getResources() {
    return [];
  }

  protected async handleToolCall(request: any): Promise<any> {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "find_nsf_awards_by_pi":
        return await this.find_nsf_awards_by_pi(args);
      case "find_nsf_awards_by_personnel":
        return await this.find_nsf_awards_by_personnel(args);
      case "get_nsf_award":
        return await this.get_nsf_award(args);
      case "find_nsf_awards_by_institution":
        return await this.find_nsf_awards_by_institution(args);
      case "find_nsf_awards_by_keywords":
        return await this.find_nsf_awards_by_keywords(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  protected async handleResourceRead(request: any): Promise<any> {
    throw new Error("Resource reading not supported");
  }

  private async find_nsf_awards_by_pi(args: { pi_name: string; limit?: number }) {
    const { pi_name, limit = 10 } = args;
    
    try {
      const awards = await this.searchNSFAwardsByPI(pi_name, limit);
      
      return {
        content: [
          {
            type: "text",
            text: this.formatNSFAwardsResults(
              `NSF Awards for PI: ${pi_name}`,
              awards,
              `Found ${awards.length} awards where ${pi_name} is the Principal Investigator`
            ),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to search NSF awards by PI: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async find_nsf_awards_by_personnel(args: { person_name: string; limit?: number }) {
    const { person_name, limit = 10 } = args;
    
    try {
      const awards = await this.searchNSFAwardsByPersonnel(person_name, limit);
      
      return {
        content: [
          {
            type: "text",
            text: this.formatNSFAwardsResults(
              `NSF Awards for Personnel: ${person_name}`,
              awards,
              `Found ${awards.length} awards where ${person_name} is listed as PI or Co-PI`
            ),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to search NSF awards by personnel: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async get_nsf_award(args: { award_number: string }) {
    const { award_number } = args;
    
    try {
      const award = await this.fetchNSFAwardData(award_number);
      
      return {
        content: [
          {
            type: "text",
            text: this.formatSingleNSFAward(award),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to fetch NSF award: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async find_nsf_awards_by_institution(args: { institution_name: string; limit?: number }) {
    const { institution_name, limit = 10 } = args;
    
    try {
      const awards = await this.searchNSFAwardsByInstitution(institution_name, limit);
      
      return {
        content: [
          {
            type: "text",
            text: this.formatNSFAwardsResults(
              `NSF Awards for Institution: ${institution_name}`,
              awards,
              `Found ${awards.length} awards for ${institution_name}`
            ),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to search NSF awards by institution: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async find_nsf_awards_by_keywords(args: { keywords: string; limit?: number }) {
    const { keywords, limit = 10 } = args;
    
    try {
      const awards = await this.searchNSFAwardsByKeywords(keywords, limit);
      
      return {
        content: [
          {
            type: "text",
            text: this.formatNSFAwardsResults(
              `NSF Awards matching: "${keywords}"`,
              awards,
              `Found ${awards.length} awards matching keywords "${keywords}"`
            ),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to search NSF awards by keywords: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async fetchNSFAwardData(awardNumber: string): Promise<NSFAward> {
    const cleanAwardNumber = awardNumber.replace(/[^0-9]/g, "");
    
    const apiUrl = `https://api.nsf.gov/services/v1/awards.json?id=${cleanAwardNumber}&printFields=id,title,abstractText,piFirstName,piLastName,coPDPI,poName,awardeeName,awardeeCity,awardeeStateCode,fundsObligatedAmt,estimatedTotalAmt,startDate,expDate,primaryProgram,ueiNumber,fundProgramName`;
    
    const response = await fetch(apiUrl, { redirect: 'follow' });
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
        params: `pdPIName=${encodeURIComponent(piName.replace(/\s+/g, '+'))}`,
      },
      {
        name: "Last name only",
        params: `pdPIName=${encodeURIComponent(piName.split(" ").pop()?.replace(/\s+/g, '+') || piName)}`,
      },
      {
        name: "First name only",
        params: `pdPIName=${encodeURIComponent(piName.split(" ")[0]?.replace(/\s+/g, '+') || piName)}`,
      },
    ];

    for (const strategy of searchStrategies) {
      try {
        const apiUrl = `https://api.nsf.gov/services/v1/awards.json?${strategy.params}&printFields=id,title,abstractText,piFirstName,piLastName,coPDPI,poName,awardeeName,awardeeCity,awardeeStateCode,fundsObligatedAmt,estimatedTotalAmt,startDate,expDate,primaryProgram,ueiNumber,fundProgramName&offset=1&rpp=100`;
        
        const response = await fetch(apiUrl, { redirect: 'follow' });
        if (!response.ok) {
          continue;
        }
        
        const data = await response.json();
        
        if (data.response?.award && data.response.award.length > 0) {
          const awards = data.response.award
            .slice(0, Math.min(limit, 100))
            .map((award: any) => this.parseNSFAward(award));
          
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
        
        const response = await fetch(apiUrl, { redirect: 'follow' });
        if (response.ok) {
          const data = await response.json();
          
          if (data.response?.award && data.response.award.length > 0) {
            const copiAwards = data.response.award.map((award: any) => this.parseNSFAward(award));
            awards.push(...copiAwards);
          }
        }
      } catch (error) {
        // Continue with PI results only
      }
    }
    
    return awards.slice(0, limit);
  }

  private async searchNSFAwardsByInstitution(institutionName: string, limit: number): Promise<NSFAward[]> {
    try {
      const apiUrl = `https://api.nsf.gov/services/v1/awards.json?awardeeName=${encodeURIComponent(institutionName)}&printFields=id,title,abstractText,piFirstName,piLastName,coPDPI,poName,awardeeName,awardeeCity,awardeeStateCode,fundsObligatedAmt,estimatedTotalAmt,startDate,expDate,primaryProgram,ueiNumber,fundProgramName&offset=1&rpp=${Math.min(limit, 100)}`;
      
      const response = await fetch(apiUrl, { redirect: 'follow' });
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      
      if (data.response?.award && data.response.award.length > 0) {
        return data.response.award.map((award: any) => this.parseNSFAward(award));
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }

  private async searchNSFAwardsByKeywords(keywords: string, limit: number): Promise<NSFAward[]> {
    try {
      const apiUrl = `https://api.nsf.gov/services/v1/awards.json?keyword=${encodeURIComponent(keywords)}&printFields=id,title,abstractText,piFirstName,piLastName,coPDPI,poName,awardeeName,awardeeCity,awardeeStateCode,fundsObligatedAmt,estimatedTotalAmt,startDate,expDate,primaryProgram,ueiNumber,fundProgramName&offset=1&rpp=${Math.min(limit, 100)}`;
      
      const response = await fetch(apiUrl, { redirect: 'follow' });
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      
      if (data.response?.award && data.response.award.length > 0) {
        return data.response.award.map((award: any) => this.parseNSFAward(award));
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }

  private parseNSFAward(award: any): NSFAward {
    const coPIs = award.coPDPI && typeof award.coPDPI === 'string' 
      ? award.coPDPI.split(";").map((name: string) => name.trim()) 
      : [];
    
    return {
      awardNumber: award.id || "",
      title: award.title || "No title available",
      institution: award.awardeeName || "Unknown institution",
      principalInvestigator: `${award.piFirstName || ""} ${award.piLastName || ""}`.trim() || "Unknown PI",
      coPIs,
      totalIntendedAward: award.estimatedTotalAmt ? `$${parseInt(award.estimatedTotalAmt).toLocaleString()}` : "Amount not available",
      totalAwardedToDate: award.fundsObligatedAmt ? `$${parseInt(award.fundsObligatedAmt).toLocaleString()}` : "Amount not available",
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
}