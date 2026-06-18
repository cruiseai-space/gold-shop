import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ROLES } from '../../constants/roles.js';
import { toast } from 'sonner';
import { Spinner } from '../../components/ui/Spinner.jsx';

const inviteSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum([ROLES.STAFF, ROLES.VIEWER], {
    errorMap: () => ({ message: 'Please select a valid role' }),
  }),
});

export function InviteUserModal({ isOpen, onClose, onSubmit, isSubmitting = false }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      fullName: '',
      email: '',
      role: ROLES.STAFF,
    }
  });

  const handleFormSubmit = async (data) => {
    try {
      await onSubmit(data);
      reset();
    } catch (e) {
      toast.error(e.response?.data?.error?.message || e.message || 'Failed to send invite');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-surface max-w-md w-full rounded-lg shadow-xl border border-border overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-display font-bold text-primary">Invite New User</h2>
          <p className="text-sm text-ink-muted">They will receive a magic link to set their password.</p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Full Name</label>
            <input {...register('fullName')} className="input" placeholder="Arun Kumar" />
            {errors.fullName && <p className="text-xs text-danger mt-1">{errors.fullName.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Email Address</label>
            <input {...register('email')} type="email" className="input" placeholder="arun@example.com" />
            {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Role</label>
            <select {...register('role')} className="input">
              <option value={ROLES.STAFF}>Staff (Counter Assistant)</option>
              <option value={ROLES.VIEWER}>Viewer (Read-only)</option>
            </select>
            {errors.role && <p className="text-xs text-danger mt-1">{errors.role.message}</p>}
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn border border-border flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1">
              {isSubmitting ? <Spinner inline size="sm" variant="gold" message="Sending..." /> : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
