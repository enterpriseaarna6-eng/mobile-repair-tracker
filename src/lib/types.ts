export type UserRole = 'admin' | 'technician';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export type RepairStatus = 'pending' | 'completed';

export interface PickupBatch {
  id: string; // e.g. "PB-20261105-001"
  pickup_date: string; // "YYYY-MM-DD" in Asia/Kolkata
  pickup_time?: string; // "HH:mm" in Asia/Kolkata
  pickup_image_url: string;
  technician_id: string;
  technician_name?: string;
  created_at: string;
}

export interface ReturnBatch {
  id: string; // e.g. "RB-20261105-001"
  return_date: string; // "YYYY-MM-DD" in Asia/Kolkata
  return_time?: string; // "HH:mm" in Asia/Kolkata
  return_image_url: string;
  technician_id: string;
  technician_name?: string;
  created_at: string;
}

export interface RepairItem {
  id: string; // unique Repair Item ID, e.g. "REP-1001"
  pickup_batch_id: string;
  model_name: string;
  repair_reason: string;
  status: RepairStatus;
  pickup_date: string; // "YYYY-MM-DD"
  completion_date?: string | null; // "YYYY-MM-DD"
  return_batch_id?: string | null;
  technician_id: string;
  pickup_image_url?: string;
  return_image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface RepairHistoryEntry {
  id: string;
  repair_item_id: string;
  model_name?: string;
  previous_status: string;
  new_status: string;
  event_date: string;
  performed_by: string;
  notes?: string;
}

export interface DashboardStats {
  stock: number; // Stock = Completed + Pending (all-time)
  completed: number;
  pending: number;
  today_pickup_count: number;
  today_completed_count: number;
  recent_pickup_batches: (PickupBatch & { item_count: number })[];
  recent_completed_batches: (ReturnBatch & { item_count: number })[];
}

