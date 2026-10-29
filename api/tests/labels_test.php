<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/labels.php';

$casos = [
    [10.0, 10],
    [3.0, 3],
    [0.5, 1],
    [1.5, 2],
    [0.0, 0],
    [2.2, 3],
];

foreach ($casos as [$cantidad, $esperado]) {
    $copias = copiasLabel($cantidad);
    if ($copias !== $esperado) {
        fwrite(STDERR, "copiasLabel($cantidad) = $copias, se esperaba $esperado\n");
        exit(1);
    }
}

echo "ok\n";
