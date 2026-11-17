'use client';

import styles from './ApprovedDashboard.module.css';

/**
 * The user-approved V2 layout is isolated from global workspace CSS.
 * Its same-origin iframe now calls authenticated AgentH APIs; advanced
 * browser and connector controls remain accessible in the legacy workspace.
 */
export default function ApprovedDashboard() {
  return (
    <div className={styles.shell}>
      <iframe
        title="AgentH V2 dashboard"
        src="/reference/agenth-live.html?embed=1"
        className={styles.frame}
        allow="microphone; autoplay; accelerometer; gyroscope"
      />
      <a className={styles.liveLink} href="/dashboard?tab=legacy" title="Open advanced tools and connector setup">
        Advanced tools
      </a>
    </div>
  );
}
