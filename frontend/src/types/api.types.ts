export interface DeleteResponse {
  status: boolean;
  message: string;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
