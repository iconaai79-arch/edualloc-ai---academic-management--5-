export default function handler(req, res) {
    res.status(200).json({
        status: 'ok',
        runtime: 'javascript',
        timestamp: new Date().toISOString()
    });
}
