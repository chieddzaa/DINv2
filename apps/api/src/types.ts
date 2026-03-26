export type APIResponse<T> = {
  success: boolean;
  data: T | null;
  error?: string;
};

export type AuthUser = {
  id: string;
  email?: string;
};
