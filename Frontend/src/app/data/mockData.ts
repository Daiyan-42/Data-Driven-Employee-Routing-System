// Mock data for the Transport Route Management System — Dhaka, Bangladesh

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'employee' | 'driver' | 'admin';
  address?: string;
  latitude?: number;
  longitude?: number;
  department?: string;
  employeeId?: string;
  password?: string;
}

export interface Request {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'pickup' | 'dropoff';
  location: string;
  latitude: number;
  longitude: number;
  serviceDate: string;
  shiftTime: string;
  day: string;
  requestType: 'regular' | 'adhoc';
  status: 'pending' | 'approved' | 'rejected' | 'routed';
  assignedDriver?: string;
  assignedVehicle?: string;
  assignedRoute?: string;
  estimatedTime?: string;
  stopOrder?: number;
  stops?: RouteStop[];
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  capacity: number;
  type: string;
  model: string;
  color: string;
  driverId?: string;
}

export interface Driver {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  vehicleId: string;
  licenseNumber: string;
  experience: string;
}

export interface RouteStop {
  id: string;
  order: number;
  location: string;
  latitude: number;
  longitude: number;
  passengers: Passenger[];
  type: 'pickup' | 'dropoff';
  estimatedTime: string;
  travelFromPrev?: string;
}

export interface Passenger {
  id: string;
  name: string;
  phone: string;
  isBoarded: boolean;
}

export interface RoutePlan {
  id: string;
  name: string;
  timeSlot: string;
  shiftTime: string;
  date: string;
  status: 'not-started' | 'in-progress' | 'completed';
  driverId: string;
  vehicleId: string;
  stops: RouteStop[];
  totalDistance: string;
  totalDuration: string;
}

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Rafiq Ahmed',
    email: 'rafiq.ahmed@company.com',
    phone: '+880-1711-123456',
    role: 'employee',
    address: 'House 12, Road 5, Banani, Dhaka',
    latitude: 23.7938,
    longitude: 90.4030,
    department: 'Engineering',
    employeeId: 'EMP-001',
    password: 'demo123',
  },
  {
    id: '2',
    name: 'Sumaiya Khanam',
    email: 'sumaiya.khanam@company.com',
    phone: '+880-1812-654321',
    role: 'employee',
    address: 'Flat 4B, Dhanmondi 27, Dhaka',
    latitude: 23.7461,
    longitude: 90.3742,
    department: 'Finance',
    employeeId: 'EMP-002',
    password: 'demo123',
  },
  {
    id: '3',
    name: 'Tariq Hassan',
    email: 'tariq.hassan@company.com',
    phone: '+880-1917-789012',
    role: 'employee',
    address: 'House 3, Block G, Bashundhara R/A, Dhaka',
    latitude: 23.8149,
    longitude: 90.4270,
    department: 'HR',
    employeeId: 'EMP-003',
    password: 'demo123',
  },
  {
    id: '4',
    name: 'Nadia Islam',
    email: 'nadia.islam@company.com',
    phone: '+880-1611-345678',
    role: 'employee',
    address: 'House 88, Road 11, Uttara Sector 4, Dhaka',
    latitude: 23.8751,
    longitude: 90.3975,
    department: 'Marketing',
    employeeId: 'EMP-004',
    password: 'demo123',
  },
  {
    id: '5',
    name: 'Kamal Hossain',
    email: 'kamal.hossain@company.com',
    phone: '+880-1511-901234',
    role: 'employee',
    address: 'House 7, Road 2, Mirpur 12, Dhaka',
    latitude: 23.8041,
    longitude: 90.3540,
    department: 'Operations',
    employeeId: 'EMP-005',
    password: 'demo123',
  },
  {
    id: 'd1',
    name: 'Jahangir Alam',
    email: 'jahangir.alam@company.com',
    phone: '+880-1712-111222',
    role: 'driver',
    address: 'Khilgaon, Dhaka',
    latitude: 23.7537,
    longitude: 90.4295,
    password: 'demo123',
  },
  {
    id: 'd2',
    name: 'Ruhul Amin',
    email: 'ruhul.amin@company.com',
    phone: '+880-1813-333444',
    role: 'driver',
    address: 'Demra, Dhaka',
    latitude: 23.7201,
    longitude: 90.4500,
    password: 'demo123',
  },
  {
    id: 'admin1',
    name: 'Admin User',
    email: 'admin@company.com',
    phone: '+880-1700-000000',
    role: 'admin',
    password: 'admin123',
  },
];

