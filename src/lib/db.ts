import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  UserProfile,
  PickupBatch,
  ReturnBatch,
  RepairItem,
  RepairHistoryEntry,
  DashboardStats,
} from './types';
import { getKolkataDateString, getKolkataTimeString } from './timezone';

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

// Interface for local JSON database structure
interface LocalDatabase {
  profiles: UserProfile[];
  pickup_batches: PickupBatch[];
  return_batches: ReturnBatch[];
  repair_items: RepairItem[];
  repair_history: RepairHistoryEntry[];
}

// 4 Authorized System Accounts
const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: 'f2ccc007-2a4b-47f0-a540-ae3a4201b832',
    email: 'admin1@repairtrack.com',
    full_name: 'Admin Ravi Sharma',
    role: 'admin',
    created_at: '2026-10-01T00:00:00+05:30',
  },
  {
    id: 'ebbb9cc0-ed0f-4717-bda2-756a9d7d4558',
    email: 'admin2@repairtrack.com',
    full_name: 'Admin Priya Verma',
    role: 'admin',
    created_at: '2026-10-01T00:00:00+05:30',
  },
  {
    id: 'b9f09921-454b-4706-8c04-e9d0b50379c8',
    email: 'admin3@repairtrack.com',
    full_name: 'Admin Vikram Mehta',
    role: 'admin',
    created_at: '2026-10-01T00:00:00+05:30',
  },
  {
    id: '562b298c-7f9f-42bc-bda8-91177bdce61d',
    email: 'technician@repairtrack.com',
    full_name: 'Ramesh Patel (Technician)',
    role: 'technician',
    created_at: '2026-10-01T00:00:00+05:30',
  },
];

const INITIAL_PICKUP_BATCHES: PickupBatch[] = [
  {
    id: 'PB-20261030-01',
    pickup_date: '2026-10-30',
    pickup_time: '11:15',
    pickup_image_url: '/uploads/sample-pickup-batch1.svg',
    technician_id: '562b298c-7f9f-42bc-bda8-91177bdce61d',
    technician_name: 'Ramesh Patel',
    created_at: '2026-10-30T11:15:00+05:30',
  },
  {
    id: 'PB-20261102-01',
    pickup_date: '2026-11-02',
    pickup_time: '14:30',
    pickup_image_url: '/uploads/sample-pickup-batch2.svg',
    technician_id: '562b298c-7f9f-42bc-bda8-91177bdce61d',
    technician_name: 'Ramesh Patel',
    created_at: '2026-11-02T14:30:00+05:30',
  },
];

const INITIAL_RETURN_BATCHES: ReturnBatch[] = [
  {
    id: 'RB-20261105-01',
    return_date: '2026-11-05',
    return_time: '17:00',
    return_image_url: '/uploads/sample-return-batch1.svg',
    technician_id: '562b298c-7f9f-42bc-bda8-91177bdce61d',
    technician_name: 'Ramesh Patel',
    created_at: '2026-11-05T17:00:00+05:30',
  },
];

