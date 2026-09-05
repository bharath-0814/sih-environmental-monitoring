'use client';

import React from 'react';
import { OperationalEvent } from '@/types';
import { 
  Activity, 
  AlertTriangle, 
  CloudRain, 
  Droplets, 
  Radio, 
  ShieldAlert, 
  WifiOff, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';

interface EventTimelineProps {
  events: OperationalEvent[];
  title?: string;
  emptyMessage?: string;
}

export default function EventTimeline({
  events,
  title = 'Operational Event Timeline',
  emptyMessage = 'No operational events recorded for this period.'
}: EventTimelineProps) {
  const getEventIcon = (type: string, severity: string) => {
    switch (type) {
      case 'WATER_TREND_CHANGE':
        return <Droplets className="h-4 w-4 text-blue-600" />;
      case 'RAIN_ACTIVITY_CHANGE':
        return <CloudRain className="h-4 w-4 text-purple-600" />;
      case 'DATA_QUALITY':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'RISK_STATE_CHANGE':
        return <ShieldAlert className="h-4 w-4 text-red-600" />;
      case 'NODE_BECAME_STALE':
        return <WifiOff className="h-4 w-4 text-gray-500" />;
      case 'NODE_RECOVERED':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      default:
        return <Radio className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="h-4 w-4 text-indigo-600" />
          {title}
        </h2>
        <span className="text-xs font-mono text-gray-500">{events.length} events logged</span>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          <Activity className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-gray-100 ml-3 space-y-4 py-2">
          {events.map((evt) => (
            <div key={evt.id} className="relative pl-6">
              {/* Icon Marker on Timeline */}
              <div className="absolute -left-2.5 top-1.5 h-5 w-5 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-xs">
                {getEventIcon(evt.event_type, evt.severity)}
              </div>

              <div className="p-3 bg-gray-50/70 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors">
                <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-gray-900">{evt.title}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded border ${getSeverityBadge(evt.severity)}`}>
                      {evt.event_type}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono">
                    {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{evt.description}</p>
                {evt.node_id && (
                  <span className="text-[10px] text-gray-400 mt-1 block">Node: {evt.node_id}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
