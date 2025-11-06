import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  gradient?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  gradient = 'from-indigo-500 to-purple-600'
}: StatCardProps) {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-200`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium uppercase tracking-wide">
            {title}
          </p>
          <p className="text-4xl font-bold mt-2">
            {value}
          </p>
        </div>
        <div className="bg-white/20 p-4 rounded-lg">
          <Icon className="w-8 h-8" />
        </div>
      </div>
    </div>
  );
}
