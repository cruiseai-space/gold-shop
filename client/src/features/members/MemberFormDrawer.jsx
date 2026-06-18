import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const memberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export function MemberFormDrawer({ isOpen, onClose, onSubmit, initialData, isSubmitting }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: '',
      phone: '',
      notes: '',
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          name: initialData.name,
          phone: initialData.phone || '',
          notes: initialData.notes || '',
        });
      } else {
        reset({
          name: '',
          phone: '',
          notes: '',
        });
      }
    }
  }, [isOpen, initialData, reset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface h-full shadow-2xl animate-in slide-in-from-right flex flex-col">
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-semibold text-primary">
            {initialData ? 'Edit Member' : 'Add Member'}
          </h2>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <form id="member-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-ink-muted uppercase">Name *</label>
              <input 
                {...register('name')} 
                type="text" 
                className="input" 
                placeholder="Member name"
              />
              {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-ink-muted uppercase">Phone</label>
              <input 
                {...register('phone')} 
                type="text" 
                className="input" 
                placeholder="Phone number"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-ink-muted uppercase">Notes</label>
              <textarea 
                {...register('notes')} 
                className="input min-h-[100px] resize-y" 
                placeholder="Optional notes about this member..."
              />
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-border bg-surface-2 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="btn bg-surface border border-border"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="member-form" 
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : (initialData ? 'Update Member' : 'Save Member')}
          </button>
        </div>
      </div>
    </div>
  );
}
