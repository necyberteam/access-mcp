// Universal search parameters (all servers)
export interface UniversalSearchParams {
  query?: string;
  id?: string;
  type?: string;
  tags?: string[];
  date?: "today" | "upcoming" | "past" | "this_week" | "this_month";
  limit?: number;
  offset?: number;
  sort?: string;
  order?: "asc" | "desc";
}

// Universal response format (all servers)
export interface UniversalResponse<T> {
  total: number;
  items: T[];
}

// Extended response with hints
export interface UniversalResponseWithHints<T> extends UniversalResponse<T> {
  hints?: {
    next?: string;
    tags?: string[];
  };
}

// Standard error response
export interface StandardErrorResponse {
  error: string;
  hint?: string;
}
