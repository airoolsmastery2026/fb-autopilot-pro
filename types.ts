export interface UserProfile {
  id: string;
  name: string;
  pictureUrl: string;
}

export interface ScheduledPost {
  id: string;
  content: string;
  imageUrl?: string;
  scheduledTime: string;
  status: 'Scheduled' | 'Posted' | 'Failed';
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  status: 'Success' | 'Error';
}
