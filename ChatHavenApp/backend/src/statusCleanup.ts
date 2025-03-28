import cron from 'node-cron';
import OnlineStatusService from './services/onlineStatusService';

export default function scheduleStatusCleanup(): void {
  // Run status cleanup at 3:00 AM every day
  cron.schedule('0 3 * * *', () => {
    console.log('Running cleanup of stale user status data');
    try {
      OnlineStatusService.clearStaleUsers();
      console.log('Cleanup completed successfully');
    } catch (error) {
      console.error('Error during status cleanup:', error);
    }
  });

  // Add more frequent status verification - every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    try {
      OnlineStatusService.verifyActiveStatuses();
      console.info('Active statuses verified successfully');
    } catch (error) {
      console.error('Error during status verification:', error);
    }
  });

  console.log('Status cleanup and verification scheduled');
}