const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Mock environment variables for the script
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(process.cwd(), 'credentials.json');

async function testDrive() {
    try {
        console.log('--- Drive Diagnostic Script ---');
        console.log('Credentials path:', process.env.GOOGLE_APPLICATION_CREDENTIALS);

        if (!fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
            console.error('ERROR: credentials.json not found!');
            return;
        }

        const auth = new google.auth.GoogleAuth({
            keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });

        const drive = google.drive({ version: 'v3', auth });

        // Read config to get root folder ID
        const configPath = path.join(process.cwd(), 'cache', 'config.json');
        let rootId = '';

        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            rootId = config.rootFolderId;
            console.log('Root Folder ID from config:', rootId);
        } else {
            console.log('No config.json found. Please manually provide Root ID.');
            // Could ask user, but let's assume they set it if they ran sync.
        }

        if (!rootId) {
            console.error('ERROR: No Root Folder ID found.');
            return;
        }

        console.log(`Listing contents of folder: ${rootId}...`);

        const res = await drive.files.list({
            q: `'${rootId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType, parents)',
            pageSize: 10,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const files = res.data.files;
        console.log(`Found ${files.length} items in root.`);

        if (files.length === 0) {
            console.log('WARNING: Folder appears empty. Check permissions.');
            console.log('Make sure the Service Account email is added to the folder sharing permissions.');

            // Let's try to get credentials email
            const creds = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
            console.log('Service Account Email:', creds.client_email);
        }

        files.forEach(f => {
            console.log(`- [${f.mimeType}] ${f.name} (${f.id})`);
        });

    } catch (error) {
        console.error('API Error:', error.message);
        if (error.response) {
            console.error('Error Details:', error.response.data);
        }
    }
}

testDrive();
