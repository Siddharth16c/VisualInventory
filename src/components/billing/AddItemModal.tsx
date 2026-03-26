/**
 * AddItemModal - Quick add item from Billing UI
 * Collects all required fields for item creation
 */

import { useState, useEffect } from 'react';
import { X, Plus, Loader2, Image as ImageIcon } from 'lucide-react';
import { DAL } from '@/db/dal';
import { useAppStore } from '@/store/store';
import { generateThumbnailBase64, THUMBNAIL_PRESETS } from '@/lib/imageUpload';
import type { Vertical, Brand, PackingUnit, Subcategory } from '@/db/types';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (item: any) => void;
  preselectedVerticalId?: number;
}

export default function AddItemModal({ isOpen, onClose, onCreated, preselectedVerticalId }: AddItemModalProps) {
  const addToast = useAppStore((s) => s.addToast);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  
  // Reference data
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [packingUnits, setPackingUnits] = useState<PackingUnit[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    item_name: '',
    keyword_id: '',
    vertical_id: preselectedVerticalId || null as number | null,
    brand_id: null as number | null,
    packing_unit_id: null as number | null,
    subcategory_id: null as number | null,
    p_unit: 1,
    p_unit_per_parcel: 1,
    retail_price_unit: 0,
    wholesale_price_unit: 0,
    purchase_price_unit: 0,
    reorder_threshold: 0,
    stock_parcels: 0,
    thumbnail_base64: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadReferenceData();
      if (preselectedVerticalId) {
        setFormData(prev => ({ ...prev, vertical_id: preselectedVerticalId }));
      }
    }
  }, [isOpen, preselectedVerticalId]);

  const loadReferenceData = async () => {
    try {
      const [v, b, pu, sc] = await Promise.all([
        DAL.verticals.getAll(),
        DAL.brands.getAll(),
        DAL.packing_units.getAll(),
        DAL.subcategories.getAll(),
      ]);
      setVerticals(v);
      setBrands(b);
      setPackingUnits(pu);
      setSubcategories(sc as Subcategory[]);
    } catch (err) {
      console.error('Failed to load reference data:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('_id') ? (value ? Number(value) : null) : 
              name.includes('price') || name.includes('stock') || name.includes('unit') || name.includes('threshold') ? Number(value) : value,
    }));
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    try {
      const base64 = await generateThumbnailBase64(file, THUMBNAIL_PRESETS.item);
      setThumbnailPreview(base64);
      setFormData(prev => ({ ...prev, thumbnail_base64: base64 }));
    } catch (err: any) {
      addToast('Failed to process image', 'error');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleRemoveThumbnail = () => {
    setThumbnailPreview(null);
    setFormData(prev => ({ ...prev, thumbnail_base64: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.item_name.trim()) {
      addToast('Item name is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const firmId = useAppStore.getState().firmId;
      if (!firmId) {
        addToast('No firm selected', 'error');
        return;
      }

      const stockUnits = formData.p_unit * formData.p_unit_per_parcel * formData.stock_parcels;
      
      const newItem: any = {
        firm_id: firmId,
        item_name: formData.item_name,
        keyword_id: formData.keyword_id || null,
        vertical_id: formData.vertical_id,
        brand_id: formData.brand_id,
        packing_unit_id: formData.packing_unit_id,
        subcategory_id: formData.subcategory_id,
        p_unit: formData.p_unit,
        p_unit_per_parcel: formData.p_unit_per_parcel,
        stock_parcels: formData.stock_parcels,
        stock_units: stockUnits,
        retail_price_unit: formData.retail_price_unit,
        wholesale_price_unit: formData.wholesale_price_unit,
        purchase_price_unit: formData.purchase_price_unit,
        reorder_threshold: formData.reorder_threshold,
        thumbnail_base64: formData.thumbnail_base64 || null,
        category: '',
        created_at: new Date().toISOString(),
      };

      const created = await DAL.items.add(newItem);
      addToast(`Item "${formData.item_name}" created`, 'success');
      
      if (onCreated) {
        onCreated(created);
      }
      
      // Reset form
      setFormData({
        item_name: '',
        keyword_id: '',
        vertical_id: preselectedVerticalId || null,
        brand_id: null,
        packing_unit_id: null,
        subcategory_id: null,
        p_unit: 1,
        p_unit_per_parcel: 1,
        retail_price_unit: 0,
        wholesale_price_unit: 0,
        purchase_price_unit: 0,
        reorder_threshold: 0,
        stock_parcels: 0,
        thumbnail_base64: '',
      });
      setThumbnailPreview(null);
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Failed to create item', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Add New Item</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Thumbnail */}
          <div className="flex gap-4">
            <div className="w-20 h-20 flex-shrink-0">
              {thumbnailPreview ? (
                <div className="relative w-full h-full">
                  <img src={thumbnailPreview} className="w-full h-full object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={handleRemoveThumbnail}
                    className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
                  {isProcessingImage ? (
                    <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-slate-400" />
                  )}
                  <span className="text-[9px] text-slate-400 mt-0.5">Icon</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleThumbnailChange}
                    disabled={isProcessingImage}
                  />
                </label>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">Item Name *</label>
                <input
                  type="text"
                  name="item_name"
                  value={formData.item_name}
                  onChange={handleInputChange}
                  className="w-full input-field text-sm"
                  placeholder="Product name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-0.5">SKU / Keyword ID</label>
                <input
                  type="text"
                  name="keyword_id"
                  value={formData.keyword_id}
                  onChange={handleInputChange}
                  className="w-full input-field text-sm"
                  placeholder="Unique identifier (optional)"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-0.5">Vertical</label>
              <select
                name="vertical_id"
                value={formData.vertical_id || ''}
                onChange={handleInputChange}
                className="w-full input-field text-sm"
              >
                <option value="">Select...</option>
                {verticals.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-0.5">Brand</label>
              <select
                name="brand_id"
                value={formData.brand_id || ''}
                onChange={handleInputChange}
                className="w-full input-field text-sm"
              >
                <option value="">Select...</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-0.5">Packing Unit</label>
              <select
                name="packing_unit_id"
                value={formData.packing_unit_id || ''}
                onChange={handleInputChange}
                className="w-full input-field text-sm"
              >
                <option value="">Select...</option>
                {packingUnits.map(pu => (
                  <option key={pu.id} value={pu.id}>{pu.unit_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-0.5">Subcategory</label>
              <select
                name="subcategory_id"
                value={formData.subcategory_id || ''}
                onChange={handleInputChange}
                className="w-full input-field text-sm"
              >
                <option value="">Select...</option>
                {subcategories.map(sc => (
                  <option key={sc.id} value={sc.id}>{sc.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-0.5">Units/Pack</label>
              <input
                type="number"
                name="p_unit"
                value={formData.p_unit}
                onChange={handleInputChange}
                min={1}
                className="w-full input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-0.5">Packs/Parcel</label>
              <input
                type="number"
                name="p_unit_per_parcel"
                value={formData.p_unit_per_parcel}
                onChange={handleInputChange}
                min={1}
                className="w-full input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-0.5">Stock Parcels</label>
              <input
                type="number"
                name="stock_parcels"
                value={formData.stock_parcels}
                onChange={handleInputChange}
                min={0}
                className="w-full input-field text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-0.5">Retail Price/Unit</label>
              <input
                type="number"
                name="retail_price_unit"
                value={formData.retail_price_unit}
                onChange={handleInputChange}
                min={0}
                step={0.01}
                className="w-full input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-0.5">Wholesale Price/Unit</label>
              <input
                type="number"
                name="wholesale_price_unit"
                value={formData.wholesale_price_unit}
                onChange={handleInputChange}
                min={0}
                step={0.01}
                className="w-full input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-0.5">Cost Price/Unit</label>
              <input
                type="number"
                name="purchase_price_unit"
                value={formData.purchase_price_unit}
                onChange={handleInputChange}
                min={0}
                step={0.01}
                className="w-full input-field text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-0.5">Reorder Threshold</label>
            <input
              type="number"
              name="reorder_threshold"
              value={formData.reorder_threshold}
              onChange={handleInputChange}
              min={0}
              className="w-full input-field text-sm"
              placeholder="Alert when stock falls below"
            />
          </div>
        </form>

        <div className="flex gap-2 p-4 border-t bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Item
          </button>
        </div>
      </div>
    </div>
  );
}