<?php
/**
 * Database Connection - Hostinger MySQL
 * 
 * GANTI nilai di bawah sesuai info dari Hostinger:
 * - Buka Hostinger Dashboard → MySQL Databases
 * - Catat: Database Name, Username, Password, Host
 */

// ====== KONFIGURASI - GANTI INI! ======
define('DB_HOST', 'localhost');                    // Biasanya localhost di Hostinger
define('DB_NAME', 'u123456789_lixscout');         // Ganti dengan nama database lo
define('DB_USER', 'u123456789_admin');            // Ganti dengan username database lo
define('DB_PASS', 'PASSWORD_LO_DISINI');          // Ganti dengan password database lo
// ========================================

// CORS headers (biar Vercel bisa akses)
header('Access-Control-Allow-Origin: https://lixscout.com');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Koneksi database
function getDB() {
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed', 'debug' => $e->getMessage()]);
        exit();
    }
}

// Helper: get JSON input
function getJsonInput() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?: [];
}

// Helper: sanitize email
function sanitizeEmail($email) {
    return filter_var(trim($email), FILTER_VALIDATE_EMAIL);
}

// Helper: get client IP
function getClientIP() {
    $keys = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'];
    foreach ($keys as $key) {
        if (!empty($_SERVER[$key])) {
            $ip = explode(',', $_SERVER[$key])[0];
            if (filter_var(trim($ip), FILTER_VALIDATE_IP)) {
                return trim($ip);
            }
        }
    }
    return '0.0.0.0';
}
