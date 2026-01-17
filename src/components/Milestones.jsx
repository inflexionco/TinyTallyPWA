import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Camera, Edit2, Trash2, Sparkles } from 'lucide-react';
import { milestoneService, COMMON_MILESTONES } from '../services/db';
import { formatDate } from '../utils/dateUtils';
import Toast from './Toast';

export default function Milestones({ child }) {
  const navigate = useNavigate();
  const [milestones, setMilestones] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().slice(0, 10),
    category: 'physical',
    notes: '',
    photo: null
  });

  useEffect(() => {
    loadMilestones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child]);

  const loadMilestones = async () => {
    setLoading(true);
    try {
      const data = await milestoneService.getMilestones(child.id);
      setMilestones(data);
    } catch (error) {
      setToast({ message: 'Failed to load milestones', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const calculateAgeInDays = (milestoneDate) => {
    const birth = new Date(child.dateOfBirth);
    const milestone = new Date(milestoneDate);
    const diffTime = Math.abs(milestone - birth);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getAgeLabel = (ageInDays) => {
    if (ageInDays < 7) {
      return `${ageInDays} ${ageInDays === 1 ? 'day' : 'days'} old`;
    } else if (ageInDays < 30) {
      const weeks = Math.floor(ageInDays / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} old`;
    } else if (ageInDays < 365) {
      const months = Math.floor(ageInDays / 30);
      return `${months} ${months === 1 ? 'month' : 'months'} old`;
    } else {
      const years = Math.floor(ageInDays / 365);
      const months = Math.floor((ageInDays % 365) / 30);
      if (months > 0) {
        return `${years} ${years === 1 ? 'year' : 'years'}, ${months} ${months === 1 ? 'month' : 'months'} old`;
      }
      return `${years} ${years === 1 ? 'year' : 'years'} old`;
    }
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setToast({ message: 'Photo must be less than 2MB', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData({ ...formData, photo: event.target.result });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setToast({ message: 'Please enter a milestone title', type: 'error' });
      return;
    }

    try {
      const ageInDays = calculateAgeInDays(formData.date);
      const milestoneData = {
        childId: child.id,
        title: formData.title.trim(),
        date: new Date(formData.date),
        ageInDays,
        category: formData.category,
        notes: formData.notes.trim(),
        photo: formData.photo
      };

      if (editingId) {
        await milestoneService.updateMilestone(editingId, milestoneData);
        setToast({ message: 'Milestone updated!', type: 'success' });
      } else {
        await milestoneService.addMilestone(milestoneData);
        setToast({ message: 'Milestone added!', type: 'success' });
      }

      setFormData({
        title: '',
        date: new Date().toISOString().slice(0, 10),
        category: 'physical',
        notes: '',
        photo: null
      });
      setShowAddForm(false);
      setEditingId(null);
      await loadMilestones();
    } catch (error) {
      setToast({ message: 'Failed to save milestone', type: 'error' });
    }
  };

  const handleEdit = (milestone) => {
    setFormData({
      title: milestone.title,
      date: new Date(milestone.date).toISOString().slice(0, 10),
      category: milestone.category,
      notes: milestone.notes || '',
      photo: milestone.photo || null
    });
    setEditingId(milestone.id);
    setShowAddForm(true);
    setShowPresets(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this milestone?')) return;

    try {
      await milestoneService.deleteMilestone(id);
      setToast({ message: 'Milestone deleted', type: 'success' });
      await loadMilestones();
    } catch (error) {
      setToast({ message: 'Failed to delete milestone', type: 'error' });
    }
  };

  const handlePresetSelect = (preset) => {
    setFormData({
      ...formData,
      title: preset.title,
      category: preset.category
    });
    setShowPresets(false);
    setShowAddForm(true);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'physical': return '🏃';
      case 'social': return '😊';
      case 'cognitive': return '🧠';
      default: return '⭐';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading milestones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white safe-top">
        <div className="container-safe pt-4 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 bg-white/20 rounded-full active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6" />
              <h1 className="text-xl font-bold">Milestones</h1>
            </div>
          </div>
          <p className="text-sm text-purple-100">Remember {child.name}&apos;s special moments</p>
        </div>
      </div>

      <div className="container-safe py-6">
        {/* Add Milestone Button */}
        {!showAddForm && (
          <div className="mb-6 space-y-3">
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingId(null);
                setFormData({
                  title: '',
                  date: new Date().toISOString().slice(0, 10),
                  category: 'physical',
                  notes: '',
                  photo: null
                });
              }}
              className="w-full flex items-center justify-center gap-2 p-4 bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white rounded-xl transition-colors font-semibold shadow-md"
            >
              <Plus className="w-5 h-5" />
              Add Milestone
            </button>

            <button
              onClick={() => setShowPresets(!showPresets)}
              className="w-full flex items-center justify-center gap-2 p-4 bg-white border-2 border-purple-200 text-purple-600 rounded-xl transition-colors font-semibold"
            >
              <Sparkles className="w-5 h-5" />
              Choose from Common Milestones
            </button>
          </div>
        )}

        {/* Common Milestones Presets */}
        {showPresets && (
          <div className="card mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Common Milestones</h3>
            <div className="space-y-2">
              {COMMON_MILESTONES.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => handlePresetSelect(preset)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getCategoryIcon(preset.category)}</span>
                    <div>
                      <div className="font-medium text-gray-900">{preset.title}</div>
                      <div className="text-xs text-gray-500">Typical: {preset.typical}</div>
                    </div>
                  </div>
                  <Plus className="w-5 h-5 text-purple-500" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? 'Edit Milestone' : 'Add New Milestone'}
            </h2>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Milestone <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input-field"
                placeholder="e.g., First smile"
                required
                maxLength={100}
              />
            </div>

            {/* Date */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input-field"
                max={new Date().toISOString().slice(0, 10)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {child.name} will be {getAgeLabel(calculateAgeInDays(formData.date))}
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'physical', label: 'Physical', icon: '🏃' },
                  { value: 'social', label: 'Social', icon: '😊' },
                  { value: 'cognitive', label: 'Cognitive', icon: '🧠' },
                  { value: 'other', label: 'Other', icon: '⭐' }
                ].map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.value })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      formData.category === cat.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <span className="text-2xl mb-1 block">{cat.icon}</span>
                    <span className="text-sm font-medium">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photo (Optional)
              </label>
              {formData.photo ? (
                <div className="relative">
                  <img
                    src={formData.photo}
                    alt="Milestone"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, photo: null })}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <Camera className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Tap to add photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                </label>
              )}
              <p className="text-xs text-gray-500 mt-1">Max size: 2MB</p>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input-field resize-none"
                rows="3"
                maxLength={500}
                placeholder="Any special details about this moment..."
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
              >
                {editingId ? 'Update' : 'Save'} Milestone
              </button>
            </div>
          </form>
        )}

        {/* Milestones List */}
        {milestones.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{child.name}&apos;s Milestones</h2>
            {milestones.map((milestone) => (
              <div key={milestone.id} className="card">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{getCategoryIcon(milestone.category)}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{milestone.title}</h3>
                    <p className="text-sm text-gray-500">
                      {formatDate(milestone.date)} • {getAgeLabel(milestone.ageInDays)}
                    </p>
                    {milestone.notes && (
                      <p className="text-sm text-gray-600 mt-2">{milestone.notes}</p>
                    )}
                    {milestone.photo && (
                      <img
                        src={milestone.photo}
                        alt={milestone.title}
                        className="w-full h-48 object-cover rounded-lg mt-3"
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(milestone)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(milestone.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !showAddForm && (
          <div className="card text-center py-12">
            <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No milestones yet</p>
            <p className="text-sm text-gray-400">
              Start recording {child.name}&apos;s special moments
            </p>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
