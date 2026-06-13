<?php
/**
 * GET /api/reviews.php
 * Query params: ?limit=10&offset=0
 * Response: { "reviews": [...], "total": 42, "avg_rating": 4.8 }
 * 
 * Ambil review yang sudah approved, bisa dipagination
 */

require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$limit = min((int) ($_GET['limit'] ?? 10), 50); // Max 50
$offset = max((int) ($_GET['offset'] ?? 0), 0);

try {
    $pdo = getDB();
    
    // Hitung total & average rating
    $stats = $pdo->query("
        SELECT 
            COUNT(*) as total,
            COALESCE(ROUND(AVG(rating), 1), 0) as avg_rating
        FROM reviews 
        WHERE is_approved = 1
    ")->fetch();
    
    // Ambil reviews dengan pagination
    $stmt = $pdo->prepare("
        SELECT 
            id,
            reviewer_name,
            rating,
            review_text,
            created_at
        FROM reviews 
        WHERE is_approved = 1 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([$limit, $offset]);
    $reviews = $stmt->fetchAll();
    
    // Format response
    $formatted = array_map(function($r) {
        return [
            'id' => $r['id'],
            'name' => $r['reviewer_name'],
            'rating' => (int) $r['rating'],
            'text' => $r['review_text'],
            'date' => $r['created_at'],
            'initials' => mb_strtoupper(mb_substr($r['reviewer_name'], 0, 2))
        ];
    }, $reviews);
    
    echo json_encode([
        'success' => true,
        'reviews' => $formatted,
        'total' => (int) $stats['total'],
        'avg_rating' => (float) $stats['avg_rating'],
        'limit' => $limit,
        'offset' => $offset
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Gagal ambil reviews', 'debug' => $e->getMessage()]);
}
