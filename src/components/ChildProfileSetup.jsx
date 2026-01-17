import { useState } from 'react';
import { Baby } from 'lucide-react';
import { childService } from '../services/db';
import { sanitizeName, isValidDate, INPUT_LIMITS } from '../utils/inputValidation';

export default function ChildProfileSetup({ onChildCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const sanitizedName = sanitizeName(formData.name);

    if (!sanitizedName) {
      setError('Please enter your child\'s name');
      return;
    }

    if (!formData.dateOfBirth || !isValidDate(formData.dateOfBirth)) {
      setError('Please select a valid date of birth');
      return;
    }

    setIsSubmitting(true);

    try {
      const newChildId = await childService.createChild({
        name: sanitizedName,
        dateOfBirth: new Date(formData.dateOfBirth)
      });

      onChildCreated(newChildId);
    } catch (err) {
      console.error('Error creating child profile:', err);
      setError('Failed to create profile. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500 rounded-full mb-4">
            <Baby className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to TinyTally</h1>
          <p className="text-gray-600">Let&apos;s set up your child&apos;s profile</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Child&apos;s Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder="Enter your child's name"
              maxLength={INPUT_LIMITS.NAME_MAX_LENGTH}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
              Date of Birth
            </label>
            <input
              type="date"
              id="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              className="input-field"
              max={new Date().toISOString().split('T')[0]}
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full"
          >
            {isSubmitting ? 'Creating Profile...' : 'Get Started'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          All data is stored locally on your device
        </p>
      </div>
    </div>
  );
}
