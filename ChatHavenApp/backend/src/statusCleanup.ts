import cron from 'node-cron';
import OnlineStatusService from './services/onlineStatusService';

export default function scheduleStatusCleanup(): void {
  // Run at 3:00 AM every day
  cron.schedule('0 3 * * *', () => {
    console.log('Running cleanup of stale user status data');
    try {
      OnlineStatusService.clearStaleUsers();
      console.log('Cleanup completed successfully');
    } catch (error) {
      console.error('Error during status cleanup:', error);
    }
  });

  console.log('Status cleanup scheduled');
}
