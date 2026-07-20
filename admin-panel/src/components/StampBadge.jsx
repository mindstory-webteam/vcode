const LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  active: 'Active',
  inactive: 'Inactive',
};

export default function StampBadge({ status }) {
  const key = (status || '').toLowerCase();
  return (
    <span className={`stamp stamp-${key} rotate`}>
      {LABELS[key] || status}
    </span>
  );
}