// Mock Vehicles
export const mockVehicles: Vehicle[] = [
  {
    id: 'v1',
    plateNumber: 'Dhaka Metro-GA 11-2234',
    capacity: 12,
    type: 'Microbus',
    model: 'Toyota HiAce 2022',
    color: 'White',
    driverId: 'd1',
  },
  {
    id: 'v2',
    plateNumber: 'Dhaka Metro-GA 33-4456',
    capacity: 8,
    type: 'Noah Van',
    model: 'Toyota Noah 2021',
    color: 'Silver',
    driverId: 'd2',
  },
  {
    id: 'v3',
    plateNumber: 'Dhaka Metro-GA 55-6678',
    capacity: 15,
    type: 'Mini Bus',
    model: 'Tata Winger 2023',
    color: 'Blue',
    driverId: undefined,
  },
];

// Mock Drivers
export const mockDrivers: Driver[] = [
  {
    id: 'd1',
    userId: 'd1',
    name: 'Jahangir Alam',
    phone: '+880-1712-111222',
    email: 'jahangir.alam@company.com',
    vehicleId: 'v1',
    licenseNumber: 'BD-DRV-2019-11234',
    experience: '8 years',
  },
  {
    id: 'd2',
    userId: 'd2',
    name: 'Ruhul Amin',
    phone: '+880-1813-333444',
    email: 'ruhul.amin@company.com',
    vehicleId: 'v2',
    licenseNumber: 'BD-DRV-2021-55678',
    experience: '5 years',
  },
];

// Office location (Motijheel — Dhaka business district)
export const OFFICE_LOCATION = {
  name: 'Office — Motijheel Commercial Area, Dhaka',
  latitude: 23.7298,
  longitude: 90.4182,
};

// Mock Requests
export const mockRequests: Request[] = [
  {
    id: 'r1',
    employeeId: '1',
    employeeName: 'Rafiq Ahmed',
    type: 'pickup',
    location: 'House 12, Road 5, Banani, Dhaka',
    latitude: 23.7938,
    longitude: 90.4030,
    serviceDate: '2026-07-07',
    shiftTime: '07:00',
    day: 'monday',
    requestType: 'regular',
    status: 'routed',
    assignedDriver: 'Jahangir Alam',
    assignedVehicle: 'Dhaka Metro-GA 11-2234',
    assignedRoute: 'Route A — Morning 7AM',
    estimatedTime: '45 mins',
    stopOrder: 1,
  },
  {
    id: 'r2',
    employeeId: '1',
    employeeName: 'Rafiq Ahmed',
    type: 'pickup',
    location: 'House 12, Road 5, Banani, Dhaka',
    latitude: 23.7938,
    longitude: 90.4030,
    serviceDate: '2026-07-08',
    shiftTime: '07:00',
    day: 'tuesday',
    requestType: 'regular',
    status: 'pending',
  },
  {
    id: 'r3',
    employeeId: '2',
    employeeName: 'Sumaiya Khanam',
    type: 'pickup',
    location: 'Flat 4B, Dhanmondi 27, Dhaka',
    latitude: 23.7461,
    longitude: 90.3742,
    serviceDate: '2026-07-07',
    shiftTime: '07:00',
    day: 'monday',
    requestType: 'regular',
    status: 'routed',
    assignedDriver: 'Ruhul Amin',
    assignedVehicle: 'Dhaka Metro-GA 33-4456',
    assignedRoute: 'Route B — Morning 7AM',
    estimatedTime: '55 mins',
    stopOrder: 2,
  },
  {
    id: 'r4',
    employeeId: '3',
    employeeName: 'Tariq Hassan',
    type: 'pickup',
    location: 'House 3, Block G, Bashundhara R/A, Dhaka',
    latitude: 23.8149,
    longitude: 90.4270,
    serviceDate: '2026-07-07',
    shiftTime: '10:00',
    day: 'monday',
    requestType: 'regular',
    status: 'pending',
  },
  {
    id: 'r5',
    employeeId: '1',
    employeeName: 'Rafiq Ahmed',
    type: 'adhoc',
    location: 'Gulshan-2 Circle, Dhaka',
    latitude: 23.7938,
    longitude: 90.4143,
    serviceDate: '2026-07-07',
    shiftTime: '19:00',
    day: 'monday',
    requestType: 'adhoc',
    status: 'pending',
  },
];

