export interface ManatalResponse {
  count: number;
  next: string | null;
  results: ManatalJob[];
}

export interface ManatalJob {
  id: number;
  position_name: string;
  description: string;
  requirement: string | null;
  department: string | null;
  location: ManatalLocation | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  created_at: string;
  updated_at: string;
  apply_url: string | null;
  career_page_url: string | null;
}

export interface ManatalLocation {
  city: string | null;
  state: string | null;
  country: string | null;
}
