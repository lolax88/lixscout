<?php
/**
 * POST /api/review.php
 * Body: { "email": "user@example.com", "rating": 5, "text": "...", "name": "..." }
 * Response: { "success": true, "review": {...} }
 * 
 * Simpan review + update status has_reviewed di tabel claims
 */

require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$data = getJsonInput();
$email = sanitizeEmail($data['email'] ?? '');
$rating = (int) ($data['rating'] ?? 0);
$text = trim($data['text'] ?? '');
$name = trim($data['name'] ?? 'Traveler');

// Validasi
if (!$email) {
    http_response_code(400);
    echo json_encode(['error' => 'Email tidak valid']);
    exit();
}

if ($rating < 1 || $rating > 5) {
    http_response_code(400);
    echo json_encode(['error' => 'Rating harus 1-5']);
    exit();
}

if (empty($text)) {
    $text = 'Pelayanan bagus!'; // Default kalau kosong
}

// Sanitize nama (max 100 char)
$name = substr($name, 0, 100);
if (empty($name)) {
    $name = 'Traveler';
}

try {
    $pdo = getDB();
    
    // Cari claim_id dari email
    $stmt = $pdo->prepare("SELECT id FROM claims WHERE email = ?");
    $stmt->execute([$email]);
    $claim = $stmt->fetch();
    
    $claimId = $claim ? $claim['id'] : null;
    
    // Insert review
    $stmt = $pdo->prepare("
        INSERT INTO reviews (claim_id, email, rating, review_text, reviewer_name) 
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$claimId, $email, $rating, $text, $name]);
    
    $reviewId = $pdo->lastInsertId();
    
    // Update has_reviewed di tabel claims
    if ($claimId) {
        $stmt = $pdo->prepare("UPDATE claims SET has_reviewed = 1 WHERE id = ?");
        $stmt->execute([$claimId]);
    }
    
    echo json_encode([
        'success' => true,
        'review' => [
            'id' => $reviewId,
            'rating' => $rating,
            'text' => $text,
            'name' => $name,
            'date' => date('Y-m-d H:i:s')
        ],
        'message' => 'Review berhasil dikirim!'
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Gagal simpan review', 'debug' => $e->getMessage()]);
}