// Mock Route Plans for driver
export const mockRoutePlans: RoutePlan[] = [
  {
    id: 'rp1',
    name: 'Route A — Morning Pickup',
    timeSlot: '7:00 AM — 8:30 AM',
    shiftTime: '07:00',
    date: '2026-07-07',
    status: 'in-progress',
    driverId: 'd1',
    vehicleId: 'v1',
    totalDistance: '24.6 km',
    totalDuration: '90 mins',
    stops: [
      {
        id: 's1',
        order: 1,
        type: 'pickup',
        location: 'House 12, Road 5, Banani',
        latitude: 23.7938,
        longitude: 90.4030,
        estimatedTime: '07:15 AM',
        travelFromPrev: 'Start',
        passengers: [
          { id: 'p1', name: 'Rafiq Ahmed', phone: '+880-1711-123456', isBoarded: true },
        ],
      },
      {
        id: 's2',
        order: 2,
        type: 'pickup',
        location: 'House 88, Road 11, Uttara Sector 4',
        latitude: 23.8751,
        longitude: 90.3975,
        estimatedTime: '07:35 AM',
        travelFromPrev: '8.2 km • 20 mins',
        passengers: [
          { id: 'p4', name: 'Nadia Islam', phone: '+880-1611-345678', isBoarded: false },
        ],
      },
      {
        id: 's3',
        order: 3,
        type: 'pickup',
        location: 'House 7, Road 2, Mirpur 12',
        latitude: 23.8041,
        longitude: 90.3540,
        estimatedTime: '07:55 AM',
        travelFromPrev: '6.4 km • 20 mins',
        passengers: [
          { id: 'p5', name: 'Kamal Hossain', phone: '+880-1511-901234', isBoarded: false },
        ],
      },
      {
        id: 's4',
        order: 4,
        type: 'dropoff',
        location: 'Office — Motijheel Commercial Area',
        latitude: 23.7298,
        longitude: 90.4182,
        estimatedTime: '08:30 AM',
        travelFromPrev: '10.0 km • 35 mins',
        passengers: [],
      },
    ],
  },
  {
    id: 'rp2',
    name: 'Route A — Evening Dropoff',
    timeSlot: '7:00 PM — 9:00 PM',
    shiftTime: '19:00',
    date: '2026-07-07',
    status: 'not-started',
    driverId: 'd1',
    vehicleId: 'v1',
    totalDistance: '24.6 km',
    totalDuration: '120 mins',
    stops: [
      {
        id: 's5',
        order: 1,
        type: 'pickup',
        location: 'Office — Motijheel Commercial Area',
        latitude: 23.7298,
        longitude: 90.4182,
        estimatedTime: '07:00 PM',
        travelFromPrev: 'Start',
        passengers: [
          { id: 'p1', name: 'Rafiq Ahmed', phone: '+880-1711-123456', isBoarded: false },
          { id: 'p4', name: 'Nadia Islam', phone: '+880-1611-345678', isBoarded: false },
          { id: 'p5', name: 'Kamal Hossain', phone: '+880-1511-901234', isBoarded: false },
        ],
      },
      {
        id: 's6',
        order: 2,
        type: 'dropoff',
        location: 'House 7, Road 2, Mirpur 12',
        latitude: 23.8041,
        longitude: 90.3540,
        estimatedTime: '07:35 PM',
        travelFromPrev: '10.0 km • 35 mins',
        passengers: [],
      },
      {
        id: 's7',
        order: 3,
        type: 'dropoff',
        location: 'House 88, Road 11, Uttara Sector 4',
        latitude: 23.8751,
        longitude: 90.3975,
        estimatedTime: '08:05 PM',
        travelFromPrev: '8.2 km • 30 mins',
        passengers: [],
      },
      {
        id: 's8',
        order: 4,
        type: 'dropoff',
        location: 'House 12, Road 5, Banani',
        latitude: 23.7938,
        longitude: 90.4030,
        estimatedTime: '08:40 PM',
        travelFromPrev: '6.4 km • 35 mins',
        passengers: [],
      },
    ],
  },
];
