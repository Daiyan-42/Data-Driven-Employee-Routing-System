export type UserRole = "Employee" | "Driver" | "Admin";
export type UserStatus = "Active" | "Inactive";
export type RequestStatus = "Pending" | "Approved" | "Rejected";
export type RequestType = "Regular" | "Ad-hoc";
export type VehicleStatus = "Active" | "Inactive" | "Maintenance";
export type RouteType = "pickup" | "dropoff";
export type AssignmentStatus =
  "Scheduled" | "In-Progress" | "Completed" | "Cancelled";

export interface User {
  user_id: number;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface Employee {
  employee_id: number;
  user_id: number;
  user?: User;
  home_lat?: number;
  home_lng?: number;
  is_active: boolean;
}

export interface Driver {
  driver_id: number;
  user_id: number;
  user?: User;
  license_no: string;
}

export interface Zone {
  zone_id: number;
  zone_name: string;
  description?: string;
}

export interface Vehicle {
  vehicle_id: number;
  plate_no: string;
  capacity: number;
  parking_lat?: number;
  parking_lng?: number;
  status: VehicleStatus;
}

export interface Route {
  route_id: number;
  zone_id?: number;
  zone?: Zone;
  route_type: RouteType;
  service_date: string;
  shift_time?: string;
  total_distance_km?: number;
  total_travel_time_min?: number;
  created_at: string;
}

export interface RouteStop {
  stop_id: number;
  route_id: number;
  latitude: number;
  longitude: number;
  sequence_order: number;
  arrival_time?: string;
  departure_time?: string;
}

export interface RouteWithStops extends Route {
  stops: RouteStop[];
}

export interface PickupRequest {
  pickup_id: number;
  employee_id: number;
  employee?: Employee;
  zone_id?: number;
  zone?: Zone;
  route_id?: number;
  pickup_lat: number;
  pickup_lng: number;
  shift_start_time: string;
  service_date: string;
  request_type: RequestType;
  status: RequestStatus;
  pickup_time?: string;
  created_at: string;
}

export interface DropoffRequest {
  dropoff_id: number;
  employee_id: number;
  employee?: Employee;
  zone_id?: number;
  zone?: Zone;
  route_id?: number;
  drop_lat: number;
  drop_lng: number;
  shift_end_time: string;
  service_date: string;
  status: string;
  drop_time?: string;
  created_at: string;
}

export interface RouteAssignment {
  assignment_id: number;
  route_id: number;
  route?: Route;
  vehicle_id: number;
  vehicle?: Vehicle;
  driver_id: number;
  driver?: Driver;
  departure_time?: string;
  arrival_time?: string;
  status: AssignmentStatus;
}

export interface StopPassenger {
  id: number;
  stop_id: number;
  employee_id: number;
  employee?: Employee;
  boarded_status: boolean;
}

export interface Pagination {
  current_page: number;
  total_pages: number;
  page_size: number;
  total_items: number;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface AuthRegisterResponse {
  user_id: number;
  message: string;
}

export interface AuthLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface AuthRefreshResponse {
  access_token: string;
  expires_in: number;
}

export interface AuthLogoutResponse {
  message: string;
}

export interface UsersListResponse {
  users: User[];
  pagination: Pagination;
}

export interface EmployeesListResponse {
  employees: Employee[];
  pagination: Pagination;
}

export interface DriversListResponse {
  drivers: Driver[];
  pagination: Pagination;
}

export interface VehiclesListResponse {
  vehicles: Vehicle[];
  pagination: Pagination;
}

export interface RoutesListResponse {
  routes: Route[];
  pagination: Pagination;
}

export interface PickupRequestsListResponse {
  pickup_requests: PickupRequest[];
  pagination: Pagination;
}

export interface DropoffRequestsListResponse {
  dropoff_requests: DropoffRequest[];
  pagination: Pagination;
}

export interface RouteAssignmentsListResponse {
  assignments: RouteAssignment[];
  pagination: Pagination;
}

export interface EmployeeProfileResponse {
  user_id: number;
  employee_id: number;
  name: string;
  email: string;
  phone?: string;
  home_lat?: number;
  home_lng?: number;
  role: string;
  status: string;
  is_active: boolean;
}

export interface EmployeeProfileUpdate {
  name?: string;
  phone?: string;
  home_lat?: number;
  home_lng?: number;
}

export interface StopInfo {
  stop_id: number;
  sequence_order?: number;
  latitude?: number;
  longitude?: number;
  arrival_time?: string;
}

export interface DriverInfo {
  driver_id: number;
  name?: string;
  phone?: string;
}

export interface VehicleInfo {
  vehicle_id: number;
  plate_no?: string;
  capacity?: number;
}

export interface ScheduleResponse {
  service_date: string;
  route_id?: number;
  route_type?: string;
  shift_time?: string;
  stop?: StopInfo;
  driver?: DriverInfo;
  vehicle?: VehicleInfo;
  routing_done: boolean;
}
