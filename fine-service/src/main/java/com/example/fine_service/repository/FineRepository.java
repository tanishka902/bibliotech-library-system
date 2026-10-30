package com.example.fine_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.fine_service.entity.Fine;

public interface FineRepository extends JpaRepository<Fine, Long> {
}