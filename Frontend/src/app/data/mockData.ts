// Mock data for the Transport Route Management System

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "employee" | "driver" | "admin";
  address?: string;
  latitude?: number;
  longitude?: number;
  home_lat?: number;
  home_lng?: number;
}

export interface Request {
  id: string;
  employeeId: string;
  type: "pickup" | "dropoff";
  location: string;
  latitude: number;
  longitude: number;
  serviceDate: string;
  shiftTime: string;
  requestType: "regular" | "adhoc";
  status: "pending" | "approved" | "rejected";
  assignedDriver?: string;
  assignedVehicle?: string;
  estimatedTime?: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  capacity: number;
  type: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleId: string;
}

export interface RouteStop {
  id: string;
  order: number;
  location: string;
  latitude: number;
  longitude: number;
  passengers: Passenger[];
  type: "pickup" | "dropoff";
  estimatedTime: string;
}

export interface Passenger {
  id: string;
  name: string;
  phone: string;
  isBoarded: boolean;
}

// Mock Users
export const mockUsers: User[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@company.com",
    phone: "+1-555-0101",
    role: "employee",
    address: "123 Main St, Springfield",
    latitude: 40.7128,
    longitude: -74.006,
  },
  {
    id: "2",
    name: "Sarah Wilson",
    email: "sarah.wilson@company.com",
    phone: "+1-555-0202",
    role: "driver",
    address: "456 Oak Ave, Springfield",
    latitude: 40.758,
    longitude: -73.9855,
  },
];

// Mock Vehicles
export const mockVehicles: Vehicle[] = [
  {
    id: "v1",
    plateNumber: "ABC-1234",
    capacity: 8,
    type: "Van",
  },
  {
    id: "v2",
    plateNumber: "XYZ-5678",
    capacity: 12,
    type: "Mini Bus",
  },
];

// Mock Drivers
export const mockDrivers: Driver[] = [
  {
    id: "d1",
    name: "Sarah Wilson",
    phone: "+1-555-0202",
    vehicleId: "v1",
  },
  {
    id: "d2",
    name: "Mike Johnson",
    phone: "+1-555-0303",
    vehicleId: "v2",
  },
];

// Mock Requests
export const mockRequests: Request[] = [
  {
    id: "r1",
    employeeId: "1",
    type: "pickup",
    location: "123 Main St, Springfield",
    latitude: 40.7128,
    longitude: -74.006,
    serviceDate: "2026-02-17",
    shiftTime: "08:00",
    requestType: "regular",
    status: "approved",
    assignedDriver: "Sarah Wilson",
    assignedVehicle: "ABC-1234",
    estimatedTime: "25 mins",
  },
  {
    id: "r2",
    employeeId: "1",
    type: "dropoff",
    location: "Office Complex, 789 Business Park",
    latitude: 40.7489,
    longitude: -73.968,
    serviceDate: "2026-02-17",
    shiftTime: "17:00",
    requestType: "regular",
    status: "approved",
    assignedDriver: "Sarah Wilson",
    assignedVehicle: "ABC-1234",
    estimatedTime: "30 mins",
  },
];

// Mock Route Stops
export const mockRouteStops: RouteStop[] = [
  {
    id: "s1",
    order: 1,
    location: "123 Main St, Springfield",
    latitude: 40.7128,
    longitude: -74.006,
    type: "pickup",
    estimatedTime: "08:00",
    passengers: [
      { id: "p1", name: "John Doe", phone: "+1-555-0101", isBoarded: false },
      { id: "p2", name: "Jane Smith", phone: "+1-555-0102", isBoarded: false },
    ],
  },
  {
    id: "s2",
    order: 2,
    location: "456 Elm St, Springfield",
    latitude: 40.7282,
    longitude: -74.0776,
    type: "pickup",
    estimatedTime: "08:15",
    passengers: [
      { id: "p3", name: "Bob Johnson", phone: "+1-555-0103", isBoarded: false },
    ],
  },
  {
    id: "s3",
    order: 3,
    location: "789 Oak Ave, Springfield",
    latitude: 40.7589,
    longitude: -73.9851,
    type: "pickup",
    estimatedTime: "08:30",
    passengers: [
      { id: "p4", name: "Alice Brown", phone: "+1-555-0104", isBoarded: false },
      {
        id: "p5",
        name: "Charlie Davis",
        phone: "+1-555-0105",
        isBoarded: false,
      },
    ],
  },
  {
    id: "s4",
    order: 4,
    location: "Office Complex, 789 Business Park",
    latitude: 40.7489,
    longitude: -73.968,
    type: "dropoff",
    estimatedTime: "09:00",
    passengers: [
      { id: "p1", name: "John Doe", phone: "+1-555-0101", isBoarded: true },
      { id: "p2", name: "Jane Smith", phone: "+1-555-0102", isBoarded: true },
      { id: "p3", name: "Bob Johnson", phone: "+1-555-0103", isBoarded: true },
      { id: "p4", name: "Alice Brown", phone: "+1-555-0104", isBoarded: true },
      {
        id: "p5",
        name: "Charlie Davis",
        phone: "+1-555-0105",
        isBoarded: true,
      },
    ],
  },
];
