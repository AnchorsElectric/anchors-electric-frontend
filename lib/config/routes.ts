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
  
  // Time Entries - accessible to regular users, admins, accountants, and project managers
  {
    path: '/employee/time-entries',
    label: 'Time Entries',
    allowedRoles: ['USER', 'ADMIN', 'ACCOUNTANT', 'PROJECT_MANAGER'],
    category: 'employee',
  },
  
  // Pay Periods (Employee view) - accessible to regular users, admins, accountants, and project managers
  {
    path: '/employee/pay-periods',
    label: 'Pay Periods',
    allowedRoles: ['USER', 'ADMIN', 'ACCOUNTANT', 'PROJECT_MANAGER'],
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
  
  // Pay Periods (Admin view) - accessible to admins and HR (NOT USER)
  {
    path: '/admin/pay-periods',
    label: 'Pay Periods',
    allowedRoles: ['ADMIN', 'HR'],
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
 * Filters and groups routes appropriately
 */
export function getNavigationItems(role: UserRole | null | undefined): RouteConfig[] {
  if (!role) return [];
  
  // For USER role, explicitly return only the 3 allowed routes
  if (role === 'USER') {
    return APP_ROUTES.filter(route => 
      route.path === '/employee/profile' ||
      route.path === '/employee/time-entries' ||
      route.path === '/employee/pay-periods'
    );
  }
  
  // For staff roles, get all accessible routes
  const accessibleRoutes = getRoutesForRole(role);
  
  // Remove duplicates (e.g., both /employee/profile and /admin/profile)
  // Prefer admin routes for staff roles
  const uniqueRoutes: RouteConfig[] = [];
  const seenLabels = new Set<string>();
  
  for (const route of accessibleRoutes) {
    // PROJECT_MANAGER, ADMIN, and ACCOUNTANT need both admin routes AND employee routes (time entries, pay periods)
    if (role === 'PROJECT_MANAGER' || role === 'ADMIN' || role === 'ACCOUNTANT') {
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
