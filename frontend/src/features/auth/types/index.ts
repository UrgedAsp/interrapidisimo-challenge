export interface LoginCredentials {
  email: string;
  password: string;
}

export interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export interface DemoUser {
  name: string;
  email: string;
  password: string;
}
