'use client';

import { HeartPulse } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AstronautVitals } from '@/types/telemetry';
import { DataChip, PanelHeading } from '@/components/ui/Panel';

interface HeartRateChartProps {
  vitals: AstronautVitals | null;
}

export function HeartRateChart({ vitals }: HeartRateChartProps) {
  const data = vitals?.heartRateHistory ?? [];
  const values = data.map((sample) => sample.bpm);
  const yMin = values.length > 0 ? Math.max(30, Math.floor(Math.min(...values) - 8)) : 40;
  const yMax = values.length > 0 ? Math.ceil(Math.max(...values) + 8) : 160;

  return (
    <>
      <PanelHeading
        icon={HeartPulse}
        title="Heart Rate Telemetry"
        kicker="24-HOUR NEON SPARKLINE"
        right={
          <DataChip tone="cyan">
            {vitals ? `${vitals.heartRate} BPM` : '— BPM'}
          </DataChip>
        }
      />

      <div className="mt-2 h-[126px] w-full">
        {data.length === 0 ? (
          <div className="h-full animate-pulse rounded-lg bg-electric/[0.04]" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 2, left: -28, bottom: -4 }}
            >
              <defs>
                <linearGradient id="hrNeonGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00F0FF" stopOpacity={0.42} />
                  <stop offset="55%" stopColor="#00F0FF" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#9D4EDD" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="rgba(0,240,255,0.08)"
                strokeDasharray="3 5"
              />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={{ stroke: 'rgba(0,240,255,0.12)' }}
                tick={{ fill: '#58708d', fontSize: 8, fontFamily: 'monospace' }}
                interval={5}
                height={16}
              />
              <YAxis
                domain={[yMin, yMax]}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#58708d', fontSize: 8, fontFamily: 'monospace' }}
                width={38}
              />
              <ReferenceLine
                y={120}
                stroke="#FF2A5F"
                strokeDasharray="2 5"
                strokeOpacity={0.45}
              />
              <Tooltip
                cursor={{ stroke: 'rgba(0,240,255,0.3)', strokeWidth: 1 }}
                contentStyle={{
                  background: 'rgba(5,8,20,0.96)',
                  border: '1px solid rgba(0,240,255,0.28)',
                  borderRadius: 8,
                  boxShadow: '0 0 24px -8px rgba(0,240,255,0.5)',
                  fontFamily: 'monospace',
                  fontSize: 10,
                  padding: '6px 9px',
                }}
                labelStyle={{ color: '#8fb5d9', fontSize: 9, letterSpacing: '0.08em' }}
                itemStyle={{ color: '#00F0FF' }}
                formatter={(value) => [`${String(value)} BPM`, 'HEART RATE']}
              />
              <Area
                type="monotone"
                dataKey="bpm"
                stroke="#00F0FF"
                strokeWidth={1.8}
                fill="url(#hrNeonGradient)"
                fillOpacity={1}
                dot={false}
                activeDot={{
                  r: 3,
                  fill: '#00F0FF',
                  stroke: '#050814',
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}
