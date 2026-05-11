import * as ftp from "basic-ftp";

async function explore() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: "da12.host-ww.net",
            user: "eduaico1",
            password: "A]i7s4v[5qZP5S",
            secure: false
        });
        
        console.log("Root /:");
        (await client.list("/")).forEach(f => console.log(`- ${f.name} (${f.type === 2 ? 'DIR' : 'FILE'})`));

        console.log("\n/public_html:");
        (await client.list("/public_html")).forEach(f => console.log(`- ${f.name} (${f.type === 2 ? 'DIR' : 'FILE'})`));

    } catch (err) {
        console.error(err);
    }
    client.close();
}
explore();
