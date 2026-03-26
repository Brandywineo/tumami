<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

requireRole(['runner', 'both']);

$userId = (int) currentUserId();

$uploadDir = __DIR__ . '/uploads/verification/' . $userId;
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0775, true);
}

$errors = [];
$success = null;

$allowedDocTypes = ['national_id', 'passport', 'driving_license', 'alien_id'];
$docType = (string) ($_POST['doc_type'] ?? 'national_id');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['_csrf'] ?? null)) {
        $errors[] = 'Security validation failed. Please refresh and try again.';
    }

    if (!in_array($docType, $allowedDocTypes, true)) {
        $errors[] = 'Select a valid identification document type.';
    }

    $requiredUploads = ['face_scan', 'good_conduct_pdf'];
    if ($docType === 'national_id' || $docType === 'alien_id') {
        $requiredUploads[] = 'doc_front';
        $requiredUploads[] = 'doc_back';
    } else {
        $requiredUploads[] = 'doc_front';
    }

    $storedFiles = [];
    foreach ($requiredUploads as $field) {
        if (!isset($_FILES[$field]) || (int) $_FILES[$field]['error'] !== UPLOAD_ERR_OK) {
            $errors[] = 'Please upload all required files before submitting.';
            break;
        }

        $tmpName = (string) $_FILES[$field]['tmp_name'];
        $original = (string) $_FILES[$field]['name'];
        $extension = strtolower((string) pathinfo($original, PATHINFO_EXTENSION));

        $isPdfField = $field === 'good_conduct_pdf';
        if ($isPdfField && $extension !== 'pdf') {
            $errors[] = 'Certificate of good conduct must be uploaded as PDF.';
            continue;
        }

        if (!$isPdfField && !in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true)) {
            $errors[] = 'Identity and face-scan uploads must be image files (jpg, png, webp).';
            continue;
        }

        if ((int) $_FILES[$field]['size'] > (8 * 1024 * 1024)) {
            $errors[] = 'Each upload must be 8MB or less.';
            continue;
        }

        $safeName = $field . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
        $target = $uploadDir . '/' . $safeName;
        if (!move_uploaded_file($tmpName, $target)) {
            $errors[] = 'Failed to save one of your files. Please try again.';
            continue;
        }

        $storedFiles[$field] = 'uploads/verification/' . $userId . '/' . $safeName;
    }

    if ($errors === []) {
        $pdo->exec('CREATE TABLE IF NOT EXISTS runner_verification_submissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            doc_type VARCHAR(40) NOT NULL,
            doc_front_path VARCHAR(255) NULL,
            doc_back_path VARCHAR(255) NULL,
            face_scan_path VARCHAR(255) NOT NULL,
            good_conduct_pdf_path VARCHAR(255) NOT NULL,
            status VARCHAR(40) NOT NULL DEFAULT "under_review",
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_runner_verification_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

        $stmt = $pdo->prepare('INSERT INTO runner_verification_submissions (
            user_id,
            doc_type,
            doc_front_path,
            doc_back_path,
            face_scan_path,
            good_conduct_pdf_path,
            status
        ) VALUES (
            :user_id,
            :doc_type,
            :doc_front_path,
            :doc_back_path,
            :face_scan_path,
            :good_conduct_pdf_path,
            "under_review"
        )');

        $stmt->execute([
            'user_id' => $userId,
            'doc_type' => $docType,
            'doc_front_path' => $storedFiles['doc_front'] ?? null,
            'doc_back_path' => $storedFiles['doc_back'] ?? null,
            'face_scan_path' => $storedFiles['face_scan'] ?? '',
            'good_conduct_pdf_path' => $storedFiles['good_conduct_pdf'] ?? '',
        ]);

        $pdo->prepare('UPDATE users SET verification_level = "id_verified", updated_at = NOW() WHERE id = :id LIMIT 1')
            ->execute(['id' => $userId]);

        setFlash('success', 'Verification submitted successfully. Our team will review your documents shortly.');
        redirect('dashboard_runner.php');
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Runner Verification | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section section--compact">
    <div class="container container--mobile-dense" style="max-width:680px;">
        <article class="card card--compact">
            <h2 class="dashboard-title">Runner Verification</h2>
            <p class="dashboard-subtitle">Upload one approved identity document, a face scan, and a certificate of good conduct (PDF).</p>

            <?php if ($errors): ?>
                <div class="auth-alert auth-alert--error" style="margin-top:10px;">
                    <?php foreach ($errors as $error): ?>
                        <p style="margin:0 0 6px;"><?php echo h($error); ?></p>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>

            <?php if ($success): ?>
                <p class="auth-alert auth-alert--success"><?php echo h($success); ?></p>
            <?php endif; ?>

            <form method="post" enctype="multipart/form-data" class="compact-form-gap">
                <?php echo csrf_field(); ?>
                <p>
                    <label>Document type<br>
                        <select name="doc_type" style="width:100%;padding:10px;">
                            <option value="national_id" <?php echo $docType === 'national_id' ? 'selected' : ''; ?>>National ID (front + back)</option>
                            <option value="passport" <?php echo $docType === 'passport' ? 'selected' : ''; ?>>Passport (bio page)</option>
                            <option value="driving_license" <?php echo $docType === 'driving_license' ? 'selected' : ''; ?>>Driving License (front)</option>
                            <option value="alien_id" <?php echo $docType === 'alien_id' ? 'selected' : ''; ?>>Alien ID (front + back)</option>
                        </select>
                    </label>
                </p>

                <p><label>Document front image<br><input type="file" name="doc_front" accept="image/*" required></label></p>
                <p><label>Document back image (required for National ID / Alien ID)<br><input type="file" name="doc_back" accept="image/*"></label></p>
                <p><label>Face scan / selfie image<br><input type="file" name="face_scan" accept="image/*" required></label></p>
                <p><label>Certificate of good conduct (PDF)<br><input type="file" name="good_conduct_pdf" accept="application/pdf" required></label></p>

                <button class="cta-button" type="submit">Submit Verification</button>
            </form>
        </article>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
