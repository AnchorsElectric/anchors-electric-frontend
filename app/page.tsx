import Link from 'next/link';
import styles from './page.module.scss';

export default function Home() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Anchors Electric</h1>
        <p className={styles.description}>Employee Management System</p>
        
        <div className={styles.actions}>
          <Link href="/login" className={styles.button}>
            Login
          </Link>
          <Link href="/register" className={styles.buttonSecondary}>
            Register
          </Link>
        </div>
      </main>
    </div>
  );
}
