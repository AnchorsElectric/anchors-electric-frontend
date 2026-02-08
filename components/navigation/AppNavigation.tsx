'use client';

import { useRouter, usePathname } from 'next/navigation';
import { getNavigationItems, UserRole } from '@/lib/config/routes';
import styles from './app-navigation.module.scss';

interface AppNavigationProps {
  userRole: UserRole | null;
  hasEmployeeProfile?: boolean;
}

/**
 * Unified navigation component that displays menu items based on user role
 * Shows all accessible routes regardless of /admin or /employee prefix.
 * Time Entries and Pay Period History are hidden when hasEmployeeProfile is false.
 */
export default function AppNavigation({ userRole, hasEmployeeProfile = true }: AppNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const navItems = getNavigationItems(userRole, hasEmployeeProfile);

  const handleNavClick = (path: string) => {
    router.push(path);
  };

  const isActive = (path: string): boolean => {
    if (path === '/employee/profile' || path === '/admin/profile') {
      return pathname === '/employee/profile' || pathname === '/admin/profile';
    }
    return pathname?.startsWith(path) || false;
  };

  if (!userRole || navItems.length === 0) {
    return null;
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
            onClick={() => handleNavClick(item.path)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
