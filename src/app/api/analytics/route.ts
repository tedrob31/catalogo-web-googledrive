import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getConfig } from '@/lib/config';

// Initialize auth - reusing credentials from Drive
const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
});

const analyticsData = google.analyticsdata({
    version: 'v1beta',
    auth,
});

export const dynamic = 'force-dynamic';

export async function GET() {
    const config = await getConfig();

    if (!config.analyticsPropertyId) {
        return NextResponse.json({ error: 'Analytics Property ID not configured' }, { status: 400 });
    }

    const propertyId = config.analyticsPropertyId;

    try {
        // 1. Get Users per Hour (Last 24h approx)
        // usage of 'dateHour' ensures we don't mix up hours from different days
        // 1. Get Users per Hour (Last 24h approx)
        const activeUsersResponse: any = await (analyticsData.properties as any).runReport({
            property: `properties/${propertyId}`,
            requestBody: {
                dateRanges: [{ startDate: 'yesterday', endDate: 'today' }],
                dimensions: [{ name: 'dateHour' }],
                metrics: [{ name: 'activeUsers' }],
                orderBys: [{ dimension: { dimensionName: 'dateHour' } }]
            },
        });

        // 2. Get Top Pages (Top 10)
        const topPagesResponse: any = await (analyticsData.properties as any).runReport({
            property: `properties/${propertyId}`,
            requestBody: {
                dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
                dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
                metrics: [{ name: 'screenPageViews' }],
                limit: 10,
                orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }]
            },
        });

        // Format User Data
        const trafficData = activeUsersResponse.data.rows?.map((row: any) => {
            const raw = row.dimensionValues?.[0].value || '';
            const hour = raw.slice(8, 10);
            const day = raw.slice(6, 8);
            return {
                hour: `${day}/${raw.slice(4, 6)} ${hour}:00`,
                shortHour: `${hour}:00`,
                users: parseInt(row.metricValues?.[0].value || '0'),
            };
        }) || [];

        const recentTraffic = trafficData.slice(-24);

        // Format Page Data
        const topPages = topPagesResponse.data.rows?.map((row: any) => ({
            path: row.dimensionValues?.[0].value,
            title: row.dimensionValues?.[1].value,
            views: parseInt(row.metricValues?.[0].value || '0'),
        })) || [];

        return NextResponse.json({
            traffic: recentTraffic,
            topPages: topPages
        });

    } catch (error: any) {
        console.error('Analytics API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
