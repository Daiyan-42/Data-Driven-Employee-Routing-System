import { apiUrl } from "../config/api";
import type {
  AuthLoginResponse,
  Driver,
  DriverAssignmentResponse,
  DriverCreate,
  DriverSelfProfile,
  DriversListResponse,
  DriverUpdate,
  DropoffRequest,
  DropoffRequestsListResponse,
  DropoffRoutingRunPayload,
  Employee,
  EmployeeProfileUpdate,
  EmployeesListResponse,
  PickupRequest,
  PickupRequestsListResponse,
  PickupRoutingInputResponse,
  PickupRoutingRunPayload,
  RouteAssignPayload,
  RouteAssignmentResponse,
  RouteDetailResponse,
  RoutingRunResponse,
  ScheduleResponse,
  ScheduleSummaryResponse,
  Vehicle,
  VehicleCreate,
  VehiclesListResponse,
  VehicleUpdate,
} from "../types/api";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

const setTokens = (accessToken: string, refreshToken?: string | null) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

const makeHeaders = (withAuth = true): HeadersInit => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (withAuth) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
};

const parseError = async (response: Response) => {
  try {
    const data = (await response.json()) as { detail?: string };
    return data.detail ?? `Request failed with ${response.status}`;
  } catch {
    return `Request failed with ${response.status}`;
  }
};

const request = async <T>(path: string, init: RequestInit = {}, withAuth = true): Promise<T> => {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...makeHeaders(withAuth),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as T;
};

export const authApi = {
  async login(payload: { email: string; password: string }) {
    const data = await request<AuthLoginResponse>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      false,
    );

    setTokens(data.tokens.access_token, data.tokens.refresh_token);
    return data;
  },
};