const INITIAL_REPAIR_ITEMS: RepairItem[] = [
  {
    id: 'REP-1001',
    pickup_batch_id: 'PB-20261030-01',
    model_name: 'iPhone 13 Pro',
    repair_reason: 'OLED Display Broken & Touch Glitch',
    status: 'completed',
    pickup_date: '2026-10-30',
    completion_date: '2026-11-05',
    return_batch_id: 'RB-20261105-01',
    technician_id: '562b298c-7f9f-42bc-bda8-91177bdce61d',
    pickup_image_url: '/uploads/sample-pickup-batch1.svg',
    return_image_url: '/uploads/sample-return-batch1.svg',
    created_at: '2026-10-30T11:15:00+05:30',
    updated_at: '2026-11-05T17:00:00+05:30',
  },
  {
    id: 'REP-1002',
    pickup_batch_id: 'PB-20261030-01',
    model_name: 'Samsung Galaxy S22 Ultra',
    repair_reason: 'Battery Replacement & Rear Glass',
    status: 'completed',
    pickup_date: '2026-10-30',
    completion_date: '2026-11-05',
    return_batch_id: 'RB-20261105-01',
    technician_id: '562b298c-7f9f-42bc-bda8-91177bdce61d',
    pickup_image_url: '/uploads/sample-pickup-batch1.svg',
    return_image_url: '/uploads/sample-return-batch1.svg',
    created_at: '2026-10-30T11:15:00+05:30',
    updated_at: '2026-11-05T17:00:00+05:30',
  },
  {
    id: 'REP-1003',
    pickup_batch_id: 'PB-20261030-01',
    model_name: 'OnePlus 11 5G',
    repair_reason: 'Charging Port IC Short Circuit',
    status: 'pending',
    pickup_date: '2026-10-30',
    completion_date: null,
    return_batch_id: null,
    technician_id: '562b298c-7f9f-42bc-bda8-91177bdce61d',
    pickup_image_url: '/uploads/sample-pickup-batch1.svg',
    created_at: '2026-10-30T11:15:00+05:30',
    updated_at: '2026-10-30T11:15:00+05:30',
  },
  {
    id: 'REP-1004',
    pickup_batch_id: 'PB-20261102-01',
    model_name: 'iPhone 14',
    repair_reason: 'FaceID flex cable damaged',
    status: 'pending',
    pickup_date: '2026-11-02',
    completion_date: null,
    return_batch_id: null,
    technician_id: '562b298c-7f9f-42bc-bda8-91177bdce61d',
    pickup_image_url: '/uploads/sample-pickup-batch2.svg',
    created_at: '2026-11-02T14:30:00+05:30',
    updated_at: '2026-11-02T14:30:00+05:30',
  },
  {
    id: 'REP-1005',
    pickup_batch_id: 'PB-20261102-01',
    model_name: 'Vivo X90 Pro',
    repair_reason: 'Camera Lens Glass Shattered',
    status: 'pending',
    pickup_date: '2026-11-02',
    completion_date: null,
    return_batch_id: null,
    technician_id: '562b298c-7f9f-42bc-bda8-91177bdce61d',
    pickup_image_url: '/uploads/sample-pickup-batch2.svg',
    created_at: '2026-11-02T14:30:00+05:30',
    updated_at: '2026-11-02T14:30:00+05:30',
  },
];

const INITIAL_REPAIR_HISTORY: RepairHistoryEntry[] = [
  {
    id: 'hist-1',
    repair_item_id: 'REP-1001',
    model_name: 'iPhone 13 Pro',
    previous_status: 'none',
    new_status: 'pending',
    event_date: '2026-10-30T11:15:00+05:30',
    performed_by: 'Ramesh Patel',
    notes: 'Initial pickup batch PB-20261030-01',
  },
  {
    id: 'hist-2',
    repair_item_id: 'REP-1001',
    model_name: 'iPhone 13 Pro',
    previous_status: 'pending',
    new_status: 'completed',
    event_date: '2026-11-05T17:00:00+05:30',
    performed_by: 'Ramesh Patel',
    notes: 'Repaired and returned in batch RB-20261105-01',
  },
];

// Determine if live Supabase is configured
const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase')
);

let supabaseClient: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}

// ---------------- LOCAL FILE-BASED PERSISTENCE ---------------- //

