<?php
declare(strict_types=1);

/** Copias de label: una por unidad, redondeando hacia arriba. 0.5 → 1, 10 → 10. */
function copiasLabel(float $cantidad): int
{
    if ($cantidad <= 0) {
        return 0;
    }
    return (int) ceil($cantidad - 1e-9);
}
