// src/components/TestTime.jsx
import React from 'react';
import { formatFullDate, formatRelativeTime, formatTableDate } from '../utils/dateUtils';

const TestTime = () => {
    const testDates = [
        '2026-04-06T10:12:24',
        '2026-04-06T10:11:56',
        '2026-04-06T10:08:22',
    ];

    return (
        <div style={{ padding: 20 }}>
            <h2>Тест форматирования времени</h2>
            <table border="1" cellPadding="8">
                <thead>
                    <tr>
                        <th>Исходная дата (UTC)</th>
                        <th>formatTableDate</th>
                        <th>formatRelativeTime</th>
                        <th>formatFullDate</th>
                    </tr>
                </thead>
                <tbody>
                    {testDates.map((date, i) => (
                        <tr key={i}>
                            <td>{date}</td>
                            <td>{formatTableDate(date)}</td>
                            <td>{formatRelativeTime(date)}</td>
                            <td>{formatFullDate(date)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p style={{ marginTop: 20, color: 'green' }}>
                ✅ Должно показывать: 06.04.2026 15:12 (Екатеринбург UTC+5)
            </p>
        </div>
    );
};

export default TestTime;