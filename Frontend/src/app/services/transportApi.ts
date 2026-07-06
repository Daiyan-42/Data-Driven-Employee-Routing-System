import { apiUrl } from "../config/api";
import { mockUsers, type User as UiUser } from "../data/mockData";
import type {
  AssignmentStatus,
  Driver as ApiDriver,
  DriversListResponse,
  DropoffRequest as ApiDropoffRequest,
  DropoffRequestsListResponse,
  Employee as ApiEmployee,
  EmployeesListResponse,
  Pagination,
  PickupRequest as ApiPickupRequest,
  PickupRequestsListResponse,
  RequestStatus,
  RequestType,
  Route as ApiRoute,
  RouteAssignment as ApiRouteAssignment,
  RouteAssignmentsListResponse,
  RouteStop as ApiRouteStop,
  RouteType,
  RoutesListResponse,
  StopPassenger as ApiStopPassenger,
  User as ApiUser,
  UserRole as UserRoleApi,
  UserStatus as ActiveStatus,
  UsersListResponse,
  Vehicle as ApiVehicle,
  VehiclesListResponse,
  Zone as ApiZone,
  EmployeeProfileResponse,
  EmployeeProfileUpdate,
  ScheduleResponse,
} from "../types/api";

const sleep = (ms = 700) => new Promise((resolve) => setTimeout(resolve, ms));
const nowDate = () => new Date().toISOString().split("T")[0];
const nowTime = () => new Date().toISOString().split("T")[1].slice(0, 8);
const mockId = () => Date.now();
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

const setTokens = (accessToken: string, refreshToken?: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

const makeHeaders = (withAuth = false): HeadersInit => {
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
    return data.detail ?? `Request failed: ${response.status}`;
  } catch {
    return `Request failed: ${response.status}`;
  }
};

type UserRoleUi = "employee" | "driver" | "admin";
const toApiRole = (role: UserRoleUi): UserRoleApi => {
  if (role === "employee") return "Employee";
  if (role === "driver") return "Driver";
  return "Admin";
};

const toUiUser = (user: {
  user_id: number;
  name: string;
  email: string;
  phone?: string;
  role: UserRoleApi;
}): UiUser => ({
  id: String(user.user_id),
  name: user.name,
  email: user.email,
  phone: user.phone ?? "",
  role:
    user.role === "Employee"
      ? "employee"
      : user.role === "Driver"
        ? "driver"
        : "admin",
});

const mockPagination = (page = 1, limit = 20, total = 1): Pagination => ({
  current_page: page,
  total_pages: Math.max(1, Math.ceil(total / limit)),
  page_size: limit,
  total_items: total,
});

const fallbackApiUser = (): ApiUser => {
  const fallback = mockUsers[0];
  return {
    user_id: Number(fallback.id),
    name: fallback.name,
    email: fallback.email,
    phone: fallback.phone,
    role: toApiRole(fallback.role),
    status: "Active",
    created_at: new Date().toISOString(),
  };
};

