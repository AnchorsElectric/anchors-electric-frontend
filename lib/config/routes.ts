/**
 * Route configuration for Role-Based Access Control (RBAC)
 * Defines all routes, their paths, labels, and which roles can access them
 */

export type UserRole = 'USER' | 'ADMIN' | 'ACCOUNTANT' | 'HR' | 'PROJECT_MANAGER';

export interface RouteConfig {
  path: string;
  label: string;
  allowedRoles: UserRole[];
  icon?: string; // Optional icon for future use
  category?: 'admin' | 'employee' | 'shared'; // For grouping in navigation
}

/**
 * All application routes with their access permissions
 */
export const APP_ROUTES: RouteConfig[] = [
  // Profile - accessible to all authenticated users
  {
    path: '/employee/profile',
    label: 'Profile',
    allowedRoles: ['USER', 'ADMIN', 'ACCOUNTANT', 'HR', 'PROJECT_MANAGER'],
    category: 'shared',
  },
  {
    path: '/admin/profile',
    label: 'Profile',
    allowedRoles: ['ADMIN', 'ACCOUNTANT', 'HR', 'PROJECT_MANAGER'],
    category: 'admin',
  },
  
  // Time Entries - accessible to regular users, admins, accountants, HR, and project managers
  {
    path: '/employee/time-entries',
    label: 'Time Entries',
    allowedRoles: ['USER', 'ADMIN', 'ACCOUNTANT', 'HR', 'PROJECT_MANAGER'],
    category: 'employee',
  },
  
  // Pay Period History (Employee view) - user's own submitted/approved/paid periods
  {
    path: '/employee/pay-periods',
    label: 'Pay Period History',
    allowedRoles: ['USER', 'ADMIN', 'ACCOUNTANT', 'HR', 'PROJECT_MANAGER'],
    category: 'employee',
  },
  
  // Users (Admin/Staff view) - accessible to all staff roles (NOT USER)
  {
    path: '/admin/users',
    label: 'Users',
    allowedRoles: ['ADMIN', 'ACCOUNTANT', 'HR', 'PROJECT_MANAGER'],
    category: 'admin',
  },
  
  // Projects - accessible to admins, HR, and project managers
  {
    path: '/admin/projects',
    label: 'Projects',
    allowedRoles: ['ADMIN', 'HR', 'PROJECT_MANAGER'],
    category: 'admin',
  },
  
  // Review Pay Periods (Admin view) - review/approve/reject/mark paid submissions from users
  {
    path: '/admin/pay-periods',
    label: 'Review Pay Periods',
    allowedRoles: ['ADMIN', 'HR', 'PROJECT_MANAGER', 'ACCOUNTANT'],
    category: 'admin',
  },
];

/**
 * Get all routes that a user with a given role can access
 */
export function getRoutesForRole(role: UserRole | null | undefined): RouteConfig[] {
  if (!role) return [];
  return APP_ROUTES.filter(route => route.allowedRoles.includes(role));
}

/**
 * Check if a user with a given role can access a specific route
 */
export function canAccessRoute(path: string, role: UserRole | null | undefined): boolean {
  if (!role) return false;
  
  // Check exact match first
  const exactRoute = APP_ROUTES.find(r => r.path === path);
  if (exactRoute) {
    return exactRoute.allowedRoles.includes(role);
  }
  
  // Check if path starts with any route path (for nested routes like /admin/users/[id])
  const matchingRoute = APP_ROUTES.find(r => path.startsWith(r.path));
  if (matchingRoute) {
    return matchingRoute.allowedRoles.includes(role);
  }
  
  return false;
}

/**
 * Get the default route for a user based on their role
 */
export function getDefaultRoute(role: UserRole | null | undefined): string {
  if (!role) return '/login';
  
  // All users can access profile
  if (role === 'USER') {
    return '/employee/profile';
  }
  
  // Staff roles default to admin profile
  return '/admin/profile';
}

/**
 * Get navigation items for a user based on their role
 * Filters and groups routes appropriately.
 * When hasEmployeeProfile is false (e.g. new user without employee profile), Time Entries and Pay Period History are hidden.
 */
export function getNavigationItems(
  role: UserRole | null | undefined,
  hasEmployeeProfile: boolean = true
): RouteConfig[] {
  if (!role) return [];

  const employeeOnlyPaths = ['/employee/time-entries', '/employee/pay-periods'];

  // For USER role, explicitly return only the allowed routes; hide time/pay-period tabs if no employee profile
  if (role === 'USER') {
    return APP_ROUTES.filter(route => {
      if (route.path === '/employee/profile') return true;
      if (employeeOnlyPaths.includes(route.path)) return hasEmployeeProfile;
      return false;
    });
  }

  // For staff roles, get all accessible routes
  let accessibleRoutes = getRoutesForRole(role);
  if (!hasEmployeeProfile) {
    accessibleRoutes = accessibleRoutes.filter(route => !employeeOnlyPaths.includes(route.path));
  }
  
  // Remove duplicates (e.g., both /employee/profile and /admin/profile)
  // Prefer admin routes for staff roles
  const uniqueRoutes: RouteConfig[] = [];
  const seenLabels = new Set<string>();
  
  for (const route of accessibleRoutes) {
    // PROJECT_MANAGER, ADMIN, ACCOUNTANT, and HR need both admin routes AND employee routes (time entries, pay periods)
    if (role === 'PROJECT_MANAGER' || role === 'ADMIN' || role === 'ACCOUNTANT' || role === 'HR') {
      // Include all routes for PROJECT_MANAGER and ADMIN (admin, shared, and employee)
      if (route.category === 'admin' || route.category === 'shared' || route.category === 'employee') {
        // For shared routes, prefer admin version
        if (route.category === 'shared' && route.path.startsWith('/employee/')) {
          // Skip employee version of shared routes
          continue;
        }
        if (!seenLabels.has(route.label)) {
          uniqueRoutes.push(route);
          seenLabels.add(route.label);
        }
      }
    } else {
      // Other staff roles: prefer admin routes, but include shared employee routes
      if (route.category === 'admin' || route.category === 'shared') {
        // For shared routes, prefer admin version for staff roles
        if (route.category === 'shared' && route.path.startsWith('/employee/')) {
          // Skip employee version of shared routes for staff
          continue;
        }
        if (!seenLabels.has(route.label)) {
          uniqueRoutes.push(route);
          seenLabels.add(route.label);
        }
      }
    }
  }
  
  return uniqueRoutes;
}
