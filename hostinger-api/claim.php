<?php
/**
 * POST /api/claim.php
 * Body: { "email": "user@example.com" }
 * Response: { "success": true, "discount": 5, "message": "..." }
 * 
 * Cek apakah email sudah pernah claim, kalau belum → insert baru
 */

require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$data = getJsonInput();
$email = sanitizeEmail($data['email'] ?? '');

if (!$email) {
    http_response_code(400);
    echo json_encode(['error' => 'Email tidak valid']);
    exit();
}

try {
    $pdo = getDB();
    
    // Cek apakah email sudah pernah claim
    $stmt = $pdo->prepare("SELECT id, discount_percent, has_reviewed FROM claims WHERE email = ?");
    $stmt->execute([$email]);
    $existing = $stmt->fetch();
    
    if ($existing) {
        // Sudah pernah claim
        echo json_encode([
            'success' => true,
            'already_claimed' => true,
            'discount' => $existing['discount_percent'],
            'has_reviewed' => (bool) $existing['has_reviewed'],
            'message' => 'Email sudah pernah klaim diskon ' . $existing['discount_percent'] . '%'
        ]);
        exit();
    }
    
    // Ambil diskon dari settings
    $stmt = $pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = 'discount_percent'");
    $stmt->execute();
    $discount = (int) ($stmt->fetch()['setting_value'] ?? 5);
    
    // Insert claim baru
    $stmt = $pdo->prepare("
        INSERT INTO claims (email, discount_percent, ip_address, user_agent) 
        VALUES (?, ?, ?, ?)
    ");
    $stmt->execute([
        $email,
        $discount,
        getClientIP(),
        $_SERVER['HTTP_USER_AGENT'] ?? ''
    ]);
    
    $claimId = $pdo->lastInsertId();
    
    echo json_encode([
        'success' => true,
        'already_claimed' => false,
        'discount' => $discount,
        'claim_id' => $claimId,
        'message' => 'Diskon ' . $discount . '% berhasil diklaim!'
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Gagal klaim diskon', 'debug' => $e->getMessage()]);
}
