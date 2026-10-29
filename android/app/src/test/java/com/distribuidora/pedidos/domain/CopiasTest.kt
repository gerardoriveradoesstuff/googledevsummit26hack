package com.distribuidora.pedidos.domain

import org.junit.Assert.assertEquals
import org.junit.Test

class CopiasTest {
    @Test
    fun redondeaHaciaArriba() {
        assertEquals(10, copiasLabel(10.0))
        assertEquals(3, copiasLabel(3.0))
        assertEquals(1, copiasLabel(0.5))
        assertEquals(2, copiasLabel(1.5))
        assertEquals(0, copiasLabel(0.0))
    }
}
