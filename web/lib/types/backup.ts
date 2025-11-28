export interface BackupRecord {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
  note?: string;
  createdBy?: string;
}

export interface CreateBackupPayload {
  note?: string;
}
