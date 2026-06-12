<?php
function inspect_db($host, $dbname, $user, $pass) {
    try {
        echo "\n=== Trying $dbname as $user ===\n";
        $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $user, $pass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        echo "=== TABLES ===\n";
        $stmt = $pdo->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        foreach ($tables as $table) {
            echo "- $table\n";
        }
        
        foreach (['feedback', 'feedbacks', 'notification', 'notifications', 'testimonials'] as $target) {
            if (in_array($target, $tables)) {
                echo "\n=== DESCRIBE $target ===\n";
                $desc = $pdo->query("DESCRIBE `$target`")->fetchAll(PDO::FETCH_ASSOC);
                foreach ($desc as $col) {
                    echo "  {$col['Field']} - {$col['Type']} - Null: {$col['Null']} - Key: {$col['Key']} - Default: {$col['Default']}\n";
                }
            }
        }
    } catch (PDOException $e) {
        echo "Connection failed: " . $e->getMessage() . "\n";
    }
}

inspect_db("127.0.0.1", "subly", "root", "121212");
inspect_db("127.0.0.1", "sublymyi_main", "root", "121212");
inspect_db("127.0.0.1", "sublymyi_main", "sublymyi_admin", "dy63hmtikxc949nh");
