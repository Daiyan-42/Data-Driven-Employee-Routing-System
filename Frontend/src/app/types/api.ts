export type UserRole = "Employee" | "Driver" | "Admin";
export type UserStatus = "Active" | "Inactive";
export type RequestStatus = "Pending" | "Approved" | "Rejected";
export type RequestType = "Regular" | "Ad-hoc";
export type VehicleStatus = "Active" | "Inactive" | "Maintenance";

export interface ApiUser {
  user_id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
}

export interface AuthLoginResponse {
  user: ApiUser;
  tokens: {
    access_token: string;
    refresh_token?: string | null;
    token_type: string;
  };
}

export interface Pagination {
  current_page: number;
  total_pages: number;
  page_size: number;
  total_items: number;
}

export interface Driver {
  driver_id: number;
  user_id: number;
  name: string;
  email: string;
  phone?: string | null;
  license_no: string;
  status: string;
  user_status?: string | null;
}

export interface Employee {
  user_id: number;
  employee_id: number;
  name: string;
  email: string;
  phone?: string | null;
  home_lat?: number | null;
  home_lng?: number | null;
  role: string;
  status: string;
  is_active: boolean;
}

export interface EmployeesListResponse {
  employees: Employee[];
  pagination: Pagination;
}

export interface DriverCreate {
  name: string;
  email: string;
  phone?: string;
  password: string;
  license_no: string;
  status?: string;
}

export type DriverUpdate = Partial<Pick<DriverCreate, "name" | "phone" | "license_no" | "status">>;

export interface DriversListResponse {
  drivers: Driver[];
  pagination: Pagination;
}

export interface Vehicle {
  vehicle_id: number;
  plate_no: string;
  capacity: number;
  parking_lat?: number | null;
  parking_lng?: number | null;
  status: VehicleStatus;
  driver_id?: number | null;
  driver_name?: string | null;
  license_no?: string | null;
}

export interface VehicleCreate {
  plate_no: string;
  capacity: number;
  parking_lat?: number | null;
  parking_lng?: number | null;
  status?: VehicleStatus;
  driver_id?: number | null;
}

export type VehicleUpdate = Partial<VehicleCreate>;

export interface VehiclesListResponse {
  vehicles: Vehicle[];
  pagination: Pagination;
}

export interface PickupRequest {
  pickup_id: number;
  employee_id: number;
  employee_name?: string | null;
  zone_id?: number | null;
  zone_name?: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  shift_start_time?: string | null;
  service_date: string;
  request_type?: RequestType | null;
  status: RequestStatus;
  pickup_time?: string | null;
  created_at?: string | null;
}

export interface DropoffRequest {
  dropoff_id: number;
  employee_id: number;
  employee_name?: string | null;
  zone_id?: number | null;
  zone_name?: string | null;
  drop_lat?: number | null;
  drop_lng?: number | null;
  shift_end_time?: string | null;
  service_date: string;
  status: RequestStatus;
  drop_time?: string | null;
  created_at?: string | null;
}

export interface DropoffRequestsListResponse {
  dropoff_requests: DropoffRequest[];
  pagination: Pagination;
}

export interface PickupRequestsListResponse {
  pickup_requests: PickupRequest[];
  pagination: Pagination;
}

export interface ScheduleResponse {
  routing_done: boolean;
  route_type?: "pickup" | "dropoff";
  shift_time?: string;
  stop?: {
    sequence_order: number;
    latitude: number;
    longitude: number;
    arrival_time?: string;
  };
  driver?: {
    name?: string;
    phone?: string;
  };
  vehicle?: {
    plate_no?: string;
    capacity?: number;
  };
}
