package com.example.rental_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.rental_service.entity.Rental;

public interface RentalRepository extends JpaRepository<Rental, Long> {
}