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

// Define some colors for the chart segments
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#E36414'];

interface CategoryChartProps {
    data: Record<string, number>;
}

export default function CategoryChart({ data }: CategoryChartProps) {
    // 1. Transform the data from an object to an array for Recharts
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
        <ResponsiveContainer width="100%" height={250}>
            <PieChart>
                {/* 3. The Pie component defines the chart segments */}
                <Pie
                    data={chartData}
                    dataKey="value" // The key in our data array that holds the value
                    nameKey="name" // The key that holds the name/label
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label={(entry) => `${entry.name} (${entry.value})`} // Show label on chart
                >
                    {/* 4. Map over the data to assign a color to each Cell (segment) */}
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                {/* 5. Tooltip shows details on hover */}
                <Tooltip />
                {/* 6. Legend provides a key */}
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
}