export const authApi = {
  async login(payload: { email: string; password: string }) {
    const response = await fetch(apiUrl("/auth/login"), {
      method: "POST",
      headers: makeHeaders(false),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const data = (await response.json()) as {
      user: {
        user_id: number;
        name: string;
        email: string;
        phone?: string;
        role: UserRoleApi;
        status?: ActiveStatus;
      };
      tokens: {
        access_token: string;
        refresh_token: string;
        token_type: string;
      };
    };

    setTokens(data.tokens.access_token, data.tokens.refresh_token);

    const normalizedUser: ApiUser = {
      user_id: data.user.user_id,
      name: data.user.name,
      email: data.user.email,
      phone: data.user.phone,
      role: data.user.role,
      status: data.user.status ?? "Active",
      created_at: new Date().toISOString(),
    };

    return {
      access_token: data.tokens.access_token,
      refresh_token: data.tokens.refresh_token,
      token_type: data.tokens.token_type,
      expires_in: 3600,
      user: normalizedUser,
    };
  },

  async register(payload: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role: UserRoleApi;
  }) {
    const response = await fetch(apiUrl("/auth/register"), {
      method: "POST",
      headers: makeHeaders(false),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const data = (await response.json()) as {
      user: { user_id: number };
      tokens?: { access_token: string; refresh_token: string };
    };

    if (data.tokens?.access_token) {
      setTokens(data.tokens.access_token, data.tokens.refresh_token);
    }

    return {
      user_id: data.user.user_id,
      message: "User registered successfully",
    };
  },

  async refresh(payload: { refresh_token: string }) {
    const response = await fetch(apiUrl("/auth/refresh"), {
      method: "POST",
      headers: makeHeaders(false),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const data = (await response.json()) as { access_token: string };
    setTokens(data.access_token, getRefreshToken() ?? undefined);
    return { access_token: data.access_token, expires_in: 3600 };
  },

  async logout() {
    const response = await fetch(apiUrl("/auth/logout"), {
      method: "POST",
      headers: makeHeaders(true),
    });

    clearTokens();

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const data = (await response.json()) as { message: string };
    return { message: data.message };
  },

  async loginWithRole(input: {
    email: string;
    password: string;
    role: UserRoleUi;
  }) {
    const result = await this.login({
      email: input.email,
      password: input.password,
    });

    if (result.user.role !== toApiRole(input.role)) {
      throw new Error("Role mismatch for this account");
    }

    const user = toUiUser(result.user);

    return {
      user,
      tokens: {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        token_type: result.token_type,
      },
    };
  },
};

export const adminApi = {
  async getPickupRoutingInput(params: {
    service_date: string;
    shift_start_time?: string;
  }) {
    const query = new URLSearchParams({ service_date: params.service_date });
    if (params.shift_start_time) {
      query.set("shift_start_time", params.shift_start_time);
    }

    const response = await fetch(
      apiUrl(`/admin/pickup-routing/input?${query.toString()}`),
      {
        method: "GET",
        headers: makeHeaders(true),
      },
    );

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    return response.json();
  },

  async runPickupRouting(payload: {
    service_date: string;
    shift_start_time?: string;
    office_lat: number;
    office_lng: number;
    office_buffer_minutes?: number;
    stop_dwell_minutes?: number;
    average_speed_kmph?: number;
  }) {
    const response = await fetch(apiUrl("/admin/pickup-routing/run"), {
      method: "POST",
      headers: makeHeaders(true),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    return response.json();
  },
};

export const pickupRequestApi = {
  async list(params?: {
    employee_id?: number;
    zone_id?: number;
    status?: RequestStatus;
    service_date?: string;
    request_type?: RequestType;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    query.set("future_only", "true");
    if (params?.service_date) query.set("service_date", params.service_date);
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const response = await fetch(
      apiUrl(`/pickup-requests?${query.toString()}`),
      {
        method: "GET",
        headers: makeHeaders(true),
      },
    );

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    return (await response.json()) as PickupRequestsListResponse;
  },

  async create(payload: {
    employee_id: number;
    zone_id?: number;
    pickup_lat: number;
    pickup_lng: number;
    shift_start_time: string;
    service_date: string;
    request_type: "Regular" | "Ad-hoc";
  }) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl('/pickup-requests'), {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error('Create pickup request failed');
    // return (await response.json()) as { pickup_id: number };

    await sleep(350);
    return {
      pickup_id: mockId(),
      ...payload,
      status: "Pending" as RequestStatus,
      created_at: new Date().toISOString(),
    };
  },

  async getById(pickupId: number) {
    const response = await fetch(apiUrl(`/pickup-requests/${pickupId}`), {
      method: "GET",
      headers: makeHeaders(true),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    return (await response.json()) as ApiPickupRequest;
  },

  async update(
    pickupId: number,
    payload: {
      pickup_lat?: number;
      pickup_lng?: number;
      shift_start_time?: string;
      service_date?: string;
    },
  ) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/pickup-requests/${pickupId}`), {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error('Update pickup request failed');
    // return (await response.json()) as ApiPickupRequest;

    await sleep(220);
    return {
      pickup_id: pickupId,
      employee_id: 1,
      pickup_lat: payload.pickup_lat ?? 23.8,
      pickup_lng: payload.pickup_lng ?? 90.4,
      shift_start_time: payload.shift_start_time ?? nowTime(),
      service_date: payload.service_date ?? nowDate(),
      request_type: "Regular" as RequestType,
      status: "Pending" as RequestStatus,
      created_at: new Date().toISOString(),
    };
  },

  async remove(pickupId: number) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/pickup-requests/${pickupId}`), { method: 'DELETE' });
    // if (!response.ok) throw new Error('Delete pickup request failed');

    await sleep(180);
    return { success: true, pickup_id: pickupId };
  },

  async approve(
    pickupId: number,
    payload?: { route_id?: number; pickup_time?: string },
  ) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/pickup-requests/${pickupId}/approve`), {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload ?? {}),
    // });
    // if (!response.ok) throw new Error('Approve pickup request failed');
    // return (await response.json()) as ApiPickupRequest;

    await sleep(200);
    return {
      pickup_id: pickupId,
      employee_id: 1,
      route_id: payload?.route_id,
      pickup_lat: 23.8,
      pickup_lng: 90.4,
      shift_start_time: nowTime(),
      service_date: nowDate(),
      request_type: "Regular" as RequestType,
      status: "Approved" as RequestStatus,
      pickup_time: payload?.pickup_time,
      created_at: new Date().toISOString(),
    };
  },

  async reject(pickupId: number, payload?: { reason?: string }) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/pickup-requests/${pickupId}/reject`), {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload ?? {}),
    // });
    // if (!response.ok) throw new Error('Reject pickup request failed');
    // return (await response.json()) as ApiPickupRequest;

    await sleep(200);
    return {
      pickup_id: pickupId,
      employee_id: 1,
      pickup_lat: 23.8,
      pickup_lng: 90.4,
      shift_start_time: nowTime(),
      service_date: nowDate(),
      request_type: "Regular" as RequestType,
      status: "Rejected" as RequestStatus,
      created_at: new Date().toISOString(),
      reason: payload?.reason,
    };
  },

  async submitWeeklyRegular(input: {
    employeeId: string;
    schedules: Array<{
      day: string;
      location: string;
      latitude: number;
      longitude: number;
      shiftTime: string;
    }>;
  }) {
    const employeeId = Number(input.employeeId) || 1;

    for (const schedule of input.schedules) {
      await this.create({
        employee_id: employeeId,
        pickup_lat: schedule.latitude,
        pickup_lng: schedule.longitude,
        shift_start_time: `${schedule.shiftTime}:00`,
        service_date: new Date().toISOString().split("T")[0],
        request_type: "Regular",
      });
    }

    return {
      success: true,
      requestCount: input.schedules.length,
      assignment: {
        vehiclePlate: "ABC-1234",
        driverName: "Sarah Wilson",
        driverPhone: "+1-555-0202",
      },
    };
  },

  async submitAdhoc(input: {
    employeeId: string;
    latitude: number;
    longitude: number;
    shiftTime: string;
    serviceDate: string;
  }) {
    const employeeId = Number(input.employeeId) || 1;

    const created = await this.create({
      employee_id: employeeId,
      pickup_lat: input.latitude,
      pickup_lng: input.longitude,
      shift_start_time: `${input.shiftTime}:00`,
      service_date: input.serviceDate,
      request_type: "Ad-hoc",
    });

    return {
      success: true,
      pickup_request: created,
      assignment: {
        vehiclePlate: "XYZ-5678",
        driverName: "Mike Johnson",
        driverPhone: "+1-555-0303",
      },
    };
  },
};

export const dropoffRequestApi = {
  async list(params?: {
    employee_id?: number;
    zone_id?: number;
    status?: string;
    service_date?: string;
    page?: number;
    limit?: number;
  }) {
    // Backend API call (enable when backend is ready):
    // const query = new URLSearchParams();
    // if (params?.employee_id) query.set('employee_id', String(params.employee_id));
    // const response = await fetch(apiUrl(`/dropoff-requests?${query.toString()}`));
    // if (!response.ok) throw new Error('List dropoff requests failed');
    // return (await response.json()) as { dropoff_requests: ApiDropoffRequest[]; pagination: Pagination };

    await sleep(300);
    return {
      dropoff_requests: [] as ApiDropoffRequest[],
      pagination: mockPagination(params?.page ?? 1, params?.limit ?? 20, 0),
    };
  },

  async create(payload: {
    employee_id: number;
    zone_id?: number;
    drop_lat: number;
    drop_lng: number;
    shift_end_time: string;
    service_date: string;
  }) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl('/dropoff-requests'), {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error('Create dropoff request failed');
    // return (await response.json()) as { dropoff_id: number };

    await sleep(350);
    return {
      dropoff_id: mockId(),
      ...payload,
      status: "Pending",
      created_at: new Date().toISOString(),
    };
  },

  async getById(dropoffId: number) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/dropoff-requests/${dropoffId}`));
    // if (!response.ok) throw new Error('Get dropoff request failed');
    // return (await response.json()) as ApiDropoffRequest;

    await sleep(200);
    return {
      dropoff_id: dropoffId,
      employee_id: 1,
      drop_lat: 23.8,
      drop_lng: 90.4,
      shift_end_time: nowTime(),
      service_date: nowDate(),
      status: "Pending",
      created_at: new Date().toISOString(),
    };
  },

  async update(
    dropoffId: number,
    payload: {
      drop_lat?: number;
      drop_lng?: number;
      shift_end_time?: string;
      service_date?: string;
    },
  ) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/dropoff-requests/${dropoffId}`), {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error('Update dropoff request failed');
    // return (await response.json()) as ApiDropoffRequest;

    await sleep(220);
    return {
      dropoff_id: dropoffId,
      employee_id: 1,
      drop_lat: payload.drop_lat ?? 23.8,
      drop_lng: payload.drop_lng ?? 90.4,
      shift_end_time: payload.shift_end_time ?? nowTime(),
      service_date: payload.service_date ?? nowDate(),
      status: "Pending",
      created_at: new Date().toISOString(),
    };
  },

  async remove(dropoffId: number) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/dropoff-requests/${dropoffId}`), { method: 'DELETE' });
    // if (!response.ok) throw new Error('Delete dropoff request failed');

    await sleep(180);
    return { success: true, dropoff_id: dropoffId };
  },

  async submit(input: {
    employeeId: string;
    latitude: number;
    longitude: number;
    shiftEndTime: string;
    serviceDate: string;
  }) {
    const employeeId = Number(input.employeeId) || 1;

    const created = await this.create({
      employee_id: employeeId,
      drop_lat: input.latitude,
      drop_lng: input.longitude,
      shift_end_time: `${input.shiftEndTime}:00`,
      service_date: input.serviceDate,
    });

    return {
      success: true,
      dropoff_request: created,
      assignment: {
        vehiclePlate: "ABC-1234",
        driverName: "Sarah Wilson",
        driverPhone: "+1-555-0202",
      },
    };
  },
};

export const routeAssignmentApi = {
  async list(params?: {
    route_id?: number;
    vehicle_id?: number;
    driver_id?: number;
    status?: AssignmentStatus;
    page?: number;
    limit?: number;
  }) {
    // Backend API call (enable when backend is ready):
    // const query = new URLSearchParams();
    // if (params?.route_id) query.set('route_id', String(params.route_id));
    // const response = await fetch(apiUrl(`/route-assignments?${query.toString()}`));
    // if (!response.ok) throw new Error('List assignments failed');
    // return (await response.json()) as { assignments: ApiRouteAssignment[]; pagination: Pagination };

    await sleep(250);
    return {
      assignments: [] as ApiRouteAssignment[],
      pagination: mockPagination(params?.page ?? 1, params?.limit ?? 20, 0),
    };
  },

  async create(payload: {
    route_id: number;
    vehicle_id: number;
    driver_id: number;
    departure_time?: string;
    arrival_time?: string;
    status?: AssignmentStatus;
  }) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl('/route-assignments'), {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error('Create assignment failed');
    // return (await response.json()) as ApiRouteAssignment;

    await sleep(250);
    return {
      assignment_id: mockId(),
      route_id: payload.route_id,
      vehicle_id: payload.vehicle_id,
      driver_id: payload.driver_id,
      departure_time: payload.departure_time,
      arrival_time: payload.arrival_time,
      status: payload.status ?? "Scheduled",
    };
  },

  async getById(assignmentId: number) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/route-assignments/${assignmentId}`));
    // if (!response.ok) throw new Error('Get assignment failed');
    // return (await response.json()) as ApiRouteAssignment;

    await sleep(200);
    return {
      assignment_id: assignmentId,
      route_id: 1,
      vehicle_id: 1,
      driver_id: 1,
      status: "Scheduled" as AssignmentStatus,
    };
  },

  async update(
    assignmentId: number,
    payload: {
      vehicle_id?: number;
      driver_id?: number;
      departure_time?: string;
      arrival_time?: string;
      status?: AssignmentStatus;
    },
  ) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/route-assignments/${assignmentId}`), {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error('Update assignment failed');
    // return (await response.json()) as ApiRouteAssignment;

    await sleep(220);
    return {
      assignment_id: assignmentId,
      route_id: 1,
      vehicle_id: payload.vehicle_id ?? 1,
      driver_id: payload.driver_id ?? 1,
      departure_time: payload.departure_time,
      arrival_time: payload.arrival_time,
      status: payload.status ?? "Scheduled",
    };
  },

  async remove(assignmentId: number) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/route-assignments/${assignmentId}`), { method: 'DELETE' });
    // if (!response.ok) throw new Error('Delete assignment failed');

    await sleep(180);
    return { success: true, assignment_id: assignmentId };
  },

  async start(assignmentId: string) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/route-assignments/${assignmentId}/start`), { method: 'POST' });
    // if (!response.ok) throw new Error('Start route failed');
    // return (await response.json()) as { assignment_id: number; status: string };

    await sleep(200);
    return { assignment_id: assignmentId, status: "In-Progress" };
  },

  async complete(assignmentId: string) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/route-assignments/${assignmentId}/complete`), { method: 'POST' });
    // if (!response.ok) throw new Error('Complete route failed');
    // return (await response.json()) as { assignment_id: number; status: string };

    await sleep(200);
    return { assignment_id: assignmentId, status: "Completed" };
  },
};

