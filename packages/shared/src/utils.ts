export function sanitizeGroupId(groupId: string): string {
  return groupId.replace(/[^a-zA-Z0-9.-]/g, '');
}

export function formatApiUrl(version: string, endpoint: string): string {
  return `/${version}/${endpoint}`;
}

export function handleApiError(error: any): string {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.status) {
    return `API error: ${error.response.status} ${error.response.statusText}`;
  }
  return error.message || 'Unknown API error';
}