export const driverApi = {
  list(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    return request<DriversListResponse>(`/drivers/?${query.toString()}`);
  },

  getById(driverId: number) {
    return request<Driver>(`/drivers/${driverId}`);
  },

  create(payload: DriverCreate) {
    return request<Driver>("/drivers/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(driverId: number, payload: DriverUpdate) {
    return request<Driver>(`/drivers/${driverId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  remove(driverId: number) {
    return request<{ message: string }>(`/drivers/${driverId}`, {
      method: "DELETE",
    });
  },

  getMe() {
    return request<DriverSelfProfile>("/drivers/me");
  },

  updateMe(payload: { phone?: string; license_no?: string; name?: string }) {
    return request<DriverSelfProfile>("/drivers/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  getTodayAssignment() {
    return request<DriverAssignmentResponse>("/drivers/me/assignments/today");
  },

  startAssignment(assignmentId: number) {
    return request<{ message: string; assignment_id: number }>(`/drivers/me/route-assignments/${assignmentId}/start`, {
      method: "POST",
    });
  },

  completeAssignment(assignmentId: number) {
    return request<{ message: string; assignment_id: number }>(`/drivers/me/route-assignments/${assignmentId}/complete`, {
      method: "POST",
    });
  },

  boardPassenger(stopId: number, employeeId: number) {
    return request<{ message: string; employee_id: number; stop_id: number }>(`/drivers/me/stops/${stopId}/passengers/${employeeId}/board`, {
      method: "POST",
    });
  },
};

export const vehicleApi = {
  list(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    return request<VehiclesListResponse>(`/vehicles/?${query.toString()}`);
  },

  getById(vehicleId: number) {
    return request<Vehicle>(`/vehicles/${vehicleId}`);
  },

  create(payload: VehicleCreate) {
    return request<Vehicle>("/vehicles/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(vehicleId: number, payload: VehicleUpdate) {
    return request<Vehicle>(`/vehicles/${vehicleId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  remove(vehicleId: number) {
    return request<{ message: string }>(`/vehicles/${vehicleId}`, {
      method: "DELETE",
    });
  },
};

export const pickupRequestApi = {
  list(params?: { status?: string; service_date?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();

    if (params?.status) query.set("status", params.status);
    if (params?.service_date) query.set("service_date", params.service_date);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    return request<PickupRequestsListResponse>(
      `/pickup-requests/?${query.toString()}`
    );
  },

  mine(params?: { status?: string; service_date?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();

    if (params?.status) query.set("status", params.status);
    if (params?.service_date) query.set("service_date", params.service_date);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    return request<PickupRequestsListResponse>(
      `/pickup-requests/mine?${query.toString()}`
    );
  },

  create(payload: {
    zone_id?: number;
    pickup_lat: number;
    pickup_lng: number;
    shift_start_time: string;
    service_date: string;
  }) {
    return request<PickupRequest>("/pickup-requests", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(
    pickupId: number,
    payload: {
      zone_id?: number;
      pickup_lat?: number;
      pickup_lng?: number;
      shift_start_time?: string;
      service_date?: string;
    },
  ) {
    return request<PickupRequest>(`/pickup-requests/${pickupId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  remove(pickupId: number) {
    return request<{ message: string }>(`/pickup-requests/${pickupId}`, {
      method: "DELETE",
    });
  },

  approve(pickupId: number) {
    return request<PickupRequest>(`/pickup-requests/${pickupId}/approve`, {
      method: "POST",
    });
  },

  reject(pickupId: number) {
    return request<PickupRequest>(`/pickup-requests/${pickupId}/reject`, {
      method: "POST",
    });
  },
};

export const dropoffRequestApi = {
  list(params?: { status?: string; service_date?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.service_date) query.set("service_date", params.service_date);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    return request<DropoffRequestsListResponse>(`/dropoff-requests/?${query.toString()}`);
  },

  getById(dropoffId: number) {
    return request<DropoffRequest>(`/dropoff-requests/${dropoffId}`);
  },

  mine(params?: { status?: string; service_date?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.service_date) query.set("service_date", params.service_date);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    return request<DropoffRequestsListResponse>(`/dropoff-requests/mine?${query.toString()}`);
  },

  create(payload: {
    zone_id?: number;
    drop_lat: number;
    drop_lng: number;
    shift_end_time: string;
    service_date: string;
  }) {
    return request<DropoffRequest>("/dropoff-requests", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(
    dropoffId: number,
    payload: {
      zone_id?: number;
      drop_lat?: number;
      drop_lng?: number;
      shift_end_time?: string;
      service_date?: string;
    },
  ) {
    return request<DropoffRequest>(`/dropoff-requests/${dropoffId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  remove(dropoffId: number) {
    return request<{ message: string }>(`/dropoff-requests/${dropoffId}`, {
      method: "DELETE",
    });
  },

  approve(dropoffId: number) {
    return request<DropoffRequest>(`/dropoff-requests/${dropoffId}/approve`, {
      method: "POST",
    });
  },

  reject(dropoffId: number) {
    return request<DropoffRequest>(`/dropoff-requests/${dropoffId}/reject`, {
      method: "POST",
    });
  },
};

export const employeeApi = {
  list(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    return request<EmployeesListResponse>(`/employees/?${query.toString()}`);
  },

  getProfile(): Promise<Employee> {
    return request<Employee>("/employees/me");
  },

  updateProfile(payload: EmployeeProfileUpdate): Promise<Employee> {
    return request<Employee>("/employees/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  getSchedule(serviceDate?: string): Promise<ScheduleResponse> {
    const today = new Date().toISOString().split("T")[0];
    const query = new URLSearchParams({ service_date: serviceDate ?? today });
    return request<ScheduleResponse>(`/employees/me/schedule?${query.toString()}`);
  },
};

export const adminApi = {
  getPickupRoutingInput(serviceDate: string, shiftStartTime?: string): Promise<PickupRoutingInputResponse> {
    const query = new URLSearchParams({ service_date: serviceDate });
    if (shiftStartTime) query.set("shift_start_time", shiftStartTime);
    return request<PickupRoutingInputResponse>(`/admin/pickup-routing/input?${query.toString()}`);
  },

  runPickupRouting(payload: PickupRoutingRunPayload): Promise<RoutingRunResponse> {
    return request<RoutingRunResponse>("/admin/pickup-routing/run", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  runDropoffRouting(payload: DropoffRoutingRunPayload): Promise<RoutingRunResponse> {
    return request<RoutingRunResponse>("/admin/dropoff-routing/run", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getScheduleSummary(serviceDate: string, shiftTime?: string): Promise<ScheduleSummaryResponse> {
    const query = new URLSearchParams({ service_date: serviceDate });
    if (shiftTime) query.set("shift_time", shiftTime);
    return request<ScheduleSummaryResponse>(`/admin/schedule-summary?${query.toString()}`);
  },

  getRouteDetail(routeId: number): Promise<RouteDetailResponse> {
    return request<RouteDetailResponse>(`/admin/routes/${routeId}`);
  },

  assignRoute(routeId: number, payload: RouteAssignPayload): Promise<RouteAssignmentResponse> {
    return request<RouteAssignmentResponse>(`/admin/routes/${routeId}/assign`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
