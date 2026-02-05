import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AnalyticsDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/analytics')
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setData(data);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-4 text-center">Loading analytics...</div>;
    if (error) return <div className="p-4 text-red-500 bg-red-50 rounded">Analytics Error: {error}. Ensure API is enabled and Service Account has access.</div>;
    if (!data) return null;

    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700">
                <h3 className="text-lg font-bold mb-4">Traffic (Last 24 Hours)</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.traffic}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="shortHour" fontSize={12} />
                            <YAxis fontSize={12} />
                            <Tooltip
                                labelStyle={{ color: '#aaa' }}
                                contentStyle={{ backgroundColor: '#222', border: 'none', borderRadius: '8px', color: '#fff' }}
                            />
                            <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Active Users" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700">
                <h3 className="text-lg font-bold mb-4">Top Content (Last 30 Days)</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-gray-50 dark:bg-zinc-700">
                            <tr>
                                <th className="px-4 py-2">Page Title</th>
                                <th className="px-4 py-2">Views</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.topPages.map((page: any, idx: number) => (
                                <tr key={idx} className="border-b dark:border-zinc-700">
                                    <td className="px-4 py-2 font-medium truncate max-w-xs" title={page.title}>{page.title}</td>
                                    <td className="px-4 py-2 opacity-80">{page.views}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