function readLocalDatabase(): LocalDatabase {
  if (!fs.existsSync(DB_FILE)) {
    const initialDb: LocalDatabase = {
      profiles: DEFAULT_PROFILES,
      pickup_batches: INITIAL_PICKUP_BATCHES,
      return_batches: INITIAL_RETURN_BATCHES,
      repair_items: INITIAL_REPAIR_ITEMS,
      repair_history: INITIAL_REPAIR_HISTORY,
    };
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf8');
    return initialDb;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database file, reinitializing:', err);
    const initialDb: LocalDatabase = {
      profiles: DEFAULT_PROFILES,
      pickup_batches: INITIAL_PICKUP_BATCHES,
      return_batches: INITIAL_RETURN_BATCHES,
      repair_items: INITIAL_REPAIR_ITEMS,
      repair_history: INITIAL_REPAIR_HISTORY,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf8');
    return initialDb;
  }
}

function writeLocalDatabase(data: LocalDatabase): void {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Generate unique IDs
function generateBatchId(prefix: 'PB' | 'RB'): string {
  const dateStr = getKolkataDateString().replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${rand}`;
}

function generateRepairItemId(existingItems: { id: string }[]): string {
  let maxNum = 1000;
  for (const item of existingItems) {
    const match = item.id.match(/^REP-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `REP-${maxNum + 1}`;
}

// ---------------- UNIFIED DATABASE OPERATIONS ---------------- //

export class DatabaseService {
  // Get all user profiles
  static async getProfiles(): Promise<UserProfile[]> {
    if (isSupabaseConfigured && supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('profiles').select('*');
        if (!error && data && data.length > 0) return data as UserProfile[];
      } catch (err) {
        console.warn('Error reading profiles from Supabase, using fallback:', err);
      }
    }
    const db = readLocalDatabase();
    return db.profiles;
  }

  // Get user profile by email
  static async getProfileByEmail(email: string): Promise<UserProfile | null> {
    const profiles = await this.getProfiles();
    return profiles.find((p) => p.email.toLowerCase() === email.toLowerCase()) || null;
  }

  // Get user profile by ID
  static async getProfileById(id: string): Promise<UserProfile | null> {
    const profiles = await this.getProfiles();
    return profiles.find((p) => p.id === id) || null;
  }

  // Calculate Dashboard Stats: Stock = Completed + Pending (all-time figure)
  static async getDashboardStats(): Promise<DashboardStats> {
    const today = getKolkataDateString();

    if (isSupabaseConfigured && supabaseClient) {
      try {
        const { data: allItems } = await supabaseClient.from('repair_items').select('*');
        const { data: pickupBatches } = await supabaseClient
          .from('pickup_batches')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        const { data: returnBatches } = await supabaseClient
          .from('return_batches')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (allItems) {
          let completed = 0;
          let pending = 0;
          let today_pickup_count = 0;
          let today_completed_count = 0;

          for (const item of allItems) {
            if (item.status === 'completed') {
              completed++;
              if (item.completion_date === today) today_completed_count++;
            } else {
              pending++;
            }
            if (item.pickup_date === today) today_pickup_count++;
          }

          const stock = completed + pending;

          const recent_pickup_batches = (pickupBatches || []).map((batch) => ({
            ...batch,
            item_count: allItems.filter((i) => i.pickup_batch_id === batch.id).length,
          }));

          const recent_completed_batches = (returnBatches || []).map((batch) => ({
            ...batch,
            item_count: allItems.filter((i) => i.return_batch_id === batch.id).length,
          }));

          return {
            stock,
            completed,
            pending,
            today_pickup_count,
            today_completed_count,
            recent_pickup_batches,
            recent_completed_batches,
          };
        }
      } catch (err) {
        console.warn('Supabase dashboard stats failed, using fallback:', err);
      }
    }

    const db = readLocalDatabase();
    const items = db.repair_items;

    let completed = 0;
    let pending = 0;
    let today_pickup_count = 0;
    let today_completed_count = 0;

    for (const item of items) {
      if (item.status === 'completed') {
        completed++;
        if (item.completion_date === today) today_completed_count++;
      } else {
        pending++;
      }
      if (item.pickup_date === today) today_pickup_count++;
    }

    const stock = completed + pending;

    const recent_pickup_batches = [...db.pickup_batches]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((batch) => ({
        ...batch,
        item_count: items.filter((i) => i.pickup_batch_id === batch.id).length,
      }));

    const recent_completed_batches = [...db.return_batches]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((batch) => ({
        ...batch,
        item_count: items.filter((i) => i.return_batch_id === batch.id).length,
      }));

    return {
      stock,
      completed,
      pending,
      today_pickup_count,
      today_completed_count,
      recent_pickup_batches,
      recent_completed_batches,
    };
  }

  // PICKUP WORKFLOW: Save a new pickup batch with multiple phone items
  static async createPickupBatch(params: {
    pickup_image_url: string;
    technician_id: string;
    items: { model_name: string; repair_reason: string }[];
  }): Promise<{ batch: PickupBatch; items: RepairItem[] }> {
    const todayDate = getKolkataDateString();
    const currentTime = getKolkataTimeString();
    const timestamp = new Date().toISOString();
    const batchId = generateBatchId('PB');

    if (isSupabaseConfigured && supabaseClient) {
      try {
        const { data: techProfile } = await supabaseClient
          .from('profiles')
          .select('full_name')
          .eq('id', params.technician_id)
          .single();

        const techName = techProfile ? techProfile.full_name : 'Technician';

        // 1. Insert pickup batch
        const newBatch: PickupBatch = {
          id: batchId,
          pickup_date: todayDate,
          pickup_time: currentTime,
          pickup_image_url: params.pickup_image_url,
          technician_id: params.technician_id,
          technician_name: techName,
          created_at: timestamp,
        };

        await supabaseClient.from('pickup_batches').insert([newBatch]);

        // 2. Fetch existing items for max REP id
        const { data: existingItems } = await supabaseClient
          .from('repair_items')
          .select('id');

        const newRepairItems: RepairItem[] = [];
        const allItemsList = existingItems || [];

        for (const itemInput of params.items) {
          const itemId = generateRepairItemId(allItemsList);
          const newRepairItem: RepairItem = {
            id: itemId,
            pickup_batch_id: batchId,
            model_name: itemInput.model_name.trim(),
            repair_reason: itemInput.repair_reason.trim(),
            status: 'pending',
            pickup_date: todayDate,
            completion_date: null,
            return_batch_id: null,
            technician_id: params.technician_id,
            pickup_image_url: params.pickup_image_url,
            created_at: timestamp,
            updated_at: timestamp,
          };
          newRepairItems.push(newRepairItem);
          allItemsList.push({ id: itemId });

          // History entry
          await supabaseClient.from('repair_history').insert([
            {
              repair_item_id: itemId,
              previous_status: 'none',
              new_status: 'pending',
              event_date: timestamp,
              performed_by: params.technician_id,
              notes: `Pickup intake registered under batch ${batchId}`,
            },
          ]);
        }

        await supabaseClient.from('repair_items').insert(newRepairItems);
        return { batch: newBatch, items: newRepairItems };
      } catch (err) {
        console.warn('Supabase createPickupBatch failed, falling back to local DB:', err);
      }
    }

    // Local DB fallback
    const db = readLocalDatabase();
    const techProfile = db.profiles.find((p) => p.id === params.technician_id);
    const techName = techProfile ? techProfile.full_name : 'Technician';

    const newBatch: PickupBatch = {
      id: batchId,
      pickup_date: todayDate,
      pickup_time: currentTime,
      pickup_image_url: params.pickup_image_url,
      technician_id: params.technician_id,
      technician_name: techName,
      created_at: timestamp,
    };

    const newRepairItems: RepairItem[] = [];
    let currentDbItems = [...db.repair_items];

    for (const itemInput of params.items) {
      const itemId = generateRepairItemId(currentDbItems);
      const newRepairItem: RepairItem = {
        id: itemId,
        pickup_batch_id: batchId,
        model_name: itemInput.model_name.trim(),
        repair_reason: itemInput.repair_reason.trim(),
        status: 'pending',
        pickup_date: todayDate,
        completion_date: null,
        return_batch_id: null,
        technician_id: params.technician_id,
        pickup_image_url: params.pickup_image_url,
        created_at: timestamp,
        updated_at: timestamp,
      };
      newRepairItems.push(newRepairItem);
      currentDbItems.push(newRepairItem);

      db.repair_history.push({
        id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        repair_item_id: itemId,
        model_name: newRepairItem.model_name,
        previous_status: 'none',
        new_status: 'pending',
        event_date: timestamp,
        performed_by: techName,
        notes: `Pickup intake registered under batch ${batchId}`,
      });
    }

    db.pickup_batches.unshift(newBatch);
    db.repair_items.push(...newRepairItems);
    writeLocalDatabase(db);

    return { batch: newBatch, items: newRepairItems };
  }

  // RETURN WORKFLOW: Return multiple phones in one batch (supports Model + Date or IDs)
  static async createReturnBatch(params: {
    return_image_url: string;
    technician_id: string;
    repair_item_ids?: string[];
    items?: { model_name: string; pickup_date: string; item_id?: string }[];
  }): Promise<{ batch: ReturnBatch; completed_items: RepairItem[] }> {
    const todayDate = getKolkataDateString();
    const currentTime = getKolkataTimeString();
    const timestamp = new Date().toISOString();
    const batchId = generateBatchId('RB');

    if (isSupabaseConfigured && supabaseClient) {
      try {
        const { data: techProfile } = await supabaseClient
          .from('profiles')
          .select('full_name')
          .eq('id', params.technician_id)
          .single();

        const techName = techProfile ? techProfile.full_name : 'Technician';

        // Resolve IDs
        const targetItemIds: string[] = [];
        if (params.repair_item_ids && params.repair_item_ids.length > 0) {
          targetItemIds.push(...params.repair_item_ids);
        }

        if (params.items && params.items.length > 0) {
          for (const entry of params.items) {
            if (entry.item_id) {
              targetItemIds.push(entry.item_id);
            } else {
              const { data: matched } = await supabaseClient
                .from('repair_items')
                .select('*')
                .eq('status', 'pending')
                .eq('pickup_date', entry.pickup_date)
                .ilike('model_name', entry.model_name.trim())
                .limit(1);

              if (!matched || matched.length === 0) {
                throw new Error(
                  `No pending phone found for "${entry.model_name}" picked up on ${entry.pickup_date}`
                );
              }
              targetItemIds.push(matched[0].id);
            }
          }
        }

        const uniqueIds = Array.from(new Set(targetItemIds));
        if (uniqueIds.length === 0) {
          throw new Error('At least one phone must be selected for return');
        }

        // Verify all are pending
        const { data: existingItems } = await supabaseClient
          .from('repair_items')
          .select('*')
          .in('id', uniqueIds);

        for (const it of existingItems || []) {
          if (it.status === 'completed') {
            throw new Error(
              `Repair item ${it.id} (${it.model_name}) is already completed and cannot be completed again`
            );
          }
        }

        // Insert return batch
        const newBatch: ReturnBatch = {
          id: batchId,
          return_date: todayDate,
          return_time: currentTime,
          return_image_url: params.return_image_url,
          technician_id: params.technician_id,
          technician_name: techName,
          created_at: timestamp,
        };

        await supabaseClient.from('return_batches').insert([newBatch]);

        // Update items to completed
        const updatedItems: RepairItem[] = [];
        for (const it of existingItems || []) {
          const { data: updated } = await supabaseClient
            .from('repair_items')
            .update({
              status: 'completed',
              completion_date: todayDate,
              return_batch_id: batchId,
              updated_at: timestamp,
            })
            .eq('id', it.id)
            .select('*')
            .single();

          if (updated) {
            updatedItems.push({
              ...updated,
              return_image_url: params.return_image_url,
            });

            await supabaseClient.from('repair_history').insert([
              {
                repair_item_id: it.id,
                previous_status: 'pending',
                new_status: 'completed',
                event_date: timestamp,
                performed_by: params.technician_id,
                notes: `Repaired and returned in batch ${batchId}`,
              },
            ]);
          }
        }

        return { batch: newBatch, completed_items: updatedItems };
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('already completed')) {
          throw err;
        }
        console.warn('Supabase createReturnBatch failed, falling back to local DB:', err);
      }
    }

    // Local DB fallback
    const db = readLocalDatabase();
    const techProfile = db.profiles.find((p) => p.id === params.technician_id);
    const techName = techProfile ? techProfile.full_name : 'Technician';

    const targetItemIds: string[] = [];
    if (params.repair_item_ids && params.repair_item_ids.length > 0) {
      targetItemIds.push(...params.repair_item_ids);
    }

    if (params.items && params.items.length > 0) {
      for (const entry of params.items) {
        if (entry.item_id) {
          targetItemIds.push(entry.item_id);
        } else {
          const matched = db.repair_items.find(
            (i) =>
              i.status === 'pending' &&
              i.pickup_date === entry.pickup_date &&
              i.model_name.toLowerCase().trim() === entry.model_name.toLowerCase().trim()
          );
          if (!matched) {
            throw new Error(
              `No pending phone found for "${entry.model_name}" picked up on ${entry.pickup_date}`
            );
          }
          targetItemIds.push(matched.id);
        }
      }
    }

    const uniqueIds = Array.from(new Set(targetItemIds));
    if (uniqueIds.length === 0) {
      throw new Error('At least one phone must be selected for return');
    }

    const itemsToComplete: RepairItem[] = [];
    for (const id of uniqueIds) {
      const item = db.repair_items.find((i) => i.id === id);
      if (!item) throw new Error(`Repair item ${id} not found`);
      if (item.status === 'completed') {
        throw new Error(
          `Repair item ${id} (${item.model_name}) is already completed and cannot be completed again`
        );
      }
      itemsToComplete.push(item);
    }

    const newBatch: ReturnBatch = {
      id: batchId,
      return_date: todayDate,
      return_time: currentTime,
      return_image_url: params.return_image_url,
      technician_id: params.technician_id,
      technician_name: techName,
      created_at: timestamp,
    };

    const updatedItems: RepairItem[] = [];
    for (const item of itemsToComplete) {
      item.status = 'completed';
      item.completion_date = todayDate;
      item.return_batch_id = batchId;
      item.return_image_url = params.return_image_url;
      item.updated_at = timestamp;
      updatedItems.push(item);

      db.repair_history.push({
        id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        repair_item_id: item.id,
        model_name: item.model_name,
        previous_status: 'pending',
        new_status: 'completed',
        event_date: timestamp,
        performed_by: techName,
        notes: `Repaired and returned in batch ${batchId}`,
      });
    }

    db.return_batches.unshift(newBatch);
    writeLocalDatabase(db);

    return { batch: newBatch, completed_items: updatedItems };
  }

  // Get Pending to Repair items
  static async getPendingItems(filter?: {
    search?: string;
    pickup_date?: string;
  }): Promise<RepairItem[]> {
    if (isSupabaseConfigured && supabaseClient) {
      try {
        let query = supabaseClient.from('repair_items').select('*').eq('status', 'pending');
        if (filter?.pickup_date) query = query.eq('pickup_date', filter.pickup_date);
        const { data: items } = await query;
        const { data: batches } = await supabaseClient.from('pickup_batches').select('*');

        const batchMap = new Map((batches || []).map((b) => [b.id, b.pickup_image_url]));

        let result = (items || []).map((i) => ({
          ...i,
          pickup_image_url: i.pickup_image_url || batchMap.get(i.pickup_batch_id) || '',
        }));

        if (filter?.search) {
          const q = filter.search.toLowerCase().trim();
          result = result.filter(
            (i) =>
              i.model_name.toLowerCase().includes(q) ||
              i.id.toLowerCase().includes(q) ||
              i.repair_reason.toLowerCase().includes(q)
          );
        }

        result.sort((a, b) => b.pickup_date.localeCompare(a.pickup_date) || b.id.localeCompare(a.id));
        return result;
      } catch (err) {
        console.warn('Supabase getPendingItems failed, falling back:', err);
      }
    }

    const db = readLocalDatabase();
    const pickupBatchMap = new Map(db.pickup_batches.map((b) => [b.id, b.pickup_image_url]));

    let items = db.repair_items
      .filter((i) => i.status === 'pending')
      .map((i) => ({
        ...i,
        pickup_image_url: i.pickup_image_url || pickupBatchMap.get(i.pickup_batch_id) || '',
      }));

    if (filter?.pickup_date) items = items.filter((i) => i.pickup_date === filter.pickup_date);
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.model_name.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          i.repair_reason.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => b.pickup_date.localeCompare(a.pickup_date) || b.id.localeCompare(a.id));
    return items;
  }

  // Get Completed Repair items
  static async getCompletedItems(filter?: {
    search?: string;
    completion_date?: string;
  }): Promise<RepairItem[]> {
    if (isSupabaseConfigured && supabaseClient) {
      try {
        let query = supabaseClient.from('repair_items').select('*').eq('status', 'completed');
        if (filter?.completion_date) query = query.eq('completion_date', filter.completion_date);
        const { data: items } = await query;
        const { data: returnBatches } = await supabaseClient.from('return_batches').select('*');
        const { data: pickupBatches } = await supabaseClient.from('pickup_batches').select('*');

        const returnMap = new Map((returnBatches || []).map((b) => [b.id, b.return_image_url]));
        const pickupMap = new Map((pickupBatches || []).map((b) => [b.id, b.pickup_image_url]));

        let result = (items || []).map((i) => ({
          ...i,
          pickup_image_url: i.pickup_image_url || pickupMap.get(i.pickup_batch_id) || '',
          return_image_url:
            i.return_image_url || (i.return_batch_id ? returnMap.get(i.return_batch_id) : '') || '',
        }));

        if (filter?.search) {
          const q = filter.search.toLowerCase().trim();
          result = result.filter(
            (i) =>
              i.model_name.toLowerCase().includes(q) ||
              i.id.toLowerCase().includes(q) ||
              i.repair_reason.toLowerCase().includes(q)
          );
        }

        result.sort(
          (a, b) =>
            (b.completion_date || '').localeCompare(a.completion_date || '') ||
            b.id.localeCompare(a.id)
        );
        return result;
      } catch (err) {
        console.warn('Supabase getCompletedItems failed, falling back:', err);
      }
    }

    const db = readLocalDatabase();
    const returnBatchMap = new Map(db.return_batches.map((b) => [b.id, b.return_image_url]));
    const pickupBatchMap = new Map(db.pickup_batches.map((b) => [b.id, b.pickup_image_url]));

    let items = db.repair_items
      .filter((i) => i.status === 'completed')
      .map((i) => ({
        ...i,
        pickup_image_url: i.pickup_image_url || pickupBatchMap.get(i.pickup_batch_id) || '',
        return_image_url:
          i.return_image_url || (i.return_batch_id ? returnBatchMap.get(i.return_batch_id) : '') || '',
      }));

    if (filter?.completion_date) items = items.filter((i) => i.completion_date === filter.completion_date);
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.model_name.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          i.repair_reason.toLowerCase().includes(q)
      );
    }

    items.sort(
      (a, b) =>
        (b.completion_date || '').localeCompare(a.completion_date || '') ||
        b.id.localeCompare(a.id)
    );
    return items;
  }

  // Lookup pending items for return form: by model name and/or pickup date
  static async searchPendingForReturn(params: {
    model_name?: string;
    pickup_date?: string;
  }): Promise<RepairItem[]> {
    if (isSupabaseConfigured && supabaseClient) {
      try {
        let query = supabaseClient.from('repair_items').select('*').eq('status', 'pending');
        if (params.pickup_date) query = query.eq('pickup_date', params.pickup_date);
        if (params.model_name && params.model_name.trim()) {
          query = query.ilike('model_name', `%${params.model_name.trim()}%`);
        }
        const { data } = await query;
        if (data) return data as RepairItem[];
      } catch (err) {
        console.warn('Supabase searchPendingForReturn failed, falling back:', err);
      }
    }

    const db = readLocalDatabase();
    let pending = db.repair_items.filter((i) => i.status === 'pending');

    if (params.pickup_date) {
      pending = pending.filter((i) => i.pickup_date === params.pickup_date);
    }

    if (params.model_name && params.model_name.trim()) {
      const q = params.model_name.toLowerCase().trim();
      pending = pending.filter((i) => i.model_name.toLowerCase().includes(q));
    }

    return pending;
  }

  // Get distinct pending model names and pickup dates for zero-hassle auto-completion
  static async getPendingModelsSummary(): Promise<{
    models: string[];
    dates: string[];
  }> {
    if (isSupabaseConfigured && supabaseClient) {
      try {
        const { data: pending } = await supabaseClient
          .from('repair_items')
          .select('model_name, pickup_date')
          .eq('status', 'pending');

        if (pending && pending.length > 0) {
          const models = Array.from(new Set(pending.map((i) => i.model_name))).sort();
          const dates = Array.from(new Set(pending.map((i) => i.pickup_date))).sort().reverse();
          return { models, dates };
        }
      } catch (err) {
        console.warn('Supabase getPendingModelsSummary failed, falling back:', err);
      }
    }

    const db = readLocalDatabase();
    const pending = db.repair_items.filter((i) => i.status === 'pending');
    const models = Array.from(new Set(pending.map((i) => i.model_name))).sort();
    const dates = Array.from(new Set(pending.map((i) => i.pickup_date))).sort().reverse();
    return { models, dates };
  }

  // Get distinct pickup dates
  static async getDistinctPickupDates(): Promise<string[]> {
    const items = await this.getPendingItems();
    return Array.from(new Set(items.map((i) => i.pickup_date))).sort().reverse();
  }

  // Get distinct completion dates
  static async getDistinctCompletionDates(): Promise<string[]> {
    const items = await this.getCompletedItems();
    return Array.from(new Set(items.map((i) => i.completion_date || ''))).filter(Boolean).sort().reverse();
  }

  // Get reports for download with date range
  static async getReportItems(params: {
    type: 'pending' | 'completed';
    startDate?: string;
    endDate?: string;
  }): Promise<RepairItem[]> {
    const { type, startDate, endDate } = params;
    let items = type === 'pending' ? await this.getPendingItems() : await this.getCompletedItems();

    if (type === 'pending') {
      if (startDate) items = items.filter((i) => i.pickup_date >= startDate);
      if (endDate) items = items.filter((i) => i.pickup_date <= endDate);
    } else {
      if (startDate) items = items.filter((i) => (i.completion_date || '') >= startDate);
      if (endDate) items = items.filter((i) => (i.completion_date || '') <= endDate);
    }
    return items;
  }

  // Get full repair history audit log
  static async getRepairHistory(): Promise<RepairHistoryEntry[]> {
    if (isSupabaseConfigured && supabaseClient) {
      try {
        const { data } = await supabaseClient
          .from('repair_history')
          .select('*')
          .order('event_date', { ascending: false });
        if (data && data.length > 0) return data as RepairHistoryEntry[];
      } catch (err) {
        console.warn('Supabase getRepairHistory failed, falling back:', err);
      }
    }

    const db = readLocalDatabase();
    return [...db.repair_history].reverse();
  }
}