export const stopPassengerApi = {
  async list(stopId: number) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/stops/${stopId}/passengers`));
    // if (!response.ok) throw new Error('List stop passengers failed');
    // return (await response.json()) as ApiStopPassenger[];

    await sleep(180);
    return [] as ApiStopPassenger[];
  },

  async add(
    stopId: number,
    payload: { employee_id: number; boarded_status?: boolean },
  ) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/stops/${stopId}/passengers`), {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error('Add stop passenger failed');
    // return (await response.json()) as ApiStopPassenger;

    await sleep(180);
    return {
      id: mockId(),
      stop_id: stopId,
      employee_id: payload.employee_id,
      boarded_status: payload.boarded_status ?? false,
    };
  },

  async board(stopId: number, passengerId: number) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/stops/${stopId}/passengers/${passengerId}/board`), { method: 'POST' });
    // if (!response.ok) throw new Error('Mark boarded failed');
    // return (await response.json()) as ApiStopPassenger;

    await sleep(150);
    return {
      id: passengerId,
      stop_id: stopId,
      employee_id: 1,
      boarded_status: true,
    };
  },

  async markBoarded(payload: { stop_id: string; passenger_id: string }) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/stops/${payload.stop_id}/passengers/${payload.passenger_id}/board`), {
    //   method: 'POST',
    // });
    // if (!response.ok) throw new Error('Mark boarded failed');
    // return (await response.json()) as { id: number; boarded_status: boolean };

    await sleep(150);
    return this.board(Number(payload.stop_id), Number(payload.passenger_id));
  },
};

