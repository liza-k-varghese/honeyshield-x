import React from 'react';
import { DataPacketPayload, PacketColor } from '../types';
import { Shield, Cpu, BrainCircuit, Bell, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DataPacketProps {
  packet: DataPacketPayload;
  onClick?: (packet: DataPacketPayload) => void;
  selected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const DataPacket: React.FC<DataPacketProps> = ({
  packet,
  onClick,
  selected = false,
  size = 'md',
  showLabel = true,
}) => {
  const getPacketStyles = (color: PacketColor) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-950/80',
          border: 'border-blue-500',
          glow: 'shadow-[0_0_12px_rgba(59,130,246,0.6)]',
          text: 'text-blue-300',
          icon: Shield,
        };
      case 'cyan':
        return {
          bg: 'bg-cyan-950/80',
          border: 'border-cyan-400',
          glow: 'shadow-[0_0_12px_rgba(0,229,255,0.6)]',
          text: 'text-cyan-300',
          icon: Cpu,
        };
      case 'purple':
        return {
          bg: 'bg-purple-950/80',
          border: 'border-purple-500',
          glow: 'shadow-[0_0_12px_rgba(168,85,247,0.6)]',
          text: 'text-purple-300',
          icon: BrainCircuit,
        };
      case 'red':
        return {
          bg: 'bg-red-950/80',
          border: 'border-red-500',
          glow: 'shadow-[0_0_14px_rgba(239,68,68,0.7)]',
          text: 'text-red-300',
          icon: Bell,
        };
      case 'amber':
        return {
          bg: 'bg-amber-950/80',
          border: 'border-amber-500',
          glow: 'shadow-[0_0_12px_rgba(245,158,11,0.6)]',
          text: 'text-amber-300',
          icon: AlertTriangle,
        };
      case 'green':
      default:
        return {
          bg: 'bg-emerald-950/80',
          border: 'border-emerald-500',
          glow: 'shadow-[0_0_12px_rgba(16,185,129,0.6)]',
          text: 'text-emerald-300',
          icon: CheckCircle2,
        };
    }
  };

  const style = getPacketStyles(packet.color);
  const IconComponent = style.icon;

  const sizeClasses = {
    sm: 'p-1.5 text-[10px]',
    md: 'p-2 text-xs',
    lg: 'p-3 text-sm',
  }[size];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(packet);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(packet)}
      onKeyDown={handleKeyDown}
      title={`Data Packet ${packet.eventId.slice(0, 8)}: ${packet.eventType} (${packet.severity.toUpperCase()})`}
      className={`inline-flex items-center gap-2 rounded-lg border backdrop-blur-md cursor-pointer transition-all duration-200 select-none outline-none focus:ring-2 focus:ring-cyan-400 ${
        style.bg
      } ${style.border} ${style.glow} ${sizeClasses} ${
        selected ? 'ring-2 ring-white scale-105' : 'hover:scale-102 hover:border-white'
      }`}
    >
      <div className={`p-1 rounded bg-black/40 ${style.text}`}>
        <IconComponent className="w-3.5 h-3.5" />
      </div>

      {showLabel && (
        <div className="flex flex-col text-left font-mono">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white tracking-wide truncate max-w-[110px]">
              {packet.eventType}
            </span>
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-semibold uppercase ${
                packet.severity === 'critical'
                  ? 'bg-red-900 text-red-200'
                  : packet.severity === 'high'
                  ? 'bg-orange-900 text-orange-200'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {packet.severity.slice(0, 4).toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span>#{packet.eventId.slice(0, 8)}</span>
            <span>•</span>
            <span className="capitalize">{packet.status.replace('_', ' ')}</span>
          </div>
        </div>
      )}
    </div>
  );
};
