import type { ExpiryType, StorageType, Unit } from "@stockpot/shared";

/** 在庫アイテムのドメインエンティティ（Prisma の生成型を漏らさない）。 */
export interface InventoryItem {
  id: string;
  userId: string;
  name: string;
  storageType: StorageType;
  quantity: number;
  unit: Unit;
  expiryDate: Date | null;
  expiryType: ExpiryType | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewInventoryItem {
  name: string;
  storageType: StorageType;
  quantity: number;
  unit: Unit;
  expiryDate?: Date | null;
  expiryType?: ExpiryType | null;
  note?: string | null;
}

export type UpdateInventoryFields = Partial<NewInventoryItem>;
