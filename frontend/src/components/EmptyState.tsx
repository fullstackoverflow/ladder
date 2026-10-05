import { Server } from 'lucide-react';
import type { ReactNode } from 'react';
export function Empty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Server;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={28} strokeWidth={1.5} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
