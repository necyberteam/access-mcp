export function sanitizeGroupId(groupId: string): string {
  if (!groupId) {
    throw new Error("groupId parameter is required and cannot be null or undefined");
  }
  return groupId.replace(/[^a-zA-Z0-9.-]/g, "");
}

export function formatApiUrl(version: string, endpoint: string): string {
  return `/${version}/${endpoint}`;
}

interface AxiosErrorLike {
  response?: {
    data?: { message?: string };
    status?: number;
    statusText?: string;
  };
  message?: string;
}

export function handleApiError(error: unknown): string {
  const axiosError = error as AxiosErrorLike;
  if (axiosError.response?.data?.message) {
    return axiosError.response.data.message;
  }
  if (axiosError.response?.status) {
    return `API error: ${axiosError.response.status} ${axiosError.response.statusText}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown API error";
}

/**
 * LLM-Friendly Response Utilities
 *
 * These utilities help create responses that guide LLMs through multi-step workflows,
 * provide clear next actions, and improve error handling.
 */

export interface NextStep {
  action: string;
  description: string;
  tool?: string;
  parameters?: Record<string, unknown>;
}

export interface LLMResponse<T = unknown> {
  data?: T;
  count?: number;
  next_steps?: NextStep[];
  suggestions?: string[];
  related_tools?: string[];
  context?: Record<string, unknown>;
}

export interface LLMError {
  error: string;
  error_type: "validation" | "not_found" | "api_error" | "invalid_parameter";
  suggestions?: string[];
  next_steps?: NextStep[];
  did_you_mean?: string[];
  related_queries?: string[];
}

/**
 * Add helpful next steps to a successful response
 */
export function addNextSteps<T>(data: T, nextSteps: NextStep[]): LLMResponse<T> {
  return {
    data,
    next_steps: nextSteps,
  };
}

/**
 * Create an LLM-friendly error response with suggestions
 */
export function createLLMError(
  error: string,
  errorType: LLMError["error_type"],
  options: {
    suggestions?: string[];
    nextSteps?: NextStep[];
    didYouMean?: string[];
    relatedQueries?: string[];
  } = {}
): LLMError {
  return {
    error,
    error_type: errorType,
    ...options,
  };
}

/**
 * Add discovery suggestions when returning empty results
 */
export function addDiscoverySuggestions<T>(
  data: T[],
  discoverySteps: NextStep[]
): LLMResponse<T[]> {
  if (data.length === 0) {
    return {
      data,
      count: 0,
      next_steps: discoverySteps,
      suggestions: [
        "No results found. Try the suggested next steps to discover available options.",
      ],
    };
  }
  return {
    data,
    count: data.length,
  };
}

/**
 * Common next step templates for cross-server consistency
 */
export const CommonNextSteps = {
  discoverResources: {
    action: "discover_resources",
    description: "Find available compute resources to filter by",
    tool: "search_resources",
    parameters: { include_resource_ids: true },
  },

  narrowResults: (currentCount: number, suggestedFilters: string[]) => ({
    action: "narrow_results",
    description: `Currently showing ${currentCount} results. Add filters to narrow down: ${suggestedFilters.join(", ")}`,
  }),

  exploreRelated: (relatedTool: string, description: string) => ({
    action: "explore_related",
    description,
    tool: relatedTool,
  }),

  refineSearch: (suggestions: string[]) => ({
    action: "refine_search",
    description: `Try these refinements: ${suggestions.join(", ")}`,
  }),
};
