'use client';

import { useState } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';
import { CollectionItem } from '@/hooks/useCollection';
import { pokemonFinishOptions, lorcanaFinishOptions, mtgFinishOptions, conditionOptions, gradingCompanies, gradeValues } from '@/hooks/useCardSearch';

interface EditCardModalProps {
  item: CollectionItem;
  onClose: () => void;
  onSave: (itemId: number, updates: any) => void;
  onCollectionReload: () => void;
  getCardImage: (item: CollectionItem) => string;
}

export default function EditCardModal({ item, onClose, onSave, onCollectionReload, getCardImage }: EditCardModalProps) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingItem, setEditingItem] = useState(item);

  const handleSave = () => {
    const quantity = parseInt((document.getElementById('edit-quantity') as HTMLInputElement).value);
    const condition = (document.getElementById('edit-condition') as HTMLSelectElement).value;
    const finish = (document.getElementById('edit-finish') as HTMLSelectElement).value;
    const foil = (document.getElementById('edit-foil') as HTMLInputElement).checked;
    const isSigned = (document.getElementById('edit-signed') as HTMLInputElement).checked;
    const isGraded = (document.getElementById('edit-graded') as HTMLInputElement).checked;
    const gradingCompany = (document.getElementById('edit-grading-company') as HTMLSelectElement).value;
    const gradeValue = (document.getElementById('edit-grade-value') as HTMLSelectElement).value;
    const notes = (document.getElementById('edit-notes') as HTMLTextAreaElement).value;

    onSave(editingItem.id, {
      quantity, condition, foil, notes, finish, isSigned, isGraded,
      gradingCompany: isGraded ? gradingCompany : null,
      gradeValue: isGraded ? gradeValue : null,
    });
    onClose();
  };

  const finishOptions = editingItem.game === 'pokemon' ? pokemonFinishOptions
    : editingItem.game === 'lorcana' ? lorcanaFinishOptions
    : mtgFinishOptions;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold dark:text-white">Edit Card Details</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {editingItem.card_data?.name || 'Unknown Card'} •{' '}
                {editingItem.card_data?.set?.id || editingItem.card_data?.set_code || editingItem.card_data?.set || ''}{' '}
                #{editingItem.card_data?.collector_number || editingItem.card_data?.number || editingItem.card_data?.localId || ''}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex gap-6 mb-6">
            {/* Card Preview */}
            <div className="w-1/3 flex-shrink-0">
              <div className="relative aspect-[2/3] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden shadow-md mb-3">
                <img
                  src={editingItem.custom_image_url || getCardImage(editingItem)}
                  alt={editingItem.card_data?.name || 'Card'}
                  className="w-full h-full object-cover"
                />
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="cursor-pointer w-full py-2 px-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center justify-center gap-2 transition">
                  <Camera className="w-3 h-3" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingImage(true);
                      const formData = new FormData();
                      formData.append('image', file);
                      formData.append('itemId', editingItem.id.toString());
                      try {
                        const res = await fetch('/api/collection/upload-image', { method: 'POST', credentials: 'include', body: formData });
                        const data = await res.json();
                        if (data.success) {
                          setEditingItem({ ...editingItem, custom_image_url: data.imageUrl });
                          onCollectionReload();
                        }
                      } catch (err) {
                        console.error('Upload error:', err);
                      } finally {
                        setUploadingImage(false);
                      }
                    }}
                  />
                  Upload My Photo
                </label>
                {editingItem.custom_image_url && (
                  <button
                    onClick={async () => {
                      if (!confirm('Remove custom photo?')) return;
                      try {
                        await fetch(`/api/collection/upload-image?itemId=${editingItem.id}`, { method: 'DELETE', credentials: 'include' });
                        setEditingItem({ ...editingItem, custom_image_url: undefined });
                        onCollectionReload();
                      } catch (err) { console.error('Delete image error:', err); }
                    }}
                    className="w-full py-2 px-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                  >
                    Revert to Scan
                  </button>
                )}
              </div>
            </div>

            {/* Form */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                  <input type="number" min="1" defaultValue={editingItem.quantity} id="edit-quantity"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Finish</label>
                  <select id="edit-finish" defaultValue={editingItem.finish || 'Normal'}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      const isFoil = e.target.value !== 'Normal';
                      (document.getElementById('edit-foil') as HTMLInputElement).checked = isFoil;
                    }}
                  >
                    {finishOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condition</label>
                <select id="edit-condition" defaultValue={editingItem.condition || 'Near Mint'}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500">
                  {conditionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Attributes</label>
                <div className="flex flex-wrap gap-4">
                  {[
                    { id: 'edit-foil', checked: editingItem.foil, label: 'Foil/Holo' },
                    { id: 'edit-signed', checked: editingItem.is_signed, label: 'Signed' },
                  ].map(({ id, checked, label }) => (
                    <div key={id} className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked={checked} id={id} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                      <label htmlFor={id} className="text-sm text-gray-700 dark:text-gray-300">{label}</label>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox" defaultChecked={editingItem.is_graded} id="edit-graded"
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      onChange={(e) => {
                        const el = document.getElementById('grading-details');
                        if (el) el.style.display = e.target.checked ? 'grid' : 'none';
                      }}
                    />
                    <label htmlFor="edit-graded" className="text-sm text-gray-700 dark:text-gray-300">Graded</label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4" id="grading-details"
                style={{ display: editingItem.is_graded ? 'grid' : 'none' }}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grading Company</label>
                  <select id="edit-grading-company" defaultValue={editingItem.grading_company || 'PSA'}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                    {gradingCompanies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grade</label>
                  <select id="edit-grade-value" defaultValue={editingItem.grade_value || '10'}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                    {gradeValues.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea id="edit-notes" defaultValue={editingItem.notes || ''} rows={2}
                  placeholder="Add personal notes (e.g. bought from LGS, gift, etc.)"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t dark:border-gray-700">
            <button onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button onClick={handleSave}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