export const userApi = {
  async list(params?: {
    role?: UserRoleApi;
    status?: ActiveStatus;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.role) query.set("role", params.role);
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const response = await fetch(
      apiUrl(`/users${query.toString() ? `?${query.toString()}` : ""}`),
      {
        method: "GET",
        headers: makeHeaders(true),
      },
    );

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const data = (await response.json()) as {
      users: ApiUser[];
      pagination: { page: number; limit: number; total: number };
    };

    return {
      users: data.users,
      pagination: {
        current_page: data.pagination.page,
        total_pages: Math.max(
          1,
          Math.ceil(data.pagination.total / data.pagination.limit),
        ),
        page_size: data.pagination.limit,
        total_items: data.pagination.total,
      },
    } as UsersListResponse;
  },

  async getById(userId: number) {
    const response = await fetch(apiUrl(`/users/${userId}`), {
      method: "GET",
      headers: makeHeaders(true),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    return (await response.json()) as ApiUser;
  },

  async update(
    userId: number,
    payload: { name?: string; phone?: string; status?: ActiveStatus },
  ) {
    const response = await fetch(apiUrl(`/users/${userId}`), {
      method: "PUT",
      headers: makeHeaders(true),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    return (await response.json()) as ApiUser;
  },

  async remove(userId: number) {
    const response = await fetch(apiUrl(`/users/${userId}`), {
      method: "DELETE",
      headers: makeHeaders(true),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const data = (await response.json()) as { message: string; user?: ApiUser };
    return { success: true, user_id: userId, message: data.message };
  },

  async changePassword(
    userId: number,
    payload: { old_password: string; new_password: string },
  ) {
    const response = await fetch(apiUrl(`/users/${userId}/change-password`), {
      method: "POST",
      headers: makeHeaders(true),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const data = (await response.json()) as { message: string };
    return { success: true, user_id: userId, message: data.message };
  },
};

export const employeeApi = {
  async list(params?: { is_active?: boolean; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.is_active != null)
      query.set("is_active", String(params.is_active));
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const response = await fetch(apiUrl(`/employees?${query.toString()}`), {
      method: "GET",
      headers: makeHeaders(true),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    return (await response.json()) as EmployeesListResponse;
  },

  async create(payload: {
    user_id: number;
    home_lat?: number;
    home_lng?: number;
    is_active?: boolean;
  }) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl('/employees'), {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error('Create employee failed');
    // return (await response.json()) as ApiEmployee;

    await sleep(250);
    return {
      employee_id: mockId(),
      user_id: payload.user_id,
      home_lat: payload.home_lat,
      home_lng: payload.home_lng,
      is_active: payload.is_active ?? true,
    };
  },

  async getById(employeeId: number) {
    const response = await fetch(apiUrl(`/employees/${employeeId}`), {
      method: "GET",
      headers: makeHeaders(true),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    return (await response.json()) as ApiEmployee;
  },

  async update(
    employeeId: number,
    payload: { home_lat?: number; home_lng?: number; is_active?: boolean },
  ) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/employees/${employeeId}`), {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error('Update employee failed');
    // return (await response.json()) as ApiEmployee;

    await sleep(220);
    return {
      employee_id: employeeId,
      user_id: 1,
      home_lat: payload.home_lat ?? 23.8,
      home_lng: payload.home_lng ?? 90.4,
      is_active: payload.is_active ?? true,
    };
  },

  async remove(employeeId: number) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/employees/${employeeId}`), { method: 'DELETE' });
    // if (!response.ok) throw new Error('Delete employee failed');

    await sleep(180);
    return { success: true, employee_id: employeeId };
  },

  async pickupHistory(
    employeeId: number,
    params?: { from_date?: string; to_date?: string; status?: RequestStatus },
  ) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/employees/${employeeId}/pickup-history`));
    // if (!response.ok) throw new Error('Employee pickup history failed');
    // return (await response.json()) as ApiPickupRequest[];

    await sleep(220);
    const one = {
      pickup_id: 1,
      employee_id: employeeId,
      pickup_lat: 23.8,
      pickup_lng: 90.4,
      shift_start_time: nowTime(),
      service_date: nowDate(),
      request_type: "Regular" as RequestType,
      status: (params?.status ?? "Approved") as RequestStatus,
      created_at: new Date().toISOString(),
    };
    return [one];
  },

  async dropoffHistory(
    employeeId: number,
    params?: { from_date?: string; to_date?: string },
  ) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/employees/${employeeId}/dropoff-history`));
    // if (!response.ok) throw new Error('Employee dropoff history failed');
    // return (await response.json()) as ApiDropoffRequest[];

    await sleep(220);
    return [
      {
        dropoff_id: 1,
        employee_id: employeeId,
        drop_lat: 23.8,
        drop_lng: 90.4,
        shift_end_time: nowTime(),
        service_date: params?.from_date ?? nowDate(),
        status: "Approved",
        created_at: new Date().toISOString(),
      },
    ];
  },

  async getProfile(): Promise<EmployeeProfileResponse> {
    const response = await fetch(apiUrl("/employees/me"), {
      method: "GET",
      headers: makeHeaders(true),
    });
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return (await response.json()) as EmployeeProfileResponse;
  },

  async updateProfile(
    payload: EmployeeProfileUpdate,
  ): Promise<EmployeeProfileResponse> {
    const response = await fetch(apiUrl("/employees/me"), {
      method: "PUT",
      headers: makeHeaders(true),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return (await response.json()) as EmployeeProfileResponse;
  },

  async getSchedule(serviceDate?: string): Promise<ScheduleResponse> {
    const today = new Date().toISOString().split("T")[0];
    const query = new URLSearchParams({ service_date: serviceDate ?? today });
    const response = await fetch(
      apiUrl(`/employees/me/schedule?${query.toString()}`),
      {
        method: "GET",
        headers: makeHeaders(true),
      },
    );
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    return (await response.json()) as ScheduleResponse;
  },
};

export const driverApi = {
  async list(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const response = await fetch(apiUrl(`/drivers?${query.toString()}`), {
      method: "GET",
      headers: makeHeaders(true),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    return (await response.json()) as DriversListResponse;
  },

  async create(payload: { user_id: number; license_no: string }) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl('/drivers'), {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error('Create driver failed');
    // return (await response.json()) as ApiDriver;

    await sleep(250);
    return {
      driver_id: mockId(),
      user_id: payload.user_id,
      license_no: payload.license_no,
    };
  },

  async getById(driverId: number) {
    const response = await fetch(apiUrl(`/drivers/${driverId}`), {
      method: "GET",
      headers: makeHeaders(true),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    return (await response.json()) as ApiDriver;
  },

  async update(driverId: number, payload: { license_no?: string }) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/drivers/${driverId}`), {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error('Update driver failed');
    // return (await response.json()) as ApiDriver;

    await sleep(220);
    return {
      driver_id: driverId,
      user_id: 2,
      license_no: payload.license_no ?? "DL-123456789",
    };
  },

  async remove(driverId: number) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/drivers/${driverId}`), { method: 'DELETE' });
    // if (!response.ok) throw new Error('Delete driver failed');

    await sleep(180);
    return { success: true, driver_id: driverId };
  },

  async assignments(
    driverId: number,
    params?: { service_date?: string; status?: AssignmentStatus },
  ) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/drivers/${driverId}/assignments`));
    // if (!response.ok) throw new Error('Driver assignments failed');
    // return (await response.json()) as ApiRouteAssignment[];

    await sleep(220);
    return [
      {
        assignment_id: 1,
        route_id: 1,
        vehicle_id: 1,
        driver_id: driverId,
        status: params?.status ?? "Scheduled",
      },
    ];
  },
};

export const zoneApi = {
  async list() {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl('/zones'));
    // if (!response.ok) throw new Error('List zones failed');
    // return (await response.json()) as ApiZone[];

    await sleep(200);
    return [
      {
        zone_id: 1,
        zone_name: "Gulshan Area",
        description: "Gulshan 1, 2 and Banani",
      },
    ] as ApiZone[];
  },

  async create(payload: { zone_name: string; description?: string }) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl('/zones'), {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error('Create zone failed');
    // return (await response.json()) as ApiZone;

    await sleep(220);
    return {
      zone_id: mockId(),
      zone_name: payload.zone_name,
      description: payload.description,
    };
  },

  async getById(zoneId: number) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/zones/${zoneId}`));
    // if (!response.ok) throw new Error('Get zone failed');
    // return (await response.json()) as ApiZone;

    await sleep(200);
    return {
      zone_id: zoneId,
      zone_name: `Zone ${zoneId}`,
      description: "Mock zone",
    };
  },

  async update(
    zoneId: number,
    payload: { zone_name?: string; description?: string },
  ) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/zones/${zoneId}`), {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error('Update zone failed');
    // return (await response.json()) as ApiZone;

    await sleep(220);
    return {
      zone_id: zoneId,
      zone_name: payload.zone_name ?? `Zone ${zoneId}`,
      description: payload.description,
    };
  },

  async remove(zoneId: number) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/zones/${zoneId}`), { method: 'DELETE' });
    // if (!response.ok) throw new Error('Delete zone failed');

    await sleep(180);
    return { success: true, zone_id: zoneId };
  },
};

export const vehicleApi = {
  async list(params?: {
    status?: "Active" | "Inactive" | "Maintenance";
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const response = await fetch(apiUrl(`/vehicles?${query.toString()}`), {
      method: "GET",
      headers: makeHeaders(true),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    return (await response.json()) as VehiclesListResponse;
  },

  async create(payload: {
    plate_no: string;
    capacity: number;
    parking_lat?: number;
    parking_lng?: number;
    status?: "Active" | "Inactive" | "Maintenance";
  }) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl('/vehicles'), {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error('Create vehicle failed');
    // return (await response.json()) as ApiVehicle;

    await sleep(250);
    return {
      vehicle_id: mockId(),
      plate_no: payload.plate_no,
      capacity: payload.capacity,
      parking_lat: payload.parking_lat,
      parking_lng: payload.parking_lng,
      status: payload.status ?? "Active",
    };
  },

  async getById(vehicleId: number) {
    const response = await fetch(apiUrl(`/vehicles/${vehicleId}`), {
      method: "GET",
      headers: makeHeaders(true),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    return (await response.json()) as ApiVehicle;
  },

  async update(
    vehicleId: number,
    payload: {
      plate_no?: string;
      capacity?: number;
      parking_lat?: number;
      parking_lng?: number;
      status?: "Active" | "Inactive" | "Maintenance";
    },
  ) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/vehicles/${vehicleId}`), {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error('Update vehicle failed');
    // return (await response.json()) as ApiVehicle;

    await sleep(220);
    return {
      vehicle_id: vehicleId,
      plate_no: payload.plate_no ?? "DHA-GA-11-2345",
      capacity: payload.capacity ?? 15,
      parking_lat: payload.parking_lat,
      parking_lng: payload.parking_lng,
      status: payload.status ?? "Active",
    };
  },

  async remove(vehicleId: number) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/vehicles/${vehicleId}`), { method: 'DELETE' });
    // if (!response.ok) throw new Error('Delete vehicle failed');

    await sleep(180);
    return { success: true, vehicle_id: vehicleId };
  },

  async assignments(vehicleId: number, params?: { service_date?: string }) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/vehicles/${vehicleId}/assignments`));
    // if (!response.ok) throw new Error('Vehicle assignments failed');
    // return (await response.json()) as ApiRouteAssignment[];

    await sleep(220);
    return [
      {
        assignment_id: 1,
        route_id: 1,
        vehicle_id: vehicleId,
        driver_id: 1,
        status: "Scheduled" as AssignmentStatus,
        departure_time: params?.service_date ? "08:00:00" : undefined,
      },
    ];
  },
};

export const routeApi = {
  async list(params?: {
    zone_id?: number;
    route_type?: RouteType;
    service_date?: string;
    page?: number;
    limit?: number;
  }) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl('/routes'));
    // if (!response.ok) throw new Error('List routes failed');
    // return (await response.json()) as { routes: ApiRoute[]; pagination: Pagination };

    await sleep(250);
    const routes: ApiRoute[] = [
      {
        route_id: 1,
        zone_id: params?.zone_id,
        route_type: params?.route_type ?? "pickup",
        service_date: params?.service_date ?? nowDate(),
        shift_time: "09:00:00",
        total_distance_km: 12.3,
        total_travel_time_min: 45,
        created_at: new Date().toISOString(),
      },
    ];
    return {
      routes,
      pagination: mockPagination(
        params?.page ?? 1,
        params?.limit ?? 20,
        routes.length,
      ),
    };
  },

  async create(payload: {
    zone_id?: number;
    route_type: RouteType;
    service_date: string;
    shift_time?: string;
    total_distance_km?: number;
    total_travel_time_min?: number;
  }) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl('/routes'), {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error('Create route failed');
    // return (await response.json()) as ApiRoute;

    await sleep(250);
    return {
      route_id: mockId(),
      zone_id: payload.zone_id,
      route_type: payload.route_type,
      service_date: payload.service_date,
      shift_time: payload.shift_time,
      total_distance_km: payload.total_distance_km,
      total_travel_time_min: payload.total_travel_time_min,
      created_at: new Date().toISOString(),
    };
  },

  async getById(routeId: number) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/routes/${routeId}`));
    // if (!response.ok) throw new Error('Get route failed');
    // return (await response.json()) as ApiRoute & { stops: ApiRouteStop[] };

    await sleep(220);
    return {
      route_id: routeId,
      zone_id: 1,
      route_type: "pickup" as RouteType,
      service_date: nowDate(),
      shift_time: "09:00:00",
      total_distance_km: 12.3,
      total_travel_time_min: 45,
      created_at: new Date().toISOString(),
      stops: [] as ApiRouteStop[],
    };
  },

  async update(
    routeId: number,
    payload: {
      zone_id?: number;
      shift_time?: string;
      total_distance_km?: number;
      total_travel_time_min?: number;
    },
  ) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/routes/${routeId}`), {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error('Update route failed');
    // return (await response.json()) as ApiRoute;

    await sleep(220);
    return {
      route_id: routeId,
      zone_id: payload.zone_id,
      route_type: "pickup" as RouteType,
      service_date: nowDate(),
      shift_time: payload.shift_time ?? "09:00:00",
      total_distance_km: payload.total_distance_km ?? 12.3,
      total_travel_time_min: payload.total_travel_time_min ?? 45,
      created_at: new Date().toISOString(),
    };
  },

  async remove(routeId: number) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/routes/${routeId}`), { method: 'DELETE' });
    // if (!response.ok) throw new Error('Delete route failed');

    await sleep(180);
    return { success: true, route_id: routeId };
  },

  async listStops(routeId: number) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/routes/${routeId}/stops`));
    // if (!response.ok) throw new Error('List route stops failed');
    // return (await response.json()) as ApiRouteStop[];

    await sleep(200);
    return [
      {
        stop_id: 1,
        route_id: routeId,
        latitude: 23.8,
        longitude: 90.4,
        sequence_order: 1,
      },
    ] as ApiRouteStop[];
  },

  async addStop(
    routeId: number,
    payload: {
      latitude: number;
      longitude: number;
      sequence_order: number;
      arrival_time?: string;
      departure_time?: string;
    },
  ) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/routes/${routeId}/stops`), {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error('Add route stop failed');
    // return (await response.json()) as ApiRouteStop;

    await sleep(220);
    return {
      stop_id: mockId(),
      route_id: routeId,
      ...payload,
    };
  },

  async updateStop(
    routeId: number,
    stopId: number,
    payload: {
      latitude?: number;
      longitude?: number;
      sequence_order?: number;
      arrival_time?: string;
      departure_time?: string;
    },
  ) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/routes/${routeId}/stops/${stopId}`), {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error('Update route stop failed');
    // return (await response.json()) as ApiRouteStop;

    await sleep(220);
    return {
      stop_id: stopId,
      route_id: routeId,
      latitude: payload.latitude ?? 23.8,
      longitude: payload.longitude ?? 90.4,
      sequence_order: payload.sequence_order ?? 1,
      arrival_time: payload.arrival_time,
      departure_time: payload.departure_time,
    };
  },

  async removeStop(routeId: number, stopId: number) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/routes/${routeId}/stops/${stopId}`), { method: 'DELETE' });
    // if (!response.ok) throw new Error('Delete route stop failed');

    await sleep(180);
    return { success: true, route_id: routeId, stop_id: stopId };
  },

  async optimize(routeId: number) {
    // Backend API call (enable when backend is ready):
    // const response = await fetch(apiUrl(`/routes/${routeId}/optimize`), { method: 'POST' });
    // if (!response.ok) throw new Error('Optimize route failed');
    // return (await response.json()) as ApiRoute & { stops: ApiRouteStop[] };

    await sleep(300);
    return {
      route_id: routeId,
      zone_id: 1,
      route_type: "pickup" as RouteType,
      service_date: nowDate(),
      shift_time: "09:00:00",
      total_distance_km: 10.8,
      total_travel_time_min: 39,
      created_at: new Date().toISOString(),
      stops: [
        {
          stop_id: 1,
          route_id: routeId,
          latitude: 23.8,
          longitude: 90.4,
          sequence_order: 1,
        },
      ] as ApiRouteStop[],
    };
  },
};
