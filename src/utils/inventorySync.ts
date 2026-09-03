import { apiService } from '../services/apiService';
import { RetailInventoryItem } from '../types';

export interface ReceivedItemPayload {
    itemId?: string;
    itemName: string;
    quantity: number;
    unitCost?: number;
    sku?: string;
    unit?: string;
    category?: string;
    storeId?: string;
    storeName?: string;
    description?: string;
}

export interface IssuedItemPayload {
    itemId?: string;
    itemName: string;
    quantity: number;
    sku?: string;
}

/**
 * Automatically updates or creates retail_inventory_items when stock is received.
 * Also syncs local fallback storage and broadcasts the 'inventory_updated' event.
 */
export async function syncInventoryWithReceipt(
    institutionId: string,
    receivedItems: ReceivedItemPayload[]
): Promise<RetailInventoryItem[]> {
    if (!institutionId || !receivedItems || receivedItems.length === 0) {
        return [];
    }

    try {
        // Fetch current institutional inventory
        let inventory: RetailInventoryItem[] = [];
        try {
            const fetched = await apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', institutionId);
            if (fetched && Array.isArray(fetched)) {
                inventory = fetched;
            }
        } catch (fetchErr) {
            console.warn('[inventorySync] Failed to fetch remote retail inventory, using fallback:', fetchErr);
        }

        // Also merge from local storage fallback if remote returned empty
        const localItems: RetailInventoryItem[] = JSON.parse(localStorage.getItem('eduai_fallback_retail_inventory') || '[]');
        if (inventory.length === 0 && localItems.length > 0) {
            inventory = localItems.filter(i => !i.institutionId || i.institutionId === institutionId);
        }

        const nowIso = new Date().toISOString();

        for (const item of receivedItems) {
            const qty = Number(item.quantity || 0);
            if (qty <= 0) continue;

            const trimmedName = (item.itemName || '').trim().toLowerCase();
            const trimmedSku = (item.sku || '').trim().toLowerCase();

            // Find matching item in inventory
            let matched = inventory.find(i => {
                if (item.itemId && i.id === item.itemId) return true;
                if (trimmedSku && i.sku && i.sku.trim().toLowerCase() === trimmedSku) return true;
                if (trimmedName && i.name && i.name.trim().toLowerCase() === trimmedName) return true;
                return false;
            });

            if (matched) {
                const updatedQty = Number(matched.quantity || 0) + qty;
                matched.quantity = updatedQty;
                if (item.unitCost && Number(item.unitCost) > 0) {
                    matched.costPrice = Number(item.unitCost);
                }
                if (item.storeId) matched.storeId = item.storeId;
                if (item.storeName) matched.storeName = item.storeName;
                matched.lastUpdated = nowIso;

                try {
                    await apiService.saveModuleRecord('retail_inventory_items', matched);
                } catch (saveErr) {
                    console.warn(`[inventorySync] Could not save updated inventory item ${matched.id}:`, saveErr);
                }
            } else {
                // Auto-create new inventory item so received goods are immediately in stock
                const autoSku = item.sku || `SKU-${Date.now().toString().slice(-4)}`;
                const newItem: RetailInventoryItem = {
                    id: item.itemId || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    institutionId,
                    name: item.itemName || 'Received Item',
                    sku: autoSku,
                    category: item.category || 'Stationery',
                    quantity: qty,
                    unit: item.unit || 'pcs',
                    costPrice: Number(item.unitCost || 0),
                    basePrice: Number(item.unitCost || 0),
                    srpPrice: Number(item.unitCost || 0),
                    storeId: item.storeId,
                    storeName: item.storeName || 'Main School Store',
                    description: item.description || `Stock received on ${new Date().toLocaleDateString()}`,
                    reorderLevel: 5,
                    marketplaceEnabled: true,
                    bufferStock: 0,
                    viewCount: 0,
                    inquiryCount: 0,
                    createdAt: nowIso,
                    lastUpdated: nowIso
                };

                try {
                    await apiService.saveModuleRecord('retail_inventory_items', newItem);
                } catch (createErr) {
                    console.warn(`[inventorySync] Could not create new inventory item:`, createErr);
                }
                inventory.push(newItem);
            }
        }

        // Update local storage fallback
        try {
            const allLocal = JSON.parse(localStorage.getItem('eduai_fallback_retail_inventory') || '[]');
            const otherInst = allLocal.filter((i: any) => i.institutionId && i.institutionId !== institutionId);
            localStorage.setItem('eduai_fallback_retail_inventory', JSON.stringify([...otherInst, ...inventory]));
        } catch (lsErr) {
            console.warn('[inventorySync] Local storage fallback sync warning:', lsErr);
        }

        // Notify entire app that inventory has changed
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('inventory_updated', { detail: { items: inventory } }));
        }

        return inventory;
    } catch (globalErr) {
        console.error('[inventorySync] Error syncing inventory with receipt:', globalErr);
        return [];
    }
}

/**
 * Automatically deducts retail_inventory_items when stock is issued.
 */
export async function syncInventoryWithIssue(
    institutionId: string,
    issuedItems: IssuedItemPayload[]
): Promise<RetailInventoryItem[]> {
    if (!institutionId || !issuedItems || issuedItems.length === 0) {
        return [];
    }

    try {
        let inventory: RetailInventoryItem[] = [];
        try {
            const fetched = await apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', institutionId);
            if (fetched && Array.isArray(fetched)) {
                inventory = fetched;
            }
        } catch (fetchErr) {
            console.warn('[inventorySync] Failed to fetch remote retail inventory for issue:', fetchErr);
        }

        const localItems: RetailInventoryItem[] = JSON.parse(localStorage.getItem('eduai_fallback_retail_inventory') || '[]');
        if (inventory.length === 0 && localItems.length > 0) {
            inventory = localItems.filter(i => !i.institutionId || i.institutionId === institutionId);
        }

        const nowIso = new Date().toISOString();

        for (const item of issuedItems) {
            const qty = Number(item.quantity || 0);
            if (qty <= 0) continue;

            const trimmedName = (item.itemName || '').trim().toLowerCase();
            const trimmedSku = (item.sku || '').trim().toLowerCase();

            const matched = inventory.find(i => {
                if (item.itemId && i.id === item.itemId) return true;
                if (trimmedSku && i.sku && i.sku.trim().toLowerCase() === trimmedSku) return true;
                if (trimmedName && i.name && i.name.trim().toLowerCase() === trimmedName) return true;
                return false;
            });

            if (matched) {
                const currentQty = Number(matched.quantity || 0);
                matched.quantity = Math.max(0, currentQty - qty);
                matched.lastUpdated = nowIso;

                try {
                    await apiService.saveModuleRecord('retail_inventory_items', matched);
                } catch (saveErr) {
                    console.warn(`[inventorySync] Could not deduct inventory item ${matched.id}:`, saveErr);
                }
            }
        }

        // Update local storage fallback
        try {
            const allLocal = JSON.parse(localStorage.getItem('eduai_fallback_retail_inventory') || '[]');
            const otherInst = allLocal.filter((i: any) => i.institutionId && i.institutionId !== institutionId);
            localStorage.setItem('eduai_fallback_retail_inventory', JSON.stringify([...otherInst, ...inventory]));
        } catch (lsErr) {
            console.warn('[inventorySync] Local storage fallback sync warning:', lsErr);
        }

        // Notify entire app
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('inventory_updated', { detail: { items: inventory } }));
        }

        return inventory;
    } catch (globalErr) {
        console.error('[inventorySync] Error syncing inventory with issue:', globalErr);
        return [];
    }
}
