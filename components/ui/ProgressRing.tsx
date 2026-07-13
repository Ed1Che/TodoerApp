// components/ui/ProgressRing.tsx - circular progress ring per Serene Logic design
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../../constants/theme';

interface ProgressRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0–1
  color: string;
  trackColor?: string;
  children?: React.ReactNode;
}

export default function ProgressRing({
  size = 60,
  strokeWidth = 4,
  progress,
  color,
  trackColor = Colors.surfaceContainerHigh,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          strokeLinecap="round"
          fill="transparent"
        />
      </Svg>
      {children}
    </View>
  );
}
