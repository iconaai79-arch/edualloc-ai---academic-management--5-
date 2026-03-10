<?php
// cPanel Image Upload Handler for EduAlloc AI
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$uploadDir = __DIR__ . '/uploads/';

// Create uploads directory if it doesn't exist
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_FILES['file'])) {
        http_response_code(400);
        echo json_encode(['error' => 'No file uploaded']);
        exit;
    }

    $file = $_FILES['file'];
    $fileName = time() . '_' . basename($file['name']);
    $targetFilePath = $uploadDir . $fileName;
    $fileType = strtolower(pathinfo($targetFilePath, PATHINFO_EXTENSION));

    // Allow certain file formats
    $allowTypes = array('jpg', 'png', 'jpeg', 'gif', 'pdf', 'webp');
    if (in_array($fileType, $allowTypes)) {
        // Upload file to server
        if (move_uploaded_file($file['tmp_name'], $targetFilePath)) {
            // Return the public URL path
            $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
            $host = $_SERVER['HTTP_HOST'];
            $scriptPath = str_replace(basename(__FILE__), '', $_SERVER['SCRIPT_NAME']);
            $publicUrl = $protocol . '://' . $host . $scriptPath . 'uploads/' . $fileName;

            echo json_encode(['success' => true, 'url' => $publicUrl, 'path' => '/uploads/' . $fileName]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to move uploaded file. Check permissions on ' . $uploadDir]);
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid file type: ' . $fileType]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    http_response_code(200);
    echo json_encode([
        'status' => 'active',
        'message' => 'EduAlloc Upload Handler',
        'diagnostics' => [
            'method' => $_SERVER['REQUEST_METHOD'],
            'uploads_writable' => is_writable($uploadDir),
            'post_max' => ini_get('post_max_size'),
            'upload_max' => ini_get('upload_max_filesize')
        ]
    ]);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed', 'method' => $_SERVER['REQUEST_METHOD']]);
}
?>