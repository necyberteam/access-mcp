// User-specific functionality for XDMoD Metrics Server
// This module contains the getUserGroupBys method for authenticated users

export interface UserSpecificParams {
  realm: string;
  statistic: string;
  start_date: string;
  end_date: string;
  username_filter?: string;
  person_id?: string; // ACCESS person ID for direct filtering
}

export class XDMoDUserSpecific {
  private baseURL: string;
  private apiToken: string;

  constructor(baseURL: string, apiToken: string) {
    this.baseURL = baseURL;
    this.apiToken = apiToken;
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      "Token": this.apiToken,
      "Content-Type": "application/x-www-form-urlencoded",
    };
  }

  async getUserGroupBys(realm: string = "Jobs") {
    try {
      // First get all available group_bys for the realm
      const response = await fetch(
        `${this.baseURL}/controllers/user_interface.php`,
        {
          method: "POST",
          headers: this.getAuthHeaders(),
          body: new URLSearchParams({
            operation: "get_menus",
            public_user: "false", // Authenticated to see all options
            category: realm,
            node: `${realm}_`,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Filter for user-related group_bys
      const allGroupBys = data.data || [];
      const userGroupBys = allGroupBys.filter((item: { group_by?: string; id?: string; text?: string }) => {
        const groupBy = item.group_by || item.id || "";
        // Look for person/PI/user related group_bys
        return (
          groupBy.includes("person") ||
          groupBy.includes("pi") ||
          groupBy.includes("user") ||
          item.text?.toLowerCase().includes("person") ||
          item.text?.toLowerCase().includes("user") ||
          item.text?.toLowerCase().includes("pi")
        );
      });

      return {
        allGroupBys,
        userRelatedGroupBys: userGroupBys.map((item: { group_by?: string; id?: string; text?: string }) => ({
          id: item.id,
          text: item.text,
          group_by: item.group_by,
        })),
      };
    } catch (error) {
      throw new Error(
        `Failed to enumerate user group_bys: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // All person discovery and personal usage methods have been removed.
  // Use the Python XDMoD server with ACCESS IDs for personal data queries.
  // The broken methods that were removed:
  // - discoverPersonIds() - Was loading 68k+ users
  // - lookupPersonId() - Session-based auth that expires  
  // - lookupPersonIdPublic() - Didn't work properly
  // - getMyUsage() - Misleading name, couldn't get "my" usage
}