'use client';

import React, { useMemo } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { Typography } from '@mui/material';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#E36414'];

interface CategoryChartProps {
    data: Record<string, number>;
}

export default function CategoryChart({ data }: CategoryChartProps) {
    const chartData = useMemo(() => {
        return Object.entries(data).map(([name, value]) => ({
            name,
            value,
        }));
    }, [data]);

    if (chartData.length === 0) {
        return (
            <Typography sx={{ color: '#9CA3AF' }}>
                No solved questions yet.
            </Typography>
        );
    }

    return (
        // 2. Use ResponsiveContainer to make the chart fit its parent Box
        <ResponsiveContainer width="100%" height={350}>
            <PieChart>
                {/* 3. The Pie component defines the chart segments */}
                <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    // label={(entry) => `${entry.name}-${entry.value}`} // Show label on chart
                >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
}
