import * as ftp from "basic-ftp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function uploadShowcaseImages() {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    const host = "da12.host-ww.net";
    const user = "eduaico1";
    const password = "A]i7s4v[5qZP5S";

    const localDir = path.join(__dirname, "..", "showcase");

    if (!fs.existsSync(localDir)) {
        console.log(`Local directory ${localDir} does not exist. Creating it...`);
        fs.mkdirSync(localDir, { recursive: true });
        console.log("Please place your showcase images in the 'showcase' directory and run this script again.");
        // We'll create a dummy file to ensure directory has at least something, though basic-ftp upload needs it.
        fs.writeFileSync(path.join(localDir, ".keep"), "Keep file");
        return;
    }

    try {
        console.log(`Connecting to FTP server ${host}...`);
        await client.access({
            host: host,
            user: user,
            password: password,
            secure: false
        });
        
        console.log("Connected successfully!");

        let remotePathToUse = "/public_html/showcase";
        
        const list = await client.list("/");
        const isDomainsDir = list.find(item => item.name === 'domains');
        const isPublicHtmlDir = list.find(item => item.name === 'public_html');

        if (isDomainsDir) {
            const domainsList = await client.list("/domains");
            const firstDomain = domainsList.find(d => d.type === 2 || d.isDirectory);
            if (firstDomain) {
                remotePathToUse = `/domains/${firstDomain.name}/public_html/showcase`;
            }
        } else if (isPublicHtmlDir) {
            remotePathToUse = "/public_html/showcase";
        }

        console.log(`Ensuring remote directory exists: ${remotePathToUse}`);
        await client.ensureDir(remotePathToUse);
        
        console.log(`Uploading contents of ${localDir} to ${remotePathToUse}...`);
        await client.uploadFromDir(localDir);
        
        console.log("Upload completed successfully!");

    }
    catch(err) {
        console.error("Upload failed:", err);
    }
    client.close();
}

uploadShowcaseImages();